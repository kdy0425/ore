import type { Enums, Tables } from './database';

export type AccountStatus = Enums<'account_status'>;
export type EmployeeLevel = Enums<'employee_level'>;
export type Branch = Tables<'branches'>;
export type Profile = Tables<'profiles'>;

export interface ProfileWithBranches extends Profile {
  branch: Pick<Branch, 'id' | 'name' | 'is_active'> | null;
  requested_branch: Pick<Branch, 'id' | 'name' | 'is_active'> | null;
}

export const EMPLOYEE_LEVEL_LABELS: Record<EmployeeLevel, string> = {
  branch_manager: '지점장',
  manager: '매니저',
  captain: '캡틴',
  trainer: '트레이너',
  part_timer: '파트타이머',
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  pending: '승인 대기',
  active: '정상',
  rejected: '가입 거절',
  suspended: '이용 정지',
};
