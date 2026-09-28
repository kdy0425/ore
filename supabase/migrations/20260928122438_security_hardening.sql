drop policy if exists branches_read_active on public.branches;
drop policy if exists branches_read_inactive_super_admin on public.branches;

create policy branches_read_active_anon
on public.branches for select
to anon
using (is_active);

create policy branches_read_authenticated
on public.branches for select
to authenticated
using (is_active or (select private.current_user_is_super_admin()));

drop policy if exists notice_image_objects_read on storage.objects;
drop policy if exists notice_image_objects_insert on storage.objects;

create policy notice_image_objects_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'notice-images'
  and (select private.current_user_is_active())
  and exists (
    select 1
    from public.notice_images image
    join public.notices notice on notice.id = image.notice_id
    where image.storage_path = storage.objects.name
      and (select private.can_read_notice(notice.scope, notice.branch_id))
  )
);

create policy notice_image_objects_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'notice-images'
  and (select private.current_user_is_active())
  and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
  and (
    (
      (select private.current_user_is_super_admin())
      and (
        (storage.foldername(storage.objects.name))[1] = 'global'
        or exists (
          select 1 from public.branches branch
          where branch.id::text = (storage.foldername(storage.objects.name))[1]
        )
      )
    )
    or (
      (select private.current_user_employee_level()) = 'branch_manager'
      and (storage.foldername(storage.objects.name))[1] = (select private.current_user_branch_id())::text
    )
  )
);

create index if not exists admin_audit_logs_actor_idx on public.admin_audit_logs (actor_user_id);
create index if not exists admin_audit_logs_target_idx on public.admin_audit_logs (target_user_id);
create index if not exists branches_created_by_idx on public.branches (created_by);
create index if not exists notice_reads_user_idx on public.notice_reads (user_id);
create index if not exists notices_author_idx on public.notices (author_user_id);
create index if not exists profiles_approved_by_idx on public.profiles (approved_by);
