import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChoiceChips } from '@/components/ChoiceChips';
import { FormField } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { colors, radii, spacing } from '@/constants/theme';
import { loadProfiles } from '@/services/admin';
import { ACCOUNT_STATUS_LABELS, EMPLOYEE_LEVEL_LABELS, type AccountStatus, type EmployeeLevel, type ProfileWithBranches } from '@/types/auth';

type LevelFilter = EmployeeLevel | 'all';
type StatusFilter = AccountStatus | 'all';

export default function EmployeesScreen() {
  const [profiles, setProfiles] = useState<ProfileWithBranches[]>([]);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [branch, setBranch] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setProfiles(await loadProfiles()); setError(null); }
    catch { setError('직원 목록을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const filtered = useMemo(() => profiles.filter((profile) => {
    if (profile.status === 'pending') return false;
    if (level !== 'all' && profile.employee_level !== level) return false;
    if (branch !== 'all' && profile.branch_id !== branch) return false;
    if (status !== 'all' && profile.status !== status) return false;
    const keyword = search.trim().toLowerCase();
    return !keyword || profile.name.toLowerCase().includes(keyword) || profile.email.toLowerCase().includes(keyword);
  }), [branch, level, profiles, search, status]);
  const branchOptions = Array.from(new Map(profiles
    .filter((profile) => profile.branch_id && profile.branch)
    .map((profile) => [profile.branch_id!, profile.branch!.name])).entries());

  if (loading) return <StateView loading title="직원 목록을 불러오는 중입니다" />;
  if (error) return <StateView title={error} />;

  return (
    <Screen contentContainerStyle={styles.content}>
      <FormField label="직원 검색" value={search} onChangeText={setSearch} placeholder="이름 또는 이메일" />
      <ChoiceChips
        value={level}
        options={[
          { value: 'all', label: '전체' },
          ...Object.entries(EMPLOYEE_LEVEL_LABELS).map(([value, labelText]) => ({ value: value as EmployeeLevel, label: labelText })),
        ]}
        onChange={setLevel}
      />
      {branchOptions.length > 1 ? (
        <ChoiceChips
          value={branch}
          options={[{ value: 'all', label: '전체 지점' }, ...branchOptions.map(([value, label]) => ({ value, label }))]}
          onChange={setBranch}
        />
      ) : null}
      <ChoiceChips
        value={status}
        options={[
          { value: 'all', label: '전체 상태' },
          ...(['active', 'suspended', 'rejected'] as AccountStatus[]).map((value) => ({ value, label: ACCOUNT_STATUS_LABELS[value] })),
        ]}
        onChange={setStatus}
      />
      {filtered.length === 0 ? <StateView title="등록된 직원이 없습니다." /> : filtered.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => router.push({ pathname: '/admin/employee/[id]', params: { id: item.id } })}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.flex}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.branch?.name ?? '소속 지점 없음'} · {item.employee_level ? EMPLOYEE_LEVEL_LABELS[item.employee_level] : '레벨 미지정'}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </View>
          <View style={[styles.status, item.status === 'active' ? styles.active : styles.inactive]}>
            <Text style={[styles.statusText, item.status === 'active' ? styles.activeText : styles.inactiveText]}>{ACCOUNT_STATUS_LABELS[item.status]}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, gap: 3 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  meta: { color: colors.inkMuted, fontSize: 12 },
  email: { color: colors.inkMuted, fontSize: 11 },
  status: { borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 5 },
  active: { backgroundColor: colors.successSoft },
  inactive: { backgroundColor: colors.dangerSoft },
  statusText: { fontSize: 10, fontWeight: '900' },
  activeText: { color: colors.success },
  inactiveText: { color: colors.danger },
  pressed: { opacity: 0.72 },
});
