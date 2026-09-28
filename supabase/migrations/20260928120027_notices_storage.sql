create type public.notice_scope as enum ('global', 'branch');

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  scope public.notice_scope not null,
  branch_id uuid references public.branches(id),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  author_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notice_scope_branch_check check (
    (scope = 'global' and branch_id is null)
    or (scope = 'branch' and branch_id is not null)
  )
);

create index notices_created_at_idx on public.notices (created_at desc);
create index notices_branch_created_idx on public.notices (branch_id, created_at desc);

create table public.notice_images (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices(id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0 check (sort_order between 0 and 4),
  created_at timestamptz not null default now()
);

create index notice_images_notice_idx on public.notice_images (notice_id, sort_order);

create table public.notice_reads (
  notice_id uuid not null references public.notices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);

create trigger notices_touch_updated_at
before update on public.notices
for each row execute function private.touch_updated_at();

create function private.can_read_notice(notice_scope public.notice_scope, notice_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_user_is_active())
    and (
      notice_scope = 'global'
      or (select private.current_user_is_super_admin())
      or notice_branch_id = (select private.current_user_branch_id())
    );
$$;

create function private.can_manage_notice(notice_scope public.notice_scope, notice_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_user_is_active())
    and (
      (select private.current_user_is_super_admin())
      or (
        notice_scope = 'branch'
        and notice_branch_id = (select private.current_user_branch_id())
        and (select private.current_user_employee_level()) = 'branch_manager'
      )
    );
$$;

revoke all on function private.can_read_notice(public.notice_scope, uuid) from public;
revoke all on function private.can_manage_notice(public.notice_scope, uuid) from public;
grant execute on function private.can_read_notice(public.notice_scope, uuid) to authenticated;
grant execute on function private.can_manage_notice(public.notice_scope, uuid) to authenticated;

alter table public.notices enable row level security;
alter table public.notice_images enable row level security;
alter table public.notice_reads enable row level security;

create policy notices_read_authorized
on public.notices for select
to authenticated
using ((select private.can_read_notice(scope, branch_id)));

create policy notice_images_read_authorized
on public.notice_images for select
to authenticated
using (
  exists (
    select 1 from public.notices notice
    where notice.id = notice_images.notice_id
      and (select private.can_read_notice(notice.scope, notice.branch_id))
  )
);

create policy notice_reads_read_own
on public.notice_reads for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.notices notice
    where notice.id = notice_reads.notice_id
      and (select private.can_read_notice(notice.scope, notice.branch_id))
  )
);

grant select on public.notices to authenticated;
grant select on public.notice_images to authenticated;
grant select on public.notice_reads to authenticated;
revoke insert, update, delete on public.notices from anon, authenticated;
revoke insert, update, delete on public.notice_images from anon, authenticated;
revoke insert, update, delete on public.notice_reads from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notice-images',
  'notice-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy notice_image_objects_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'notice-images'
  and (select private.current_user_is_active())
  and (
    (storage.foldername(name))[1] = 'global'
    or (select private.current_user_is_super_admin())
    or (storage.foldername(name))[1] = (select private.current_user_branch_id())::text
  )
);

create policy notice_image_objects_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'notice-images'
  and (select private.current_user_is_active())
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (
    (
      (select private.current_user_is_super_admin())
      and (
        (storage.foldername(name))[1] = 'global'
        or exists (
          select 1 from public.branches branch
          where branch.id::text = (storage.foldername(name))[1]
        )
      )
    )
    or (
      (select private.current_user_employee_level()) = 'branch_manager'
      and (storage.foldername(name))[1] = (select private.current_user_branch_id())::text
    )
  )
);

create policy notice_image_objects_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'notice-images'
  and (select private.current_user_is_active())
  and (
    (select private.current_user_is_super_admin())
    or (
      (select private.current_user_employee_level()) = 'branch_manager'
      and (storage.foldername(name))[1] = (select private.current_user_branch_id())::text
    )
  )
);

create function public.create_notice(
  notice_scope public.notice_scope,
  notice_branch_id uuid,
  notice_title text,
  notice_body text,
  image_paths text[] default array[]::text[]
)
returns public.notices
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  created_notice public.notices;
  path text;
  expected_prefix text;
  position integer := 0;
begin
  select * into actor from public.profiles where id = (select auth.uid());
  if actor.id is null or actor.status <> 'active' then raise exception 'access denied'; end if;

  if notice_scope = 'global' then
    if not actor.is_super_admin or notice_branch_id is not null then raise exception 'access denied'; end if;
    expected_prefix := 'global/' || actor.id::text || '/';
  elsif notice_scope = 'branch' then
    if notice_branch_id is null or not (select private.can_manage_notice('branch', notice_branch_id)) then
      raise exception 'access denied';
    end if;
    expected_prefix := notice_branch_id::text || '/' || actor.id::text || '/';
  else
    raise exception 'invalid notice scope';
  end if;

  if coalesce(array_length(image_paths, 1), 0) > 5 then raise exception 'too many images'; end if;
  foreach path in array image_paths loop
    if path not like (expected_prefix || '%') then raise exception 'invalid image path'; end if;
    if not exists (
      select 1 from storage.objects object
      where object.bucket_id = 'notice-images' and object.name = path
    ) then
      raise exception 'uploaded image not found';
    end if;
  end loop;

  insert into public.notices (scope, branch_id, title, body, author_user_id)
  values (notice_scope, notice_branch_id, btrim(notice_title), btrim(notice_body), actor.id)
  returning * into created_notice;

  foreach path in array image_paths loop
    insert into public.notice_images (notice_id, storage_path, sort_order)
    values (created_notice.id, path, position);
    position := position + 1;
  end loop;

  return created_notice;
end;
$$;

create function public.update_notice(
  target_notice_id uuid,
  notice_title text,
  notice_body text,
  image_paths text[] default array[]::text[]
)
returns public.notices
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  existing_notice public.notices;
  updated_notice public.notices;
  path text;
  allowed_global_prefix text;
  allowed_branch_prefix text;
  position integer := 0;
begin
  select * into actor from public.profiles where id = (select auth.uid());
  select * into existing_notice from public.notices where id = target_notice_id for update;
  if actor.id is null or actor.status <> 'active' or existing_notice.id is null then
    raise exception 'access denied';
  end if;
  if not (select private.can_manage_notice(existing_notice.scope, existing_notice.branch_id)) then
    raise exception 'access denied';
  end if;
  if coalesce(array_length(image_paths, 1), 0) > 5 then raise exception 'too many images'; end if;

  allowed_global_prefix := 'global/';
  allowed_branch_prefix := coalesce(existing_notice.branch_id::text || '/', '');
  foreach path in array image_paths loop
    if existing_notice.scope = 'global' and path not like (allowed_global_prefix || '%') then
      raise exception 'invalid image path';
    end if;
    if existing_notice.scope = 'branch' and path not like (allowed_branch_prefix || '%') then
      raise exception 'invalid image path';
    end if;
    if not exists (
      select 1 from storage.objects object
      where object.bucket_id = 'notice-images' and object.name = path
    ) then
      raise exception 'uploaded image not found';
    end if;
  end loop;

  update public.notices
  set title = btrim(notice_title), body = btrim(notice_body)
  where id = target_notice_id
  returning * into updated_notice;

  delete from public.notice_images where notice_id = target_notice_id;
  foreach path in array image_paths loop
    insert into public.notice_images (notice_id, storage_path, sort_order)
    values (target_notice_id, path, position);
    position := position + 1;
  end loop;

  return updated_notice;
end;
$$;

create function public.delete_notice(target_notice_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_notice public.notices;
  paths text[];
begin
  select * into existing_notice from public.notices where id = target_notice_id for update;
  if existing_notice.id is null
    or not (select private.can_manage_notice(existing_notice.scope, existing_notice.branch_id)) then
    raise exception 'access denied';
  end if;

  select coalesce(array_agg(storage_path order by sort_order), array[]::text[])
  into paths
  from public.notice_images
  where notice_id = target_notice_id;

  delete from public.notices where id = target_notice_id;
  return paths;
end;
$$;

create function public.mark_notice_read(target_notice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_notice public.notices;
begin
  select * into target_notice from public.notices where id = target_notice_id;
  if target_notice.id is null
    or not (select private.can_read_notice(target_notice.scope, target_notice.branch_id)) then
    raise exception 'access denied';
  end if;

  insert into public.notice_reads (notice_id, user_id, read_at)
  values (target_notice_id, (select auth.uid()), now())
  on conflict (notice_id, user_id) do update set read_at = excluded.read_at;
end;
$$;

revoke all on function public.create_notice(public.notice_scope, uuid, text, text, text[]) from public, anon;
revoke all on function public.update_notice(uuid, text, text, text[]) from public, anon;
revoke all on function public.delete_notice(uuid) from public, anon;
revoke all on function public.mark_notice_read(uuid) from public, anon;
grant execute on function public.create_notice(public.notice_scope, uuid, text, text, text[]) to authenticated;
grant execute on function public.update_notice(uuid, text, text, text[]) to authenticated;
grant execute on function public.delete_notice(uuid) to authenticated;
grant execute on function public.mark_notice_read(uuid) to authenticated;
