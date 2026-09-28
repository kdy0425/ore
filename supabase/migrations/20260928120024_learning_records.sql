create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  client_result_id text not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  mode text not null check (mode in ('all', 'category', 'wrong')),
  score integer not null check (score between 0 and 100),
  total_questions integer not null check (total_questions > 0),
  correct_count integer not null check (correct_count >= 0),
  wrong_count integer not null check (wrong_count >= 0),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  branch_id_snapshot uuid references public.branches(id),
  employee_level_snapshot public.employee_level,
  created_at timestamptz not null default now(),
  constraint exam_counts_match check (correct_count + wrong_count = total_questions),
  constraint exam_time_order check (completed_at >= started_at),
  unique (user_id, client_result_id)
);

create index exam_attempts_user_completed_idx
on public.exam_attempts (user_id, completed_at desc);
create index exam_attempts_branch_completed_idx
on public.exam_attempts (branch_id_snapshot, completed_at desc);

create table public.exam_answers (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_id text not null,
  category_key text not null,
  selected_answer integer not null check (selected_answer >= 0),
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index exam_answers_attempt_idx on public.exam_answers (attempt_id);
create index exam_answers_category_idx on public.exam_answers (category_key, is_correct);

create table public.study_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  branch_id_snapshot uuid references public.branches(id),
  employee_level_snapshot public.employee_level,
  question_id text not null,
  category_key text not null,
  correct_count integer not null default 0 check (correct_count >= 0),
  wrong_count integer not null default 0 check (wrong_count >= 0),
  study_count integer not null default 0 check (study_count >= 0),
  last_studied_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, branch_id_snapshot, question_id)
);

create index study_progress_user_idx on public.study_progress (user_id, last_studied_at desc);
create index study_progress_branch_idx on public.study_progress (branch_id_snapshot, last_studied_at desc);

create table public.learning_daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  branch_id_snapshot uuid references public.branches(id),
  employee_level_snapshot public.employee_level,
  activity_date date not null,
  study_seconds integer not null default 0 check (study_seconds >= 0),
  study_sessions integer not null default 0 check (study_sessions >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, branch_id_snapshot, activity_date)
);

create index learning_daily_activity_user_idx
on public.learning_daily_activity (user_id, activity_date desc);
create index learning_daily_activity_branch_idx
on public.learning_daily_activity (branch_id_snapshot, activity_date desc);

create trigger study_progress_touch_updated_at
before update on public.study_progress
for each row execute function private.touch_updated_at();

create trigger learning_daily_activity_touch_updated_at
before update on public.learning_daily_activity
for each row execute function private.touch_updated_at();

create function private.can_view_learning_owner(owner_user_id uuid, snapshot_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_user_is_active())
    and (
      owner_user_id = (select auth.uid())
      or (select private.current_user_is_super_admin())
      or (select private.current_user_can_view_branch_stats(snapshot_branch_id))
    );
$$;

revoke all on function private.can_view_learning_owner(uuid, uuid) from public;
grant execute on function private.can_view_learning_owner(uuid, uuid) to authenticated;

alter table public.exam_attempts enable row level security;
alter table public.exam_answers enable row level security;
alter table public.study_progress enable row level security;
alter table public.learning_daily_activity enable row level security;

create policy exam_attempts_read_authorized
on public.exam_attempts for select
to authenticated
using ((select private.can_view_learning_owner(user_id, branch_id_snapshot)));

create policy exam_answers_read_authorized
on public.exam_answers for select
to authenticated
using (
  exists (
    select 1
    from public.exam_attempts attempt
    where attempt.id = exam_answers.attempt_id
      and (select private.can_view_learning_owner(attempt.user_id, attempt.branch_id_snapshot))
  )
);

create policy study_progress_read_authorized
on public.study_progress for select
to authenticated
using ((select private.can_view_learning_owner(user_id, branch_id_snapshot)));

create policy learning_daily_activity_read_authorized
on public.learning_daily_activity for select
to authenticated
using ((select private.can_view_learning_owner(user_id, branch_id_snapshot)));

grant select on public.exam_attempts to authenticated;
grant select on public.exam_answers to authenticated;
grant select on public.study_progress to authenticated;
grant select on public.learning_daily_activity to authenticated;
revoke insert, update, delete on public.exam_attempts from anon, authenticated;
revoke insert, update, delete on public.exam_answers from anon, authenticated;
revoke insert, update, delete on public.study_progress from anon, authenticated;
revoke insert, update, delete on public.learning_daily_activity from anon, authenticated;

create function public.record_exam_attempt(
  client_result_id text,
  exam_mode text,
  exam_score integer,
  total_questions integer,
  correct_count integer,
  wrong_count integer,
  started_at timestamptz,
  completed_at timestamptz,
  answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  attempt_id uuid;
  calculated_correct integer;
begin
  select * into actor from public.profiles where id = (select auth.uid());
  if actor.id is null or actor.status <> 'active' then raise exception 'access denied'; end if;
  if not actor.is_super_admin and (actor.branch_id is null or actor.employee_level is null) then
    raise exception 'employee assignment is required';
  end if;
  if exam_mode not in ('all', 'category', 'wrong') then raise exception 'invalid exam mode'; end if;
  if total_questions <= 0 or correct_count < 0 or wrong_count < 0
    or correct_count + wrong_count <> total_questions then
    raise exception 'invalid exam counts';
  end if;
  if exam_score < 0 or exam_score > 100 then raise exception 'invalid score'; end if;
  if completed_at < started_at then raise exception 'invalid exam time'; end if;
  if jsonb_typeof(answers) <> 'array' or jsonb_array_length(answers) <> total_questions then
    raise exception 'invalid answers';
  end if;

  select count(*) filter (where (answer ->> 'isCorrect')::boolean)
  into calculated_correct
  from jsonb_array_elements(answers) answer;
  if calculated_correct <> correct_count then raise exception 'answer counts do not match'; end if;

  select id into attempt_id
  from public.exam_attempts
  where user_id = actor.id and exam_attempts.client_result_id = record_exam_attempt.client_result_id;
  if attempt_id is not null then return attempt_id; end if;

  insert into public.exam_attempts (
    client_result_id,
    user_id,
    mode,
    score,
    total_questions,
    correct_count,
    wrong_count,
    started_at,
    completed_at,
    branch_id_snapshot,
    employee_level_snapshot
  ) values (
    client_result_id,
    actor.id,
    exam_mode,
    exam_score,
    total_questions,
    correct_count,
    wrong_count,
    started_at,
    completed_at,
    actor.branch_id,
    actor.employee_level
  ) returning id into attempt_id;

  insert into public.exam_answers (
    attempt_id,
    question_id,
    category_key,
    selected_answer,
    is_correct
  )
  select
    attempt_id,
    answer ->> 'questionId',
    answer ->> 'categoryId',
    (answer ->> 'selectedAnswer')::integer,
    (answer ->> 'isCorrect')::boolean
  from jsonb_array_elements(answers) answer;

  return attempt_id;
end;
$$;

create function public.record_study_attempt(
  question_id text,
  category_key text,
  is_correct boolean,
  first_attempt boolean,
  studied_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
begin
  select * into actor from public.profiles where id = (select auth.uid());
  if actor.id is null or actor.status <> 'active' then raise exception 'access denied'; end if;
  if not actor.is_super_admin and (actor.branch_id is null or actor.employee_level is null) then
    raise exception 'employee assignment is required';
  end if;
  if nullif(btrim(question_id), '') is null or nullif(btrim(category_key), '') is null then
    raise exception 'question and category are required';
  end if;

  insert into public.study_progress (
    user_id,
    branch_id_snapshot,
    employee_level_snapshot,
    question_id,
    category_key,
    correct_count,
    wrong_count,
    study_count,
    last_studied_at
  ) values (
    actor.id,
    actor.branch_id,
    actor.employee_level,
    question_id,
    category_key,
    case when is_correct then 1 else 0 end,
    case when is_correct then 0 else 1 end,
    case when first_attempt then 1 else 0 end,
    studied_at
  )
  on conflict (user_id, branch_id_snapshot, question_id) do update
  set correct_count = public.study_progress.correct_count + excluded.correct_count,
      wrong_count = public.study_progress.wrong_count + excluded.wrong_count,
      study_count = public.study_progress.study_count + excluded.study_count,
      category_key = excluded.category_key,
      employee_level_snapshot = excluded.employee_level_snapshot,
      last_studied_at = greatest(public.study_progress.last_studied_at, excluded.last_studied_at);
end;
$$;

create function public.begin_study_session(started_at timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
begin
  select * into actor from public.profiles where id = (select auth.uid());
  if actor.id is null or actor.status <> 'active' then raise exception 'access denied'; end if;

  insert into public.learning_daily_activity (
    user_id, branch_id_snapshot, employee_level_snapshot, activity_date, study_sessions
  ) values (
    actor.id, actor.branch_id, actor.employee_level, started_at::date, 1
  )
  on conflict (user_id, branch_id_snapshot, activity_date) do update
  set study_sessions = public.learning_daily_activity.study_sessions + 1,
      employee_level_snapshot = excluded.employee_level_snapshot;
end;
$$;

create function public.record_learning_duration(
  duration_seconds integer,
  recorded_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
begin
  select * into actor from public.profiles where id = (select auth.uid());
  if actor.id is null or actor.status <> 'active' then raise exception 'access denied'; end if;
  if duration_seconds <= 0 or duration_seconds > 86400 then raise exception 'invalid duration'; end if;

  insert into public.learning_daily_activity (
    user_id, branch_id_snapshot, employee_level_snapshot, activity_date, study_seconds
  ) values (
    actor.id, actor.branch_id, actor.employee_level, recorded_at::date, duration_seconds
  )
  on conflict (user_id, branch_id_snapshot, activity_date) do update
  set study_seconds = public.learning_daily_activity.study_seconds + excluded.study_seconds,
      employee_level_snapshot = excluded.employee_level_snapshot;
end;
$$;

revoke all on function public.record_exam_attempt(text, text, integer, integer, integer, integer, timestamptz, timestamptz, jsonb) from public, anon;
revoke all on function public.record_study_attempt(text, text, boolean, boolean, timestamptz) from public, anon;
revoke all on function public.begin_study_session(timestamptz) from public, anon;
revoke all on function public.record_learning_duration(integer, timestamptz) from public, anon;
grant execute on function public.record_exam_attempt(text, text, integer, integer, integer, integer, timestamptz, timestamptz, jsonb) to authenticated;
grant execute on function public.record_study_attempt(text, text, boolean, boolean, timestamptz) to authenticated;
grant execute on function public.begin_study_session(timestamptz) to authenticated;
grant execute on function public.record_learning_duration(integer, timestamptz) to authenticated;
