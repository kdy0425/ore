import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppButton } from '@/components/AppButton';
import { FormField } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { colors, radii, spacing } from '@/constants/theme';
import { activateBranch, createBranch, deactivateBranch, loadBranches, updateBranch } from '@/services/admin';
import { toUserMessage } from '@/lib/errors';
import { isSuperAdmin } from '@/lib/permissions';
import { useAuth } from '@/providers/AuthProvider';
import type { Branch } from '@/types/auth';

export default function BranchesScreen() {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setBranches(await loadBranches(true)); setError(null); }
    catch { setError('지점 목록을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  if (!isSuperAdmin(profile)) return <StateView title="접근 권한이 없습니다." />;
  if (loading) return <StateView loading title="지점 목록을 불러오는 중입니다" />;
  if (error) return <StateView title={error} />;

  const resetForm = () => { setEditing(null); setName(''); setSortOrder('0'); };
  const submit = async () => {
    if (!name.trim()) return Alert.alert('지점 이름을 입력해주세요.');
    setBusy(true);
    try {
      if (editing) await updateBranch(editing.id, name.trim(), Number(sortOrder) || 0);
      else await createBranch(name.trim(), Number(sortOrder) || 0);
      resetForm();
      await refresh();
    } catch (submitError) { Alert.alert('저장 실패', toUserMessage(submitError)); }
    finally { setBusy(false); }
  };

  const toggleActive = (branch: Branch) => {
    Alert.alert(
      branch.is_active ? '지점 비활성화' : '지점 재활성화',
      branch.is_active ? '활성 직원이 남아 있으면 비활성화할 수 없습니다.' : '회원가입 지점 목록에 다시 표시됩니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '변경', style: branch.is_active ? 'destructive' : 'default', onPress: async () => {
          try {
            if (branch.is_active) await deactivateBranch(branch.id);
            else await activateBranch(branch.id);
            await refresh();
          } catch (toggleError) { Alert.alert('변경 실패', toUserMessage(toggleError, '활성 직원이 남아 있거나 권한이 없습니다.')); }
        } },
      ],
    );
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editing ? '지점 수정' : '새 지점 추가'}</Text>
        <FormField label="지점 이름" value={name} onChangeText={setName} placeholder="오레노라멘 ○○점" />
        <FormField label="정렬 순서" value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" placeholder="0" />
        <View style={styles.actions}>
          <View style={styles.flex}><AppButton label={editing ? '수정 저장' : '지점 추가'} onPress={() => void submit()} loading={busy} /></View>
          {editing ? <View style={styles.flex}><AppButton label="취소" variant="secondary" onPress={resetForm} /></View> : null}
        </View>
      </View>

      {branches.map((branch) => (
        <View key={branch.id} style={[styles.card, !branch.is_active && styles.inactiveCard]}>
          <Pressable
            style={styles.flex}
            onPress={() => { setEditing(branch); setName(branch.name); setSortOrder(String(branch.sort_order)); }}
          >
            <Text style={styles.name}>{branch.name}</Text>
            <Text style={styles.meta}>정렬 {branch.sort_order} · {branch.is_active ? '활성' : '비활성'}</Text>
          </Pressable>
          <AppButton label={branch.is_active ? '비활성화' : '활성화'} variant={branch.is_active ? 'danger' : 'secondary'} onPress={() => toggleActive(branch)} />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  formCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.md, gap: spacing.md },
  formTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  inactiveCard: { opacity: 0.62 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  meta: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
});
