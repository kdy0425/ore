drop policy if exists profiles_read_authorized on public.profiles;

create policy profiles_read_authorized
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.current_user_is_super_admin())
  or (
    not is_super_admin
    and (select private.current_user_is_active())
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
