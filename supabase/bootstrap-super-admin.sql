-- Supabase SQL Editor에서 실행하기 전에 target_email을 실제 최초 관리자 이메일로 바꾸세요.
-- 회원가입을 먼저 완료한 계정만 지정할 수 있습니다.
do $bootstrap$
declare
  target_email text := null;
  target_user public.profiles;
begin
  if target_email is null then
    raise exception 'target_email 값을 최초 최고관리자 이메일로 설정하세요.';
  end if;

  select p.* into target_user
  from public.profiles p
  where lower(p.email) = lower(target_email)
  for update;

  if target_user.id is null then
    raise exception '해당 이메일로 가입한 프로필을 찾을 수 없습니다.';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.is_super_admin and p.status = 'active' and p.id <> target_user.id
  ) then
    raise exception '이미 활성 최고관리자가 있습니다. 추가 지정은 별도 보안 절차로 처리하세요.';
  end if;

  update public.profiles
  set is_super_admin = true,
      status = 'active',
      branch_id = requested_branch_id,
      employee_level = null,
      approved_by = id,
      approved_at = now()
  where id = target_user.id;

  insert into public.admin_audit_logs (
    actor_user_id,
    target_user_id,
    branch_id,
    action,
    before_data,
    after_data
  )
  select
    p.id,
    p.id,
    p.branch_id,
    'bootstrap_super_admin',
    to_jsonb(target_user),
    to_jsonb(p)
  from public.profiles p
  where p.id = target_user.id;
end;
$bootstrap$;
