alter table public.profiles
  add column phone_number text,
  add column is_developer boolean not null default false;

alter table public.profiles
  add constraint profiles_phone_number_format check (
    phone_number is null
    or phone_number ~ '^\\+?[0-9 -]{8,20}$'
  );

create unique index profiles_single_developer_idx
  on public.profiles (is_developer)
  where is_developer;

create table public.recipe_bundles (
  version bigint generated always as identity primary key,
  payload jsonb not null,
  question_count integer not null check (question_count > 0),
  uploaded_by uuid not null references auth.users(id),
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  constraint recipe_bundle_payload_is_object check (jsonb_typeof(payload) = 'object')
);

create unique index recipe_bundles_one_current_idx
  on public.recipe_bundles (is_current)
  where is_current;
create index recipe_bundles_created_at_idx
  on public.recipe_bundles (created_at desc);

alter table public.recipe_bundles enable row level security;

create or replace function private.current_user_is_developer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.status = 'active' and p.is_developer
    from public.profiles p
    where p.id = (select auth.uid())
  ), false);
$$;

create or replace function private.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.status = 'active' and (p.is_super_admin or p.is_developer)
    from public.profiles p
    where p.id = (select auth.uid())
  ), false);
$$;

revoke all on function private.current_user_is_developer() from public, anon;
grant execute on function private.current_user_is_developer() to authenticated;

create policy recipe_bundles_read_current
on public.recipe_bundles
for select
to authenticated
using (
  is_current
  and (select private.current_user_is_active())
);

grant select on public.recipe_bundles to authenticated;
revoke insert, update, delete on public.recipe_bundles from anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_branch uuid;
  display_name text;
  supplied_phone text;
begin
  display_name := nullif(btrim(new.raw_user_meta_data ->> 'name'), '');
  requested_branch := nullif(new.raw_user_meta_data ->> 'requested_branch_id', '')::uuid;
  supplied_phone := nullif(btrim(new.raw_user_meta_data ->> 'phone_number'), '');

  if display_name is null then
    raise exception 'name is required';
  end if;
  if supplied_phone is null or supplied_phone !~ '^\\+?[0-9 -]{8,20}$' then
    raise exception 'valid phone number is required';
  end if;
  if not exists (
    select 1 from public.branches b
    where b.id = requested_branch and b.is_active
  ) then
    raise exception 'active branch is required';
  end if;

  insert into public.profiles (
    id, name, email, phone_number, requested_branch_id, branch_id,
    employee_level, is_super_admin, is_developer, status
  ) values (
    new.id, display_name, lower(new.email), supplied_phone, requested_branch,
    null, null, false, false, 'pending'
  );

  return new;
end;
$$;

create function public.replace_recipe_bundle(bundle jsonb)
returns public.recipe_bundles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  created_bundle public.recipe_bundles;
  categories jsonb;
  questions jsonb;
  question_total integer;
begin
  select * into actor
  from public.profiles
  where id = (select auth.uid())
  for update;

  if actor.id is null or actor.status <> 'active' or not actor.is_developer then
    raise exception 'developer access required';
  end if;
  if jsonb_typeof(bundle) <> 'object' then
    raise exception 'recipe bundle must be a JSON object';
  end if;
  if octet_length(bundle::text) > 5242880 then
    raise exception 'recipe bundle exceeds 5 MB';
  end if;

  categories := bundle -> 'categories';
  questions := bundle -> 'questions';
  if jsonb_typeof(categories) <> 'array' or jsonb_array_length(categories) = 0 then
    raise exception 'categories must be a non-empty array';
  end if;
  if jsonb_typeof(questions) <> 'array' or jsonb_array_length(questions) = 0 then
    raise exception 'questions must be a non-empty array';
  end if;

  question_total := jsonb_array_length(questions);

  if exists (
    select 1
    from jsonb_array_elements(questions) q
    where jsonb_typeof(q) <> 'object'
      or coalesce(btrim(q ->> 'id'), '') = ''
      or coalesce(btrim(q ->> 'categoryId'), '') = ''
      or coalesce(btrim(q ->> 'question'), '') = ''
      or jsonb_typeof(q -> 'options') <> 'array'
      or jsonb_array_length(q -> 'options') < 2
      or (q ->> 'correctAnswer') is null
      or (q ->> 'correctAnswer') !~ '^[0-9]+$'
      or (q ->> 'correctAnswer')::integer >= jsonb_array_length(q -> 'options')
  ) then
    raise exception 'one or more questions have an invalid structure';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(questions) q
    group by q ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'duplicate question id';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(questions) q
    where not exists (
      select 1
      from jsonb_array_elements(categories) c
      where c ->> 'id' = q ->> 'categoryId'
    )
  ) then
    raise exception 'question references an unknown category';
  end if;

  update public.recipe_bundles set is_current = false where is_current;

  insert into public.recipe_bundles (payload, question_count, uploaded_by)
  values (bundle, question_total, actor.id)
  returning * into created_bundle;

  insert into public.admin_audit_logs (
    actor_user_id, action, after_data
  ) values (
    actor.id,
    'replace_recipe_bundle',
    jsonb_build_object(
      'version', created_bundle.version,
      'question_count', created_bundle.question_count,
      'created_at', created_bundle.created_at
    )
  );

  return created_bundle;
end;
$$;

create function public.change_super_admin_status(
  target_user_id uuid,
  enabled boolean,
  fallback_level public.employee_level default 'part_timer'
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

  if actor.id is null or actor.status <> 'active' or not actor.is_developer then
    raise exception 'developer access required';
  end if;
  if target.id is null or target.status <> 'active' or target.is_developer or target.id = actor.id then
    raise exception 'invalid target';
  end if;
  if not enabled and (fallback_level is null or fallback_level = 'branch_manager') then
    raise exception 'a non-manager fallback level is required';
  end if;

  update public.profiles
  set is_super_admin = enabled,
      employee_level = case when enabled then null else fallback_level end
  where id = target.id
  returning * into updated_profile;

  insert into public.admin_audit_logs (
    actor_user_id, target_user_id, branch_id, action, before_data, after_data
  ) values (
    actor.id, target.id, target.branch_id,
    case when enabled then 'grant_super_admin' else 'revoke_super_admin' end,
    to_jsonb(target), to_jsonb(updated_profile)
  );

  return updated_profile;
end;
$$;

revoke all on function public.replace_recipe_bundle(jsonb) from public, anon;
revoke all on function public.change_super_admin_status(uuid, boolean, public.employee_level) from public, anon;
grant execute on function public.replace_recipe_bundle(jsonb) to authenticated;
grant execute on function public.change_super_admin_status(uuid, boolean, public.employee_level) to authenticated;
