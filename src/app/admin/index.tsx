import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MenuCard } from '@/components/MenuCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import {
  canManageBranches,
  canManageEmployees,
  canManageNotices,
  canViewBranchStats,
  isDeveloper,
  isSuperAdmin,
} from '@/lib/permissions';
import { EMPLOYEE_LEVEL_LABELS } from '@/types/auth';

export default function AdminHomeScreen() {
  const { profile } = useAuth();
  const role = isSuperAdmin(profile)
    ? '최고관리자'
    : profile?.employee_level ? EMPLOYEE_LEVEL_LABELS[profile.employee_level] : '관리자';

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{role}</Text>
        <Text style={styles.title}>{profile?.branch?.name ?? '전체 지점'} 관리</Text>
        <Text style={styles.copy}>허용된 범위의 직원과 학습 현황을 관리할 수 있습니다.</Text>
      </View>
      <MenuCard title="승인 대기" description="가입 신청을 승인하거나 거절합니다." icon="person-add-outline" onPress={() => router.push('/admin/applications')} />
      <MenuCard title="직원 검색" description="직원 정보와 개인 통계를 확인합니다." icon="people-outline" accent="#2D5B9B" onPress={() => router.push('/admin/employees')} />
      {canViewBranchStats(profile) ? <MenuCard title="통계" description="직원·지점별 시험 현황을 확인합니다." icon="analytics-outline" accent={colors.success} onPress={() => router.push('/admin/stats')} /> : null}
      {isDeveloper(profile) ? <MenuCard title="레시피 데이터" description="JSON 파일 또는 전체 텍스트로 문제은행을 교체합니다." icon="code-slash-outline" accent="#C34B43" onPress={() => router.push('/admin/recipes' as never)} /> : null}
      {canManageEmployees(profile) && canManageNotices(profile) ? <MenuCard title="공지사항 관리" description="허용된 범위의 공지를 작성하고 관리합니다." icon="megaphone-outline" accent="#8B4AA8" onPress={() => router.push('/admin/notices')} /> : null}
      {canManageBranches(profile) ? <MenuCard title="지점 관리" description="지점을 추가하거나 수정·비활성화합니다." icon="storefront-outline" accent="#B06C08" onPress={() => router.push('/admin/branches')} /> : null}
      {canManageEmployees(profile) ? <MenuCard title="관리자 작업이력" description="승인과 권한 변경 기록을 확인합니다." icon="time-outline" accent="#555" onPress={() => router.push('/admin/audit')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  eyebrow: { color: colors.brand, fontSize: 12, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 25, fontWeight: '900' },
  copy: { color: colors.inkMuted, fontSize: 14 },
});
