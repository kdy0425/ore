import type { EmployeeLevel, Profile } from '@/types/auth';

export function isActive(profile: Profile | null): boolean {
  return profile?.status === 'active';
}

export function isSuperAdmin(profile: Profile | null): boolean {
  return isActive(profile) && (profile?.is_super_admin === true || profile?.is_developer === true);
}

export function isDeveloper(profile: Profile | null): boolean {
  return isActive(profile) && profile?.is_developer === true;
}

export function isBranchManager(profile: Profile | null): boolean {
  return isActive(profile) && profile?.employee_level === 'branch_manager';
}

export function isManager(profile: Profile | null): boolean {
  return isActive(profile) && profile?.employee_level === 'manager';
}

export function canReviewApplications(profile: Profile | null): boolean {
  return isSuperAdmin(profile) || isBranchManager(profile) || isManager(profile);
}

export function canViewBranchStats(profile: Profile | null): boolean {
  return canReviewApplications(profile);
}

export function canManageEmployees(profile: Profile | null): boolean {
  return isSuperAdmin(profile) || isBranchManager(profile);
}

export function canManageBranches(profile: Profile | null): boolean {
  return isSuperAdmin(profile);
}

export function canManageNotices(profile: Profile | null): boolean {
  return isSuperAdmin(profile) || isBranchManager(profile);
}

export function canAccessAdmin(profile: Profile | null): boolean {
  return canReviewApplications(profile);
}

export function canResetEmployeePassword(profile: Profile | null): boolean {
  return isSuperAdmin(profile) || isBranchManager(profile);
}

export function assignableLevels(profile: Profile | null): EmployeeLevel[] {
  if (isSuperAdmin(profile)) {
    return ['branch_manager', 'manager', 'captain', 'trainer', 'part_timer'];
  }
  if (isBranchManager(profile)) return ['manager', 'captain', 'trainer', 'part_timer'];
  return [];
}
