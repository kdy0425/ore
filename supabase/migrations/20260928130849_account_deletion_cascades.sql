alter table public.exam_attempts
  drop constraint exam_attempts_user_id_fkey,
  add constraint exam_attempts_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.study_progress
  drop constraint study_progress_user_id_fkey,
  add constraint study_progress_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.learning_daily_activity
  drop constraint learning_daily_activity_user_id_fkey,
  add constraint learning_daily_activity_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.notices
  drop constraint notices_author_user_id_fkey,
  add constraint notices_author_user_id_fkey
    foreign key (author_user_id) references auth.users(id) on delete cascade;

alter table public.admin_audit_logs
  drop constraint admin_audit_logs_actor_user_id_fkey,
  drop constraint admin_audit_logs_target_user_id_fkey,
  add constraint admin_audit_logs_actor_user_id_fkey
    foreign key (actor_user_id) references auth.users(id) on delete cascade,
  add constraint admin_audit_logs_target_user_id_fkey
    foreign key (target_user_id) references auth.users(id) on delete set null;

alter table public.recipe_bundles
  alter column uploaded_by drop not null,
  drop constraint recipe_bundles_uploaded_by_fkey,
  add constraint recipe_bundles_uploaded_by_fkey
    foreign key (uploaded_by) references auth.users(id) on delete set null;
