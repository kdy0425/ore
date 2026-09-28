create function public.activate_branch(target_branch_id uuid)
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

  update public.branches set is_active = true
  where id = target_branch_id
  returning * into updated_branch;

  insert into public.admin_audit_logs (
    actor_user_id, branch_id, action, before_data, after_data
  ) values (
    actor.id, target_branch_id, 'activate_branch',
    to_jsonb(previous_branch), to_jsonb(updated_branch)
  );

  return updated_branch;
end;
$$;

revoke all on function public.activate_branch(uuid) from public, anon;
grant execute on function public.activate_branch(uuid) to authenticated;
