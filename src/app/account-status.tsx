import { StyleSheet, Text, View } from 'react-native';
import { AuthShell } from '@/components/AuthShell';
import { AppButton } from '@/components/AppButton';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

const copy = {
  pending: ['현재 가입 승인 대기 중입니다.', '관리자가 소속 지점과 직원 레벨을 확인한 뒤 승인합니다.'],
  rejected: ['가입 신청이 승인되지 않았습니다.', '자세한 내용은 관리자에게 문의해주세요.'],
  suspended: ['현재 이용이 정지된 계정입니다.', '재이용이 필요하면 관리자에게 문의해주세요.'],
  active: ['정상 계정입니다.', ''],
} as const;

export default function AccountStatusScreen() {
  const { profile, profileError, refreshProfile, signOut } = useAuth();
  const status = profile?.status ?? 'pending';
  const [title, description] = copy[status];

  return (
    <AuthShell title={title} description={description}>
      <View style={styles.card}>
        <View style={styles.row}><Text style={styles.label}>이름</Text><Text style={styles.value}>{profile?.name ?? '-'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>신청 지점</Text><Text style={styles.value}>{profile?.requested_branch?.name ?? '-'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>상태</Text><Text style={styles.status}>{title}</Text></View>
      </View>
      {profileError ? <Text style={styles.error}>{profileError}</Text> : null}
      <AppButton label="승인 상태 새로고침" variant="secondary" onPress={() => void refreshProfile()} />
      <AppButton label="로그아웃" variant="ghost" onPress={() => void signOut()} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { color: colors.inkMuted, fontSize: 13 },
  value: { color: colors.ink, fontSize: 14, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  status: { color: colors.warning, fontSize: 14, fontWeight: '900' },
  error: { color: colors.danger, textAlign: 'center' },
});
