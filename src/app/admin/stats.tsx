import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ChoiceChips } from '@/components/ChoiceChips';
import { FormField } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { StatCard } from '@/components/StatCard';
import { colors, radii, spacing } from '@/constants/theme';
import { getCategories } from '@/data/quizRepository';
import { loadExamAnswers, loadExamAttempts, loadProfiles } from '@/services/admin';
import { EMPLOYEE_LEVEL_LABELS, type EmployeeLevel, type ProfileWithBranches } from '@/types/auth';
import type { Tables } from '@/types/database';

type Period = '7' | '30' | '90' | 'all';
type LevelFilter = EmployeeLevel | 'all';

export default function AdminStatsScreen() {
  const [profiles, setProfiles] = useState<ProfileWithBranches[]>([]);
  const [attempts, setAttempts] = useState<Tables<'exam_attempts'>[]>([]);
  const [answers, setAnswers] = useState<Tables<'exam_answers'>[]>([]);
  const [period, setPeriod] = useState<Period>('30');
  const [category, setCategory] = useState<string | null>(null);
  const [level, setLevel] = useState<LevelFilter>('all');
  const [search, setSearch] = useState('');
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, attemptData, answerData] = await Promise.all([loadProfiles(), loadExamAttempts(), loadExamAnswers()]);
      setProfiles(profileData);
      setAttempts(attemptData);
      setAnswers(answerData);
      setLoadedAt(Date.now());
      setError(null);
    } catch { setError('통계를 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const periodAttempts = useMemo(() => {
    const cutoff = period === 'all' || loadedAt === null ? null : loadedAt - Number(period) * 86400000;
    return attempts.filter((attempt) => !cutoff || new Date(attempt.completed_at).getTime() >= cutoff);
  }, [attempts, loadedAt, period]);
  const periodAttemptIds = useMemo(() => new Set(periodAttempts.map((attempt) => attempt.id)), [periodAttempts]);
  const filteredAnswers = useMemo(() => answers.filter((answer) => periodAttemptIds.has(answer.attempt_id)
    && (!category || answer.category_key === category)), [answers, category, periodAttemptIds]);
  const filteredAttempts = useMemo(() => {
    if (!category) return periodAttempts;
    const categoryAttemptIds = new Set(filteredAnswers.map((answer) => answer.attempt_id));
    return periodAttempts.filter((attempt) => categoryAttemptIds.has(attempt.id));
  }, [category, filteredAnswers, periodAttempts]);

  const employeeRows = useMemo(() => profiles
    .filter((profile) => profile.status === 'active' && !profile.is_super_admin)
    .filter((profile) => level === 'all' || profile.employee_level === level)
    .filter((profile) => !search.trim() || profile.name.toLowerCase().includes(search.trim().toLowerCase()))
    .map((profile) => {
      const ownAttempts = filteredAttempts.filter((attempt) => attempt.user_id === profile.id);
      let correct = ownAttempts.reduce((sum, attempt) => sum + attempt.correct_count, 0);
      let wrong = ownAttempts.reduce((sum, attempt) => sum + attempt.wrong_count, 0);
      if (category) {
        const attemptIds = new Set(ownAttempts.map((attempt) => attempt.id));
        const ownAnswers = filteredAnswers.filter((answer) => attemptIds.has(answer.attempt_id));
        correct = ownAnswers.filter((answer) => answer.is_correct).length;
        wrong = ownAnswers.length - correct;
      }
      const average = category
        ? (correct + wrong ? Math.round((correct / (correct + wrong)) * 100) : 0)
        : (ownAttempts.length ? Math.round(ownAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / ownAttempts.length) : 0);
      const answered = correct + wrong;
      return {
        profile,
        attempts: ownAttempts.length,
        correct,
        wrong,
        average,
        wrongRate: answered ? Math.round((wrong / answered) * 100) : 0,
        latest: ownAttempts[0]?.completed_at ?? null,
      };
    }), [category, filteredAnswers, filteredAttempts, level, profiles, search]);

  const activeEmployees = profiles.filter((profile) => profile.status === 'active' && !profile.is_super_admin);
  const pendingEmployees = profiles.filter((profile) => profile.status === 'pending').length;
  const participants = new Set(filteredAttempts.map((attempt) => attempt.user_id)).size;
  const totalAnswers = category
    ? filteredAnswers.length
    : filteredAttempts.reduce((sum, item) => sum + item.total_questions, 0);
  const totalCorrect = category
    ? filteredAnswers.filter((answer) => answer.is_correct).length
    : filteredAttempts.reduce((sum, item) => sum + item.correct_count, 0);
  const totalWrong = totalAnswers - totalCorrect;
  const averageAccuracy = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
  const wrongRate = totalAnswers ? Math.round((totalWrong / totalAnswers) * 100) : 0;
  const averageScore = category
    ? averageAccuracy
    : (filteredAttempts.length ? Math.round(filteredAttempts.reduce((sum, item) => sum + item.score, 0) / filteredAttempts.length) : 0);
  const participationRate = activeEmployees.length ? Math.round((participants / activeEmployees.length) * 100) : 0;
  const selectedCategoryName = category ? getCategories().find((item) => item.id === category)?.name ?? category : '전체 카테고리';
  const rangeLabel = period === 'all' || loadedAt === null
    ? '저장된 전체 완료 기록'
    : `${new Date(loadedAt - Number(period) * 86400000).toLocaleDateString('ko-KR')} ~ ${new Date(loadedAt).toLocaleDateString('ko-KR')}`;
  const branchRows = Array.from(new Map(activeEmployees
    .filter((profile) => profile.branch_id && profile.branch)
    .map((profile) => [profile.branch_id!, profile.branch!])).entries())
    .map(([branchId, branch]) => {
      const employees = activeEmployees.filter((profile) => profile.branch_id === branchId);
      const branchAttempts = filteredAttempts.filter((attempt) => attempt.branch_id_snapshot === branchId);
      const branchAttemptIds = new Set(branchAttempts.map((attempt) => attempt.id));
      const branchAnswers = filteredAnswers.filter((answer) => branchAttemptIds.has(answer.attempt_id));
      const correct = category
        ? branchAnswers.filter((answer) => answer.is_correct).length
        : branchAttempts.reduce((sum, attempt) => sum + attempt.correct_count, 0);
      const total = category ? branchAnswers.length : branchAttempts.reduce((sum, attempt) => sum + attempt.total_questions, 0);
      const average = category
        ? (total ? Math.round((correct / total) * 100) : 0)
        : (branchAttempts.length ? Math.round(branchAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / branchAttempts.length) : 0);
      return { id: branchId, name: branch.name, employees: employees.length, attempts: branchAttempts.length, average, accuracy: total ? Math.round((correct / total) * 100) : 0 };
    });

  if (loading) return <StateView loading title="통계를 계산하고 있습니다" />;
  if (error) return <StateView title={error} />;

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.stats}><StatCard label="전체 직원" value={activeEmployees.length} /><StatCard label="시험 참여" value={participants} /></View>
      <View style={styles.stats}><StatCard label={category ? '선택 정답률' : '평균 점수'} value={`${averageScore}${category ? '%' : '점'}`} /><StatCard label="완료 시험" value={filteredAttempts.length} /></View>
      <View style={styles.stats}><StatCard label="오답률" value={`${wrongRate}%`} /><StatCard label="참여율" value={`${participationRate}%`} /></View>
      {pendingEmployees ? <Text style={styles.pending}>승인 대기 직원 {pendingEmployees}명</Text> : null}

      <View style={styles.scopeCard}>
        <Text style={styles.scopeTitle}>현재 집계 기준</Text>
        <Text style={styles.scopeText}>기간: {rangeLabel}</Text>
        <Text style={styles.scopeText}>기준 시각: 시험 완료 시각(completed_at)</Text>
        <Text style={styles.scopeText}>범위: {selectedCategoryName} · 답변 {totalAnswers}개 (정답 {totalCorrect} / 오답 {totalWrong})</Text>
        <Text style={styles.scopeText}>오답률 = 오답 수 ÷ 전체 답변 수</Text>
      </View>

      <View style={styles.filters}>
        <Text style={styles.filterTitle}>기간</Text>
        <ChoiceChips value={period} options={[{ value: '7', label: '최근 7일' }, { value: '30', label: '최근 30일' }, { value: '90', label: '최근 90일' }, { value: 'all', label: '전체' }]} onChange={setPeriod} />
        <Text style={styles.filterTitle}>카테고리</Text>
        <ChoiceChips
          value={category ?? 'all'}
          options={[{ value: 'all', label: '전체' }, ...getCategories().map((item) => ({ value: item.id, label: item.name }))]}
          onChange={(value) => setCategory(value === 'all' ? null : value)}
        />
        <Text style={styles.filterTitle}>직원 레벨</Text>
        <ChoiceChips
          value={level}
          options={[{ value: 'all', label: '전체' }, ...Object.entries(EMPLOYEE_LEVEL_LABELS).map(([value, label]) => ({ value: value as EmployeeLevel, label }))]}
          onChange={setLevel}
        />
        <FormField label="직원 이름 검색" value={search} onChangeText={setSearch} placeholder="이름" />
      </View>

      {branchRows.length > 1 ? (
        <>
          <Text style={styles.sectionTitle}>지점별 비교</Text>
          <View style={styles.branchGrid}>
            {branchRows.map((branch) => (
              <View key={branch.id} style={styles.branchCard}>
                <Text style={styles.branchName}>{branch.name}</Text>
                <Text style={styles.branchScore}>{branch.average}{category ? '%' : '점'}</Text>
                <Text style={styles.meta}>인원 {branch.employees} · 시험 {branch.attempts}회 · 정답률 {branch.accuracy}%</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>직원별 통계</Text>
      {employeeRows.length === 0 ? <StateView title="조건에 맞는 직원 기록이 없습니다." /> : employeeRows.map((row) => (
        <Pressable
          key={row.profile.id}
          onPress={() => router.push({ pathname: '/admin/employee/[id]', params: { id: row.profile.id } })}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.flex}>
            <Text style={styles.name}>{row.profile.name}</Text>
            <Text style={styles.meta}>{row.profile.branch?.name} · {row.profile.employee_level ? EMPLOYEE_LEVEL_LABELS[row.profile.employee_level] : '-'}</Text>
            <Text style={styles.meta}>시험 {row.attempts}회 · 정답 {row.correct} · 오답 {row.wrong} · 오답률 {row.wrongRate}%</Text>
            <Text style={styles.meta}>최근 완료 {row.latest ? new Date(row.latest).toLocaleString('ko-KR') : '기록 없음'}</Text>
          </View>
          <Text style={styles.score}>{row.average}{category ? '%' : '점'}</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>최근 시험 현황</Text>
      {filteredAttempts.slice(0, 5).length === 0 ? <StateView title="최근 시험 기록이 없습니다." /> : filteredAttempts.slice(0, 5).map((attempt) => {
        const employee = profiles.find((profile) => profile.id === attempt.user_id);
        return (
          <View key={attempt.id} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.name}>{employee?.name ?? '직원'}</Text>
              <Text style={styles.meta}>{new Date(attempt.completed_at).toLocaleString('ko-KR')} · 정답 {attempt.correct_count} / {attempt.total_questions}</Text>
            </View>
            <Text style={styles.score}>{attempt.score}점</Text>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  stats: { flexDirection: 'row', gap: spacing.sm },
  filters: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm },
  filterTitle: { color: colors.ink, fontSize: 13, fontWeight: '900', marginTop: spacing.xs },
  pending: { color: '#8B4AA8', backgroundColor: '#F3E8F7', borderRadius: radii.md, padding: spacing.sm, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  scopeCard: { backgroundColor: '#F4EFEA', borderRadius: radii.lg, padding: spacing.md, gap: 5 },
  scopeTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  scopeText: { color: colors.inkMuted, fontSize: 11, lineHeight: 17 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  branchGrid: { gap: spacing.sm },
  branchCard: { backgroundColor: colors.ink, borderRadius: radii.md, padding: spacing.md, gap: 3 },
  branchName: { color: colors.white, fontSize: 15, fontWeight: '900' },
  branchScore: { color: '#F09A94', fontSize: 24, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md },
  flex: { flex: 1, gap: 3 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  meta: { color: colors.inkMuted, fontSize: 11 },
  score: { color: colors.brand, fontSize: 22, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
