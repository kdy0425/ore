import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AppButton } from '@/components/AppButton';
import { ChoiceChips } from '@/components/ChoiceChips';
import { FormField } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { StatCard } from '@/components/StatCard';
import { colors, radii, spacing } from '@/constants/theme';
import {
  changeEmployeeBranch,
  changeEmployeeLevel,
  changeEmployeeStatus,
  changeSuperAdminStatus,
  loadBranches,
  loadExamAnswers,
  loadExamAttempts,
  loadProfile,
  loadStudyProgress,
  resetEmployeePassword,
} from '@/services/admin';
import { getCategories } from '@/data/quizRepository';
import { assignableLevels, canManageEmployees, canResetEmployeePassword, isBranchManager, isDeveloper, isSuperAdmin } from '@/lib/permissions';
import { toUserMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import { EMPLOYEE_LEVEL_LABELS, type Branch, type EmployeeLevel, type ProfileWithLastAccess } from '@/types/auth';
import type { Tables } from '@/types/database';
import { formatDateTime } from '@/utils/date';

export default function EmployeeDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { profile: actor } = useAuth();
  const canViewLastAccess = isSuperAdmin(actor);
  const [employee, setEmployee] = useState<ProfileWithLastAccess | null>(null);
  const [attempts, setAttempts] = useState<Tables<'exam_attempts'>[]>([]);
  const [answers, setAnswers] = useState<Tables<'exam_answers'>[]>([]);
  const [study, setStudy] = useState<Tables<'study_progress'>[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [profile, examData, answerData, studyData, branchData] = await Promise.all([
        loadProfile(id, canViewLastAccess), loadExamAttempts(id), loadExamAnswers(), loadStudyProgress(id), loadBranches(),
      ]);
      setEmployee(profile);
      setAttempts(examData);
      const attemptIds = new Set(examData.map((attempt) => attempt.id));
      setAnswers(answerData.filter((answer) => attemptIds.has(answer.attempt_id)));
      setStudy(studyData);
      setBranches(branchData);
      setError(null);
    } catch {
      setError('직원 정보를 불러오지 못했습니다.');
    } finally { setLoading(false); }
  }, [canViewLastAccess, id]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const summary = useMemo(() => {
    const total = attempts.length;
    const correct = attempts.reduce((sum, item) => sum + item.correct_count, 0);
    const wrong = attempts.reduce((sum, item) => sum + item.wrong_count, 0);
    const average = total ? Math.round(attempts.reduce((sum, item) => sum + item.score, 0) / total) : 0;
    const best = total ? Math.max(...attempts.map((item) => item.score)) : 0;
    return { total, correct, wrong, average, best };
  }, [attempts]);
  const categoryRows = useMemo(() => getCategories().map((category) => {
    const categoryAnswers = answers.filter((answer) => answer.category_key === category.id);
    const correct = categoryAnswers.filter((answer) => answer.is_correct).length;
    return {
      id: category.id,
      name: category.name,
      total: categoryAnswers.length,
      accuracy: categoryAnswers.length ? Math.round((correct / categoryAnswers.length) * 100) : 0,
    };
  }).filter((row) => row.total > 0), [answers]);

  if (loading) return <StateView loading title="직원 정보를 불러오는 중입니다" />;
  if (error || !employee) return <StateView title={error ?? '직원을 찾을 수 없습니다.'} />;

  const canEdit = canManageEmployees(actor)
    && actor?.id !== employee.id
    && !employee.is_super_admin
    && !(isBranchManager(actor) && employee.employee_level === 'branch_manager');
  const levels = assignableLevels(actor);
  const canChangeSuperAdmin = isDeveloper(actor)
    && actor?.id !== employee.id
    && !employee.is_developer
    && employee.status === 'active';
  const canResetPassword = canResetEmployeePassword(actor)
    && actor?.id !== employee.id
    && !employee.is_developer
    && (employee.status === 'active' || employee.status === 'suspended')
    && (isDeveloper(actor)
      || (isSuperAdmin(actor) && !employee.is_super_admin)
      || (isBranchManager(actor)
        && actor?.branch_id === employee.branch_id
        && !employee.is_super_admin
        && employee.employee_level !== 'branch_manager'));

  const runChange = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); await refresh(); }
    catch (changeError) { Alert.alert(`${label} 실패`, toUserMessage(changeError)); }
    finally { setBusy(false); }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <Text style={styles.name}>{employee.name}</Text>
        <Text style={styles.email}>{employee.email}</Text>
        <Text style={styles.email}>{employee.phone_number || '휴대폰 번호 미등록'}</Text>
        <Text style={styles.meta}>{employee.branch?.name ?? '소속 지점 없음'} · {employee.employee_level ? EMPLOYEE_LEVEL_LABELS[employee.employee_level] : '레벨 미지정'}</Text>
        {canViewLastAccess ? <Text style={styles.lastAccess}>최근 접속 · {formatDateTime(employee.last_accessed_at)}</Text> : null}
        <Text style={[styles.status, employee.status === 'active' ? styles.active : styles.suspended]}>{employee.status === 'active' ? '정상 사용' : '이용 정지'}</Text>
      </View>

      <Text style={styles.sectionTitle}>개인 시험 통계</Text>
      <View style={styles.stats}><StatCard label="시험 횟수" value={summary.total} /><StatCard label="평균 점수" value={`${summary.average}점`} /></View>
      <View style={styles.stats}><StatCard label="최고 점수" value={`${summary.best}점`} /><StatCard label="정답 / 오답" value={`${summary.correct} / ${summary.wrong}`} /></View>
      <Text style={styles.caption}>학습 문제 {study.length}개 · 최근 시험 {attempts[0] ? new Date(attempts[0].completed_at).toLocaleDateString('ko-KR') : '기록 없음'}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>카테고리별 정답률</Text>
        {categoryRows.length ? categoryRows.map((row) => (
          <View key={row.id} style={styles.dataRow}>
            <Text style={styles.dataLabel}>{row.name}</Text>
            <Text style={styles.dataValue}>{row.accuracy}% · {row.total}문제</Text>
          </View>
        )) : <Text style={styles.caption}>카테고리별 시험 기록이 없습니다.</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>최근 시험</Text>
        {attempts.slice(0, 5).length ? attempts.slice(0, 5).map((attempt) => (
          <View key={attempt.id} style={styles.dataRow}>
            <View>
              <Text style={styles.dataLabel}>{new Date(attempt.completed_at).toLocaleString('ko-KR')}</Text>
              <Text style={styles.caption}>정답 {attempt.correct_count} · 오답 {attempt.wrong_count}</Text>
            </View>
            <Text style={styles.score}>{attempt.score}점</Text>
          </View>
        )) : <Text style={styles.caption}>최근 시험 기록이 없습니다.</Text>}
      </View>

      {canEdit && levels.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>직원 레벨 변경</Text>
          <ChoiceChips
            value={employee.employee_level}
            options={levels.map((level) => ({ value: level, label: EMPLOYEE_LEVEL_LABELS[level] }))}
            onChange={(level: EmployeeLevel) => {
              Alert.alert('직원 레벨 변경', `${EMPLOYEE_LEVEL_LABELS[level]}(으)로 변경하시겠습니까?`, [
                { text: '취소', style: 'cancel' },
                { text: '변경', onPress: () => void runChange('레벨 변경', () => changeEmployeeLevel(employee.id, level)) },
              ]);
            }}
          />
        </View>
      ) : null}

      {canEdit && isSuperAdmin(actor) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>소속 지점 변경</Text>
          <ChoiceChips
            value={employee.branch_id}
            options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
            onChange={(branchId) => {
              const branch = branches.find((item) => item.id === branchId);
              Alert.alert('소속 지점 변경', `${branch?.name}(으)로 변경하시겠습니까?`, [
                { text: '취소', style: 'cancel' },
                { text: '변경', onPress: () => void runChange('지점 변경', () => changeEmployeeBranch(employee.id, branchId)) },
              ]);
            }}
          />
        </View>
      ) : null}

      {canChangeSuperAdmin ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최고관리자 권한</Text>
          <Text style={styles.caption}>이 권한은 dev 계정만 부여하거나 해제할 수 있습니다.</Text>
          <AppButton
            label={employee.is_super_admin ? '최고관리자 권한 해제' : '최고관리자로 지정'}
            variant={employee.is_super_admin ? 'danger' : 'secondary'}
            loading={busy}
            onPress={() => {
              const enabled = !employee.is_super_admin;
              Alert.alert('최고관리자 권한 변경', enabled ? '이 직원을 최고관리자로 지정하시겠습니까?' : '최고관리자 권한을 해제하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                { text: '변경', style: enabled ? 'default' : 'destructive', onPress: () => void runChange('최고관리자 권한 변경', () => changeSuperAdminStatus(employee.id, enabled)) },
              ]);
            }}
          />
        </View>
      ) : null}

      {canResetPassword ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>직원 비밀번호 재설정</Text>
          <Text style={styles.caption}>8자 이상의 임시 비밀번호를 입력하세요. 저장 후 직원에게 안전하게 전달해야 합니다.</Text>
          <FormField
            label="새 비밀번호"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="8자 이상"
          />
          <FormField
            label="새 비밀번호 확인"
            value={newPasswordConfirm}
            onChangeText={setNewPasswordConfirm}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="한 번 더 입력"
          />
          <AppButton
            label="비밀번호 재설정"
            variant="secondary"
            loading={busy}
            onPress={() => {
              if (newPassword.length < 8) {
                Alert.alert('입력 확인', '비밀번호는 8자 이상이어야 합니다.');
                return;
              }
              if (newPassword !== newPasswordConfirm) {
                Alert.alert('입력 확인', '비밀번호 확인이 일치하지 않습니다.');
                return;
              }
              Alert.alert('비밀번호 재설정', '입력한 비밀번호로 즉시 변경하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                {
                  text: '변경',
                  onPress: () => {
                    setBusy(true);
                    void resetEmployeePassword(employee.id, newPassword)
                      .then(() => {
                        setNewPassword('');
                        setNewPasswordConfirm('');
                        Alert.alert('변경 완료', '직원 비밀번호가 재설정되었습니다.');
                      })
                      .catch((resetError) => Alert.alert('비밀번호 재설정 실패', toUserMessage(resetError)))
                      .finally(() => setBusy(false));
                  },
                },
              ]);
            }}
          />
        </View>
      ) : null}

      {canEdit ? (
        <AppButton
          label={employee.status === 'active' ? '직원 이용 정지' : '직원 재활성화'}
          variant={employee.status === 'active' ? 'danger' : 'secondary'}
          loading={busy}
          onPress={() => {
            const next = employee.status === 'active' ? 'suspended' : 'active';
            Alert.alert(next === 'suspended' ? '직원 이용 정지' : '직원 재활성화', '계정 상태를 변경하시겠습니까?', [
              { text: '취소', style: 'cancel' },
              { text: '변경', style: next === 'suspended' ? 'destructive' : 'default', onPress: () => void runChange('상태 변경', () => changeEmployeeStatus(employee.id, next)) },
            ]);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  profileCard: { backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  name: { color: colors.white, fontSize: 26, fontWeight: '900' },
  email: { color: '#D8D4CF', fontSize: 13 },
  meta: { color: colors.white, fontSize: 14, fontWeight: '800', marginTop: spacing.xs },
  lastAccess: { color: '#F3AAA4', fontSize: 12, fontWeight: '800', marginTop: spacing.xs },
  status: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, overflow: 'hidden', fontSize: 11, fontWeight: '900', marginTop: spacing.xs },
  active: { color: colors.success, backgroundColor: colors.successSoft },
  suspended: { color: colors.danger, backgroundColor: colors.dangerSoft },
  section: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  caption: { color: colors.inkMuted, fontSize: 12 },
  dataRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm },
  dataLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  dataValue: { color: colors.brand, fontSize: 13, fontWeight: '900' },
  score: { color: colors.brand, fontSize: 19, fontWeight: '900' },
});
