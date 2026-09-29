create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_tokens_expo_format check (
    expo_push_token ~ '^(Exponent|Expo)PushToken\[[^]]+\]$'
  )
);

create index push_tokens_user_enabled_idx
  on public.push_tokens (user_id, enabled);

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from public, anon, authenticated;

create function public.register_push_token(push_token text, device_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;
  if push_token is null or push_token !~ '^(Exponent|Expo)PushToken\[[^]]+\]$' then
    raise exception 'invalid Expo push token';
  end if;
  if device_platform not in ('android', 'ios') then
    raise exception 'invalid device platform';
  end if;

  insert into public.push_tokens (user_id, expo_push_token, platform, enabled)
  values ((select auth.uid()), push_token, device_platform, true)
  on conflict (expo_push_token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        enabled = true,
        updated_at = now();
end;
$$;

create function public.unregister_push_token(push_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.push_tokens
  set enabled = false,
      updated_at = now()
  where user_id = (select auth.uid())
    and expo_push_token = push_token;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

create function private.employee_level_label(level public.employee_level)
returns text
language sql
immutable
set search_path = ''
as $$
  select case level
    when 'branch_manager' then '지점장'
    when 'manager' then '매니저'
    when 'captain' then '캡틴'
    when 'trainer' then '트레이너'
    when 'part_timer' then '파트타이머'
    else '미지정'
  end;
$$;

create function private.queue_push_notifications(
  target_user_ids uuid[],
  notification_title text,
  notification_body text,
  notification_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch record;
begin
  if coalesce(array_length(target_user_ids, 1), 0) = 0 then
    return;
  end if;

  for batch in
    with token_messages as (
      select
        ((row_number() over (order by t.id) - 1) / 100)::integer as batch_number,
        jsonb_build_object(
          'to', t.expo_push_token,
          'title', left(notification_title, 100),
          'body', left(notification_body, 240),
          'sound', 'default',
          'channelId', 'general',
          'priority', 'default',
          'data', coalesce(notification_data, '{}'::jsonb)
        ) as message
      from public.push_tokens t
      where t.enabled
        and t.user_id = any(target_user_ids)
    )
    select batch_number, jsonb_agg(message) as messages
    from token_messages
    group by batch_number
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object(
        'Accept', 'application/json',
        'Content-Type', 'application/json'
      ),
      body := batch.messages,
      timeout_milliseconds := 5000
    );
  end loop;
end;
$$;

revoke all on function private.employee_level_label(public.employee_level) from public, anon, authenticated;
revoke all on function private.queue_push_notifications(uuid[], text, text, jsonb) from public, anon, authenticated;

create function private.notify_new_notice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipients uuid[];
begin
  select array_agg(p.id)
  into recipients
  from public.profiles p
  where p.status = 'active'
    and p.id <> new.author_user_id
    and (new.scope = 'global' or p.branch_id = new.branch_id);

  perform private.queue_push_notifications(
    recipients,
    '새 공지가 등록되었습니다',
    new.title,
    jsonb_build_object(
      'type', 'notice',
      'noticeId', new.id,
      'url', '/notices/' || new.id::text
    )
  );
  return new;
end;
$$;

create trigger notices_send_push
after insert on public.notices
for each row execute function private.notify_new_notice();

create function private.notify_new_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipients uuid[];
begin
  if new.status <> 'pending' or new.requested_branch_id is null then
    return new;
  end if;

  select array_agg(p.id)
  into recipients
  from public.profiles p
  where p.status = 'active'
    and p.branch_id = new.requested_branch_id
    and p.employee_level = 'branch_manager';

  perform private.queue_push_notifications(
    recipients,
    '새 가입 신청이 도착했습니다',
    '소속 지점의 새 직원 가입 신청을 확인해주세요.',
    jsonb_build_object('type', 'application', 'url', '/admin/applications')
  );
  return new;
end;
$$;

create trigger profiles_new_application_push
after insert on public.profiles
for each row execute function private.notify_new_application();

create function private.notify_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  level_name text;
begin
  if old.status = 'pending'
     and new.status is distinct from old.status
     and new.status in ('active', 'rejected') then
    perform private.queue_push_notifications(
      array[new.id],
      '가입 심사가 완료되었습니다',
      case new.status
        when 'active' then '가입이 승인되었습니다. 앱을 열어 확인해주세요.'
        else '가입 신청이 승인되지 않았습니다. 관리자에게 문의해주세요.'
      end,
      jsonb_build_object(
        'type', 'application_result',
        'status', new.status,
        'url', case when new.status = 'active' then '/profile' else '/account-status' end
      )
    );
  end if;

  if old.status = 'active'
     and new.status = 'active'
     and (
       new.employee_level is distinct from old.employee_level
       or new.is_super_admin is distinct from old.is_super_admin
     ) then
    level_name := case
      when new.is_super_admin then '최고관리자'
      else private.employee_level_label(new.employee_level)
    end;
    perform private.queue_push_notifications(
      array[new.id],
      '직원 등급이 변경되었습니다',
      '새 등급: ' || level_name,
      jsonb_build_object('type', 'employee_level', 'url', '/profile')
    );
  end if;
  return new;
end;
$$;

create trigger profiles_change_push
after update of status, employee_level, is_super_admin on public.profiles
for each row execute function private.notify_profile_change();

revoke all on function private.notify_new_notice() from public, anon, authenticated;
revoke all on function private.notify_new_application() from public, anon, authenticated;
revoke all on function private.notify_profile_change() from public, anon, authenticated;
