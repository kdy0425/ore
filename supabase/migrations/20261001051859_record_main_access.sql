create table private.main_access_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  accessed_at timestamptz not null default now()
);

create index main_access_logs_user_accessed_idx
  on private.main_access_logs (user_id, accessed_at desc);

create table private.main_access_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_accessed_at timestamptz not null
);

revoke all on private.main_access_logs from public, anon, authenticated;
revoke all on private.main_access_state from public, anon, authenticated;

create function public.record_main_access()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  recorded_at timestamptz := clock_timestamp();
begin
  select * into actor
  from public.profiles
  where id = (select auth.uid());

  if actor.id is null or actor.status <> 'active' then
    raise exception 'active account required';
  end if;

  insert into private.main_access_logs (user_id, accessed_at)
  values (actor.id, recorded_at);

  insert into private.main_access_state (user_id, last_accessed_at)
  values (actor.id, recorded_at)
  on conflict (user_id)
  do update set last_accessed_at = excluded.last_accessed_at;

  return recorded_at;
end;
$$;

create function public.list_employee_last_access()
returns table (user_id uuid, last_accessed_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
begin
  select * into actor
  from public.profiles
  where id = (select auth.uid());

  if actor.id is null
    or actor.status <> 'active'
    or not (actor.is_super_admin or actor.is_developer)
  then
    raise exception 'super administrator or developer access required';
  end if;

  return query
  select access_state.user_id, access_state.last_accessed_at
  from private.main_access_state access_state;
end;
$$;

revoke all on function public.record_main_access() from public, anon, authenticated;
revoke all on function public.list_employee_last_access() from public, anon, authenticated;
grant execute on function public.record_main_access() to authenticated;
grant execute on function public.list_employee_last_access() to authenticated;
