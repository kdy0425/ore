create type public.employee_level as enum (
  'branch_manager',
  'manager',
  'captain',
  'trainer',
  'part_timer'
);

create type public.account_status as enum (
  'pending',
  'active',
  'rejected',
  'suspended'
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 2 and 100),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 50),
  email text not null,
  requested_branch_id uuid not null references public.branches(id),
  branch_id uuid references public.branches(id),
  employee_level public.employee_level,
  is_super_admin boolean not null default false,
  status public.account_status not null default 'pending',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_profile_has_assignment check (
    status <> 'active' or is_super_admin or (branch_id is not null and employee_level is not null)
  )
);

create unique index profiles_email_lower_idx on public.profiles (lower(email));
create index profiles_branch_status_idx on public.profiles (branch_id, status);
create index profiles_requested_branch_status_idx on public.profiles (requested_branch_id, status);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id),
  target_user_id uuid references auth.users(id),
  branch_id uuid references public.branches(id),
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_branch_idx on public.admin_audit_logs (branch_id, created_at desc);

insert into public.branches (name, sort_order)
values
  ('오레노라멘 합정 본점', 10),
  ('오레노라멘 인사점', 20),
  ('오레노라멘 은평점', 30),
  ('오레노라멘 강남점', 40),
  ('오레노라멘 송파점', 50),
  ('오레노라멘 잠실롯데월드몰점', 60)
on conflict (name) do update
set sort_order = excluded.sort_order,
    updated_at = now();

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.status = 'active'
    from public.profiles p
    where p.id = (select auth.uid())
  ), false);
$$;

create function private.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.status = 'active' and p.is_super_admin
    from public.profiles p
    where p.id = (select auth.uid())
  ), false);
$$;

create function private.current_user_branch_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.branch_id
  from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active';
$$;

create function private.current_user_employee_level()
returns public.employee_level
language sql
stable
security definer
set search_path = ''
as $$
  select p.employee_level
  from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active';
$$;

create function private.current_user_can_manage_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.status = 'active'
      and (
        p.is_super_admin
        or (p.branch_id = target_branch_id and p.employee_level = 'branch_manager')
      )
    from public.profiles p
    where p.id = (select auth.uid())
  ), false);
$$;

create function private.current_user_can_review_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.status = 'active'
      and (
        p.is_super_admin
        or (
          p.branch_id = target_branch_id
          and p.employee_level in ('branch_manager', 'manager')
        )
      )
    from public.profiles p
    where p.id = (select auth.uid())
  ), false);
$$;

create function private.current_user_can_view_branch_stats(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_user_can_review_branch(target_branch_id);
$$;

revoke all on function private.current_user_is_active() from public;
revoke all on function private.current_user_is_super_admin() from public;
revoke all on function private.current_user_branch_id() from public;
revoke all on function private.current_user_employee_level() from public;
revoke all on function private.current_user_can_manage_branch(uuid) from public;
revoke all on function private.current_user_can_review_branch(uuid) from public;
revoke all on function private.current_user_can_view_branch_stats(uuid) from public;
grant execute on function private.current_user_is_active() to authenticated;
grant execute on function private.current_user_is_super_admin() to authenticated;
grant execute on function private.current_user_branch_id() to authenticated;
grant execute on function private.current_user_employee_level() to authenticated;
grant execute on function private.current_user_can_manage_branch(uuid) to authenticated;
grant execute on function private.current_user_can_review_branch(uuid) to authenticated;
grant execute on function private.current_user_can_view_branch_stats(uuid) to authenticated;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger branches_touch_updated_at
before update on public.branches
for each row execute function private.touch_updated_at();

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_branch uuid;
  display_name text;
begin
  display_name := nullif(btrim(new.raw_user_meta_data ->> 'name'), '');
  requested_branch := nullif(new.raw_user_meta_data ->> 'requested_branch_id', '')::uuid;

  if display_name is null then
    raise exception 'name is required';
  end if;

  if not exists (
    select 1 from public.branches b
    where b.id = requested_branch and b.is_active
  ) then
    raise exception 'active branch is required';
  end if;

  insert into public.profiles (
    id,
    name,
    email,
    requested_branch_id,
    branch_id,
    employee_level,
    is_super_admin,
    status
  ) values (
    new.id,
    display_name,
    lower(new.email),
    requested_branch,
    null,
    null,
    false,
    'pending'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy branches_read_active
on public.branches for select
to anon, authenticated
using (is_active);

create policy branches_read_inactive_super_admin
on public.branches for select
to authenticated
using ((select private.current_user_is_super_admin()));

create policy profiles_read_authorized
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.current_user_is_super_admin())
  or (
    (select private.current_user_is_active())
    and (select private.current_user_employee_level()) in ('branch_manager', 'manager')
    and (
      branch_id = (select private.current_user_branch_id())
      or (
        status = 'pending'
        and requested_branch_id = (select private.current_user_branch_id())
      )
    )
  )
);

create policy audit_logs_read_authorized
on public.admin_audit_logs for select
to authenticated
using (
  (select private.current_user_is_super_admin())
  or (
    (select private.current_user_is_active())
    and (select private.current_user_employee_level()) = 'branch_manager'
    and branch_id = (select private.current_user_branch_id())
  )
);

grant select on public.branches to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.admin_audit_logs to authenticated;
revoke insert, update, delete on public.branches from anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.admin_audit_logs from anon, authenticated;

create function public.approve_user(
  target_user_id uuid,
  selected_level public.employee_level default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  target public.profiles;
  assigned_level public.employee_level;
  updated_profile public.profiles;
begin
  select * into actor from public.profiles where id = (select auth.uid()) for update;
  select * into target from public.profiles where id = target_user_id for update;

  if actor.id is null or actor.status <> 'active' then
    raise exception 'access denied';
  end if;
  if target.id is null or target.status <> 'pending' or target.is_super_admin then
    raise exception 'invalid approval target';
  end if;

  if actor.is_super_admin then
    if selected_level is null then raise exception 'employee level is required'; end if;
    assigned_level := selected_level;
  elsif actor.employee_level = 'branch_manager'
    and actor.branch_id = target.requested_branch_id then
    if selected_level not in ('manager', 'captain', 'trainer', 'part_timer') then
      raise exception 'invalid employee level';
    end if;
    assigned_level := selected_level;
  elsif actor.employee_level = 'manager'
    and actor.branch_id = target.requested_branch_id then
    assigned_level := 'part_timer';
  else
    raise exception 'access denied';
  end if;

  update public.profiles
  set status = 'active',
      branch_id = requested_branch_id,
      employee_level = assigned_level,
      approved_by = actor.id,
      approved_at = now()
  where id = target.id
  returning * into updated_profile;

  insert into public.admin_audit_logs (
    actor_user_id, target_user_id, branch_id, action, before_data, after_data
  ) values (
    actor.id, target.id, updated_profile.branch_id, 'approve_user',
    to_jsonb(target), to_jsonb(updated_profile)
  );

  return updated_profile;
end;
$$;

create function public.reject_user(target_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  target public.profiles;
  updated_profile public.profiles;
begin
  select * into actor from public.profiles where id = (select auth.uid()) for update;
  select * into target from public.profiles where id = target_user_id for update;

  if actor.id is null or actor.status <> 'active' then raise exception 'access denied'; end if;
  if target.id is null or target.status <> 'pending' or target.is_super_admin then
    raise exception 'invalid rejection target';
  end if;
  if not actor.is_super_admin and not (
    actor.employee_level in ('branch_manager', 'manager')
    and actor.branch_id = target.requested_branch_id
  ) then
    raise exception 'access denied';
  end if;

  update public.profiles
  set status = 'rejected', approved_by = actor.id, approved_at = now()
  where id = target.id
  returning * into updated_profile;

  insert into public.admin_audit_logs (
    actor_user_id, target_user_id, branch_id, action, before_data, after_data
  ) values (
    actor.id, target.id, target.requested_branch_id, 'reject_user',
    to_jsonb(target), to_jsonb(updated_profile)
  );

  return updated_profile;
end;
$$;

create function public.change_employee_level(
  target_user_id uuid,
  new_level public.employee_level
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  target public.profiles;
  updated_profile public.profiles;
begin
  select * into actor from public.profiles where id = (select auth.uid()) for update;
  select * into target from public.profiles where id = target_user_id for update;

  if actor.id is null or actor.status <> 'active' then raise exception 'access denied'; end if;
  if target.id is null or target.status <> 'active' or target.is_super_admin then
    raise exception 'invalid target';
  end if;
  if actor.id = target.id then raise exception 'cannot change own level'; end if;

  if actor.is_super_admin then
    null;
  elsif actor.employee_level = 'branch_manager'
    and actor.branch_id = target.branch_id
    and target.employee_level <> 'branch_manager'
    and new_level in ('manager', 'captain', 'trainer', 'part_timer') then
    null;
  else
    raise exception 'access denied';
  end if;

  update public.profiles set employee_level = new_level
  where id = target.id
  returning * into updated_profile;

  insert into public.admin_audit_logs (
    actor_user_id, target_user_id, branch_id, action, before_data, after_data
  ) values (
    actor.id, target.id, target.branch_id, 'change_employee_level',
    to_jsonb(target), to_jsonb(updated_profile)
  );

  return updated_profile;
end;
$$;

create function public.change_employee_branch(
  target_user_id uuid,
  new_branch_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  target public.profiles;
  updated_profile public.profiles;
begin
  select * into actor from public.profiles where id = (select auth.uid()) for update;
  select * into target from public.profiles where id = target_user_id for update;

  if actor.id is null or actor.status <> 'active' or not actor.is_super_admin then
    raise exception 'access denied';
  end if;
  if target.id is null or target.status <> 'active' or target.is_super_admin then
    raise exception 'invalid target';
  end if;
  if not exists (select 1 from public.branches where id = new_branch_id and is_active) then
    raise exception 'active branch not found';
  end if;

  update public.profiles
  set branch_id = new_branch_id, requested_branch_id = new_branch_id
  where id = target.id
  returning * into updated_profile;

  insert into public.admin_audit_logs (
    actor_user_id, target_user_id, branch_id, action, before_data, after_data
  ) values (
    actor.id, target.id, new_branch_id, 'change_employee_branch',
    to_jsonb(target), to_jsonb(updated_profile)
  );

  return updated_profile;
end;
$$;

create function public.change_employee_status(
  target_user_id uuid,
  new_status public.account_status
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  target public.profiles;
  updated_profile public.profiles;
begin
  select * into actor from public.profiles where id = (select auth.uid()) for update;
  select * into target from public.profiles where id = target_user_id for update;

  if actor.id is null or actor.status <> 'active' then raise exception 'access denied'; end if;
  if new_status not in ('active', 'suspended') then raise exception 'invalid status'; end if;
  if target.id is null or target.is_super_admin or actor.id = target.id then
    raise exception 'invalid target';
  end if;

  if actor.is_super_admin then
    null;
  elsif actor.employee_level = 'branch_manager'
    and actor.branch_id = target.branch_id
    and target.employee_level <> 'branch_manager' then
    null;
  else
    raise exception 'access denied';
  end if;

  update public.profiles set status = new_status
  where id = target.id
  returning * into updated_profile;

  insert into public.admin_audit_logs (
    actor_user_id, target_user_id, branch_id, action, before_data, after_data
  ) values (
    actor.id, target.id, target.branch_id,
    case when new_status = 'suspended' then 'suspend_user' else 'reactivate_user' end,
    to_jsonb(target), to_jsonb(updated_profile)
  );

  return updated_profile;
end;
$$;

create function public.create_branch(branch_name text, branch_sort_order integer default 0)
returns public.branches
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  created_branch public.branches;
begin
  select * into actor from public.profiles where id = (select auth.uid());
  if actor.id is null or actor.status <> 'active' or not actor.is_super_admin then
    raise exception 'access denied';
  end if;

  insert into public.branches (name, sort_order, created_by)
  values (btrim(branch_name), branch_sort_order, actor.id)
  returning * into created_branch;

  insert into public.admin_audit_logs (
    actor_user_id, branch_id, action, after_data
  ) values (
    actor.id, created_branch.id, 'create_branch', to_jsonb(created_branch)
  );

  return created_branch;
end;
$$;

create function public.update_branch(
  target_branch_id uuid,
  branch_name text,
  branch_sort_order integer
)
returns public.branches
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  previous_branch public.branches;
  updated_branch public.branches;
begin
  select * into actor from public.profiles where id = (select auth.uid());
  select * into previous_branch from public.branches where id = target_branch_id for update;
  if actor.id is null or actor.status <> 'active' or not actor.is_super_admin then
    raise exception 'access denied';
  end if;
  if previous_branch.id is null then raise exception 'branch not found'; end if;

  update public.branches
  set name = btrim(branch_name), sort_order = branch_sort_order
  where id = target_branch_id
  returning * into updated_branch;

  insert into public.admin_audit_logs (
    actor_user_id, branch_id, action, before_data, after_data
  ) values (
    actor.id, target_branch_id, 'update_branch',
    to_jsonb(previous_branch), to_jsonb(updated_branch)
  );

  return updated_branch;
end;
$$;

create function public.deactivate_branch(target_branch_id uuid)
returns public.branches
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  previous_branch public.branches;
  updated_branch public.branches;
begin
  select * into actor from public.profiles where id = (select auth.uid());
  select * into previous_branch from public.branches where id = target_branch_id for update;
  if actor.id is null or actor.status <> 'active' or not actor.is_super_admin then
    raise exception 'access denied';
  end if;
  if previous_branch.id is null then raise exception 'branch not found'; end if;
  if exists (
    select 1 from public.profiles
    where branch_id = target_branch_id and status = 'active'
  ) then
    raise exception 'active employees remain in this branch';
  end if;

  update public.branches set is_active = false
  where id = target_branch_id
  returning * into updated_branch;

  insert into public.admin_audit_logs (
    actor_user_id, branch_id, action, before_data, after_data
  ) values (
    actor.id, target_branch_id, 'deactivate_branch',
    to_jsonb(previous_branch), to_jsonb(updated_branch)
  );

  return updated_branch;
end;
$$;

revoke all on function public.approve_user(uuid, public.employee_level) from public, anon;
revoke all on function public.reject_user(uuid) from public, anon;
revoke all on function public.change_employee_level(uuid, public.employee_level) from public, anon;
revoke all on function public.change_employee_branch(uuid, uuid) from public, anon;
revoke all on function public.change_employee_status(uuid, public.account_status) from public, anon;
revoke all on function public.create_branch(text, integer) from public, anon;
revoke all on function public.update_branch(uuid, text, integer) from public, anon;
revoke all on function public.deactivate_branch(uuid) from public, anon;
grant execute on function public.approve_user(uuid, public.employee_level) to authenticated;
grant execute on function public.reject_user(uuid) to authenticated;
grant execute on function public.change_employee_level(uuid, public.employee_level) to authenticated;
grant execute on function public.change_employee_branch(uuid, uuid) to authenticated;
grant execute on function public.change_employee_status(uuid, public.account_status) to authenticated;
grant execute on function public.create_branch(text, integer) to authenticated;
grant execute on function public.update_branch(uuid, text, integer) to authenticated;
grant execute on function public.deactivate_branch(uuid) to authenticated;
