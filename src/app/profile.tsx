import { useState } from 'react';
import * as Application from 'expo-application';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { PolicyLinks } from '@/components/PolicyLinks';
import { Screen } from '@/components/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { ACCOUNT_STATUS_LABELS, EMPLOYEE_LEVEL_LABELS } from '@/types/auth';
import { deleteCurrentAccount } from '@/services/account';
import { toUserMessage } from '@/lib/errors';
import { PushNotificationSetting } from '@/components/PushNotificationSetting';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const version = Application.nativeApplicationVersion ?? '1.0.0';
  const buildVersion = Application.nativeBuildVersion;

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.name}>{profile?.name}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <View style={styles.divider} />
        <View style={styles.row}><Text style={styles.label}>소속 지점</Text><Text style={styles.value}>{profile?.branch?.name ?? '-'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>휴대폰 번호</Text><Text style={styles.value}>{profile?.phone_number ?? '-'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>직원 레벨</Text><Text style={styles.value}>{profile?.is_super_admin ? '최고관리자' : profile?.employee_level ? EMPLOYEE_LEVEL_LABELS[profile.employee_level] : '-'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>계정 상태</Text><Text style={styles.value}>{profile ? ACCOUNT_STATUS_LABELS[profile.status] : '-'}</Text></View>
      </View>
      <Text style={styles.help}>소속 지점이나 직원 레벨 변경은 관리자에게 문의해주세요.</Text>
      <PushNotificationSetting />
      <View style={styles.sectionCard}>
        <View style={styles.row}>
          <Text style={styles.label}>앱 버전</Text>
          <Text style={styles.value}>{version}{buildVersion ? ` (${buildVersion})` : ''}</Text>
        </View>
      </View>
      <View style={styles.policySection}>
        <PolicyLinks showHeading />
      </View>
      <AppButton label="로그아웃" variant="danger" onPress={() => void signOut()} />
      <View style={styles.deleteSection}>
        <Text style={styles.deleteTitle}>계정 삭제</Text>
        <Text style={styles.help}>계정, 학습 기록, 시험 결과와 작성한 공지가 영구 삭제되며 복구할 수 없습니다.</Text>
        <AppButton
          label="계정 영구 삭제"
          variant="danger"
          loading={deleting}
          onPress={() => {
            Alert.alert('계정을 영구 삭제할까요?', '이 작업은 취소하거나 복구할 수 없습니다.', [
              { text: '취소', style: 'cancel' },
              {
                text: '영구 삭제',
                style: 'destructive',
                onPress: () => {
                  setDeleting(true);
                  void deleteCurrentAccount()
                    .catch((error) => Alert.alert('계정 삭제 실패', toUserMessage(error)))
                    .finally(() => setDeleting(false));
                },
              },
            ]);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  name: { color: colors.ink, fontSize: 25, fontWeight: '900' },
  email: { color: colors.inkMuted, fontSize: 13 },
  divider: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { color: colors.inkMuted, fontSize: 13 },
  value: { color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
  help: { color: colors.inkMuted, fontSize: 12, textAlign: 'center' },
  sectionCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg },
  policySection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg },
  deleteSection: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.lg, gap: spacing.sm },
  deleteTitle: { color: colors.danger, fontSize: 16, fontWeight: '900', textAlign: 'center' },
});
