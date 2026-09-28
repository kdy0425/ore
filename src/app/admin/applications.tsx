import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppButton } from '@/components/AppButton';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { colors, radii, spacing } from '@/constants/theme';
import { approveUser, loadProfiles, rejectUser } from '@/services/admin';
import { toUserMessage } from '@/lib/errors';
import { assignableLevels, isManager } from '@/lib/permissions';
import { useAuth } from '@/providers/AuthProvider';
import { EMPLOYEE_LEVEL_LABELS, type EmployeeLevel, type ProfileWithBranches } from '@/types/auth';

export default function ApplicationsScreen() {
  const { profile } = useAuth();
  const [items, setItems] = useState<ProfileWithBranches[]>([]);
  const [levels, setLevels] = useState<Record<string, EmployeeLevel>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const availableLevels = assignableLevels(profile);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const profiles = await loadProfiles();
      setItems(profiles.filter((item) => item.status === 'pending'));
      setError(null);
    } catch (loadError) {
      setError(toUserMessage(loadError, '승인 대기 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const approve = (item: ProfileWithBranches) => {
    const selected = levels[item.id] ?? (availableLevels.includes('part_timer') ? 'part_timer' : undefined);
    if (!isManager(profile) && !selected) return Alert.alert('직원 레벨을 선택해주세요.');
    Alert.alert('가입 승인', `${item.name} 직원을 승인하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '승인', onPress: async () => {
        setBusyId(item.id);
        try {
          await approveUser(item.id, isManager(profile) ? undefined : selected);
          await refresh();
        } catch (approveError) {
          Alert.alert('승인 실패', toUserMessage(approveError));
        } finally { setBusyId(null); }
      } },
    ]);
  };

  const reject = (item: ProfileWithBranches) => {
    Alert.alert('가입 거절', `${item.name} 직원의 가입 신청을 거절하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '거절', style: 'destructive', onPress: async () => {
        setBusyId(item.id);
        try { await rejectUser(item.id); await refresh(); }
        catch (rejectError) { Alert.alert('거절 실패', toUserMessage(rejectError)); }
        finally { setBusyId(null); }
      } },
    ]);
  };

  if (loading) return <StateView loading title="승인 대기 직원을 불러오는 중입니다" />;
  if (error) return <StateView title={error} />;
  if (!items.length) return <StateView title="현재 승인 대기 중인 직원이 없습니다." />;

  return (
    <Screen contentContainerStyle={styles.content}>
      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.heading}>
            <View style={styles.flex}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <Text style={styles.branch}>{item.requested_branch?.name ?? '지점 미확인'}</Text>
          </View>
          {availableLevels.length ? (
            <View style={styles.levelSection}>
              <Text style={styles.label}>승인할 직원 레벨</Text>
              <ChoiceChips
                value={levels[item.id] ?? 'part_timer'}
                options={availableLevels.map((level) => ({ value: level, label: EMPLOYEE_LEVEL_LABELS[level] }))}
                onChange={(level) => setLevels((current) => ({ ...current, [item.id]: level }))}
              />
            </View>
          ) : <Text style={styles.info}>매니저 승인은 파트타이머로 자동 지정됩니다.</Text>}
          <View style={styles.actions}>
            <View style={styles.flex}><AppButton label="승인" onPress={() => approve(item)} loading={busyId === item.id} /></View>
            <View style={styles.flex}><AppButton label="거절" variant="danger" onPress={() => reject(item)} disabled={busyId !== null} /></View>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.md, gap: spacing.md },
  heading: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  name: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  email: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  branch: { color: '#2D5B9B', backgroundColor: '#E8F0FB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, fontSize: 11, fontWeight: '800', overflow: 'hidden', maxWidth: '46%' },
  levelSection: { gap: spacing.xs },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  info: { color: colors.inkMuted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
