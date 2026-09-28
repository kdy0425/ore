import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { colors, radii, spacing } from '@/constants/theme';
import { canManageEmployees } from '@/lib/permissions';
import { useAuth } from '@/providers/AuthProvider';
import { loadAuditLogs } from '@/services/admin';
import type { Tables } from '@/types/database';

const ACTION_LABELS: Record<string, string> = {
  approve_user: '가입 승인', reject_user: '가입 거절', change_employee_level: '직원 레벨 변경',
  change_employee_branch: '직원 지점 변경', suspend_user: '직원 이용 정지', reactivate_user: '직원 재활성화',
  create_branch: '지점 생성', update_branch: '지점 수정', deactivate_branch: '지점 비활성화', activate_branch: '지점 재활성화',
  replace_recipe_bundle: '레시피 JSON 전체 교체', grant_super_admin: '최고관리자 권한 부여',
  revoke_super_admin: '최고관리자 권한 해제', reset_employee_password: '직원 비밀번호 재설정',
  bootstrap_developer: 'dev 계정 설정',
};

export default function AuditScreen() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<Tables<'admin_audit_logs'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void loadAuditLogs().then(setLogs).catch(() => setError('작업 이력을 불러오지 못했습니다.')).finally(() => setLoading(false));
  }, []));

  if (!canManageEmployees(profile)) return <StateView title="접근 권한이 없습니다." />;
  if (loading) return <StateView loading title="작업 이력을 불러오는 중입니다" />;
  if (error) return <StateView title={error} />;
  if (!logs.length) return <StateView title="관리자 작업 이력이 없습니다." />;

  return (
    <Screen contentContainerStyle={styles.content}>
      {logs.map((log) => (
        <View key={log.id} style={styles.card}>
          <Text style={styles.action}>{ACTION_LABELS[log.action] ?? log.action}</Text>
          <Text style={styles.meta}>{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.created_at))}</Text>
          <Text style={styles.id}>처리자 {log.actor_user_id.slice(0, 8)} · 대상 {log.target_user_id?.slice(0, 8) ?? '-'}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: 4 },
  action: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  meta: { color: colors.inkMuted, fontSize: 11 },
  id: { color: colors.inkMuted, fontSize: 10 },
});
