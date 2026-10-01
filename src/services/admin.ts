import { supabase } from '@/lib/supabase';
import type { AccountStatus, Branch, EmployeeLevel, ProfileWithBranches, ProfileWithLastAccess } from '@/types/auth';
import type { Tables } from '@/types/database';

const PROFILE_SELECT = `
  *,
  branch:branches!profiles_branch_id_fkey(id, name, is_active),
  requested_branch:branches!profiles_requested_branch_id_fkey(id, name, is_active)
`;

async function loadLastAccessByUser(): Promise<Map<string, string>> {
  const { data, error } = await supabase.rpc('list_employee_last_access');
  if (error) throw error;
  return new Map((data ?? []).map((item) => [item.user_id, item.last_accessed_at]));
}

export async function loadProfiles(includeLastAccess = false): Promise<ProfileWithLastAccess[]> {
  const profilesPromise = supabase.from('profiles').select(PROFILE_SELECT).order('created_at', { ascending: false });
  const [profilesResult, lastAccessByUser] = await Promise.all([
    profilesPromise,
    includeLastAccess ? loadLastAccessByUser() : Promise.resolve(new Map<string, string>()),
  ]);
  const { data, error } = profilesResult;
  if (error) throw error;
  return ((data as unknown as ProfileWithBranches[]) ?? []).map((profile) => ({
    ...profile,
    last_accessed_at: lastAccessByUser.get(profile.id) ?? null,
  }));
}

export async function loadProfile(id: string, includeLastAccess = false): Promise<ProfileWithLastAccess> {
  const profilePromise = supabase.from('profiles').select(PROFILE_SELECT).eq('id', id).single();
  const [profileResult, lastAccessByUser] = await Promise.all([
    profilePromise,
    includeLastAccess ? loadLastAccessByUser() : Promise.resolve(new Map<string, string>()),
  ]);
  const { data, error } = profileResult;
  if (error) throw error;
  const profile = data as unknown as ProfileWithBranches;
  return { ...profile, last_accessed_at: lastAccessByUser.get(profile.id) ?? null };
}

export async function recordMainAccess(): Promise<void> {
  const { error } = await supabase.rpc('record_main_access');
  if (error) throw error;
}

export async function approveUser(id: string, level?: EmployeeLevel): Promise<void> {
  const { error } = await supabase.rpc('approve_user', { target_user_id: id, selected_level: level });
  if (error) throw error;
}

export async function rejectUser(id: string): Promise<void> {
  const { error } = await supabase.rpc('reject_user', { target_user_id: id });
  if (error) throw error;
}

export async function changeEmployeeLevel(id: string, level: EmployeeLevel): Promise<void> {
  const { error } = await supabase.rpc('change_employee_level', { target_user_id: id, new_level: level });
  if (error) throw error;
}

export async function changeEmployeeBranch(id: string, branchId: string): Promise<void> {
  const { error } = await supabase.rpc('change_employee_branch', { target_user_id: id, new_branch_id: branchId });
  if (error) throw error;
}

export async function changeEmployeeStatus(id: string, status: AccountStatus): Promise<void> {
  const { error } = await supabase.rpc('change_employee_status', { target_user_id: id, new_status: status });
  if (error) throw error;
}

export async function changeSuperAdminStatus(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.rpc('change_super_admin_status', {
    target_user_id: id,
    enabled,
    fallback_level: 'part_timer',
  });
  if (error) throw error;
}

export async function resetEmployeePassword(id: string, newPassword: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>('reset-employee-password', {
    body: { targetUserId: id, newPassword },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error ?? '비밀번호를 변경하지 못했습니다.');
}

export async function loadBranches(includeInactive = false): Promise<Branch[]> {
  let query = supabase.from('branches').select('*').order('sort_order');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createBranch(name: string, sortOrder: number): Promise<void> {
  const { error } = await supabase.rpc('create_branch', { branch_name: name, branch_sort_order: sortOrder });
  if (error) throw error;
}

export async function updateBranch(id: string, name: string, sortOrder: number): Promise<void> {
  const { error } = await supabase.rpc('update_branch', { target_branch_id: id, branch_name: name, branch_sort_order: sortOrder });
  if (error) throw error;
}

export async function deactivateBranch(id: string): Promise<void> {
  const { error } = await supabase.rpc('deactivate_branch', { target_branch_id: id });
  if (error) throw error;
}

export async function activateBranch(id: string): Promise<void> {
  const { error } = await supabase.rpc('activate_branch', { target_branch_id: id });
  if (error) throw error;
}

export async function loadExamAttempts(userId?: string): Promise<Tables<'exam_attempts'>[]> {
  let query = supabase.from('exam_attempts').select('*').order('completed_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function loadStudyProgress(userId?: string): Promise<Tables<'study_progress'>[]> {
  let query = supabase.from('study_progress').select('*').order('last_studied_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function loadExamAnswers(): Promise<Tables<'exam_answers'>[]> {
  const { data, error } = await supabase.from('exam_answers').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function loadAuditLogs(): Promise<Tables<'admin_audit_logs'>[]> {
  const { data, error } = await supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}
