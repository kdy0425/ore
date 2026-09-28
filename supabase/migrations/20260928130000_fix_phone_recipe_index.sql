alter table public.profiles
  drop constraint profiles_phone_number_format;

alter table public.profiles
  add constraint profiles_phone_number_format check (
    phone_number is null
    or phone_number ~ '^\+?[0-9 -]{8,20}$'
  );

create index recipe_bundles_uploaded_by_idx
  on public.recipe_bundles (uploaded_by);

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
  if supplied_phone is null or supplied_phone !~ '^\+?[0-9 -]{8,20}$' then
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
