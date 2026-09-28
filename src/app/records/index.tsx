import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/components/AppButton';
import { Screen } from '@/components/Screen';
import { SectionTitle } from '@/components/SectionTitle';
import { StatCard } from '@/components/StatCard';
import { colors, radii, spacing } from '@/constants/theme';
import { getCategories, getQuestion } from '@/data/quizRepository';
import { useLearningRecords } from '@/hooks/useLearningRecords';
import { clearLearningRecords } from '@/storage/learningRecords';
import { addDays, formatLearningMinutes, formatWeekRange, getWeekDays, startOfWeek, toLocalDateKey } from '@/utils/date';
import { calculateAccuracy, formatPercent } from '@/utils/quiz';

function formatDate(value: string | null): string {
  if (!value) return '아직 기록 없음';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function RecordsScreen() {
  const { records, loading, refresh } = useLearningRecords();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const totals = records.totals;
  const categories = getCategories();
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const currentWeekKey = toLocalDateKey(startOfWeek(new Date()));
  const isCurrentWeek = toLocalDateKey(weekStart) === currentWeekKey;
  const weeklySeconds = weekDays.reduce((sum, day) => sum + (records.dailyActivity[day.key] ?? 0), 0);
  const studiedDays = weekDays.filter((day) => (records.dailyActivity[day.key] ?? 0) > 0).length;
  const frequentWrong = Object.values(records.questions)
    .filter((record) => record.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount || b.correctCount - a.correctCount)
    .slice(0, 10);

  const confirmReset = () => {
    Alert.alert(
      '학습 기록 초기화',
      '모든 학습 및 시험 기록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: () => {
            void clearLearningRecords().then(refresh);
          },
        },
      ],
    );
  };

  if (loading) {
    return <Screen><Text style={styles.loading}>학습 기록을 불러오는 중...</Text></Screen>;
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <SectionTitle title="학습 리포트" caption={`마지막 학습 ${formatDate(totals.lastStudiedAt)}`} />
      <Text style={styles.recordScope}>전체 정답률과 카테고리 기록은 이 계정에서 저장된 누적 기록이며, 주간 학습은 아래에 표시된 월~일 기간만 반영합니다.</Text>

      <View style={styles.weekCard}>
        <View style={styles.weekNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 주"
            onPress={() => setWeekStart((date) => addDays(date, -7))}
            style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <View style={styles.weekHeading}>
            <Text style={styles.weekRange}>{formatWeekRange(weekStart)}</Text>
            <Text style={styles.weekTotal}>총 {formatLearningMinutes(weeklySeconds)} · 학습 {studiedDays}일</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 주"
            disabled={isCurrentWeek}
            onPress={() => setWeekStart((date) => addDays(date, 7))}
            style={({ pressed }) => [styles.arrowButton, isCurrentWeek && styles.arrowDisabled, pressed && !isCurrentWeek && styles.pressed]}
          >
            <Ionicons name="chevron-forward" size={22} color={isCurrentWeek ? colors.border : colors.ink} />
          </Pressable>
        </View>

        <View style={styles.weekDays}>
          {weekDays.map((day) => {
            const seconds = records.dailyActivity[day.key] ?? 0;
            const studied = seconds > 0;
            const today = day.key === toLocalDateKey(new Date());
            return (
              <View key={day.key} style={[styles.dayCell, studied && styles.dayCellStudied]}>
                <Text style={[styles.dayLabel, studied && styles.dayLabelStudied]}>{day.dayLabel}</Text>
                <View style={[styles.dayNumber, studied && styles.dayNumberStudied, today && styles.dayNumberToday]}>
                  <Text style={[styles.dayNumberText, studied && styles.dayNumberTextStudied]}>{day.dayNumber}</Text>
                </View>
                <Text style={[styles.dayDuration, studied && styles.dayDurationStudied]}>
                  {studied ? formatLearningMinutes(seconds) : '—'}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendDotStudied]} /><Text style={styles.legendText}>학습한 날</Text></View>
          <View style={styles.legendItem}><View style={styles.legendDot} /><Text style={styles.legendText}>학습하지 않은 날</Text></View>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>전체 정답률</Text>
        <Text style={styles.summaryValue}>{formatPercent(calculateAccuracy(totals.correctCount, totals.wrongCount))}</Text>
        <View style={styles.summaryMeta}>
          <Text style={styles.summaryMetaText}>누적 정답 {totals.correctCount}</Text>
          <View style={styles.dot} />
          <Text style={styles.summaryMetaText}>누적 오답 {totals.wrongCount}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <StatCard label="총 학습 횟수" value={totals.studySessions} />
        <StatCard label="총 시험 횟수" value={totals.examSessions} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>카테고리별 기록</Text>
        <View style={styles.categoryList}>
          {categories.map((category) => {
            const record = records.categories[category.id];
            const correct = record?.correctCount ?? 0;
            const wrong = record?.wrongCount ?? 0;
            const accuracy = calculateAccuracy(correct, wrong);
            return (
              <View key={category.id} style={styles.categoryRow}>
                <View style={styles.categoryTop}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryPercent}>{formatPercent(accuracy)}</Text>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${accuracy}%` }]} /></View>
                <Text style={styles.categoryMeta}>정답 {correct} · 오답 {wrong}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>자주 틀리는 문제</Text>
          <Text style={styles.sectionCaption}>최대 10개</Text>
        </View>
        {frequentWrong.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="leaf-outline" size={28} color={colors.success} />
            <Text style={styles.emptyTitle}>아직 오답 기록이 없습니다.</Text>
            <Text style={styles.emptyCopy}>공부나 시험을 시작하면 이곳에 취약 문제가 모입니다.</Text>
          </View>
        ) : (
          <View style={styles.wrongList}>
            {frequentWrong.map((record, index) => {
              const question = getQuestion(record.questionId);
              if (!question) return null;
              return (
                <Pressable
                  key={record.questionId}
                  onPress={() => router.push({ pathname: '/study/quiz', params: { questionIds: question.id } })}
                  style={({ pressed }) => [styles.wrongRow, pressed && styles.pressed]}
                >
                  <Text style={styles.rank}>{index + 1}</Text>
                  <View style={styles.wrongCopy}>
                    <Text style={styles.wrongQuestion} numberOfLines={2}>{question.question}</Text>
                    <Text style={styles.wrongMeta}>오답 {record.wrongCount}회 · 정답 {record.correctCount}회 · 학습 {record.studyCount}회</Text>
                  </View>
                  <Ionicons name="play-circle-outline" size={24} color={colors.brand} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.resetSection}>
        <Text style={styles.resetTitle}>기록 관리</Text>
        <Text style={styles.resetCopy}>초기화한 기록은 복구할 수 없습니다.</Text>
        <AppButton label="학습 기록 초기화" variant="danger" icon="trash-outline" onPress={confirmReset} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  loading: { color: colors.inkMuted },
  recordScope: { color: colors.inkMuted, backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: spacing.sm, fontSize: 11, lineHeight: 17 },
  summaryCard: { backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  summaryLabel: { color: '#C8C3BD', fontSize: 13, fontWeight: '700' },
  summaryValue: { color: colors.white, fontSize: 48, fontWeight: '900', letterSpacing: -1.5 },
  summaryMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryMetaText: { color: '#D8D4CF', fontSize: 12 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#77716B' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  weekCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrowButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  arrowDisabled: { opacity: 0.45 },
  weekHeading: { flex: 1, alignItems: 'center', gap: 3 },
  weekRange: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  weekTotal: { color: colors.brand, fontSize: 12, fontWeight: '800' },
  weekDays: { flexDirection: 'row', gap: 4 },
  dayCell: { flex: 1, minHeight: 92, borderRadius: 13, backgroundColor: colors.surfaceMuted, alignItems: 'center', paddingVertical: spacing.sm, gap: 7 },
  dayCellStudied: { backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: '#F3C5C1' },
  dayLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '800' },
  dayLabelStudied: { color: colors.brandDark },
  dayNumber: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayNumberStudied: { backgroundColor: colors.brand },
  dayNumberToday: { borderWidth: 1.5, borderColor: colors.brand },
  dayNumberText: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  dayNumberTextStudied: { color: colors.white },
  dayDuration: { color: colors.inkMuted, fontSize: 9, fontWeight: '700' },
  dayDurationStudied: { color: colors.brandDark },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  legendDotStudied: { backgroundColor: colors.brand, borderColor: colors.brand },
  legendText: { color: colors.inkMuted, fontSize: 10 },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionCaption: { color: colors.inkMuted, fontSize: 12 },
  categoryList: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  categoryRow: { gap: spacing.xs },
  categoryTop: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  categoryPercent: { color: colors.brand, fontSize: 14, fontWeight: '900' },
  track: { height: 6, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.brand, borderRadius: radii.pill },
  categoryMeta: { color: colors.inkMuted, fontSize: 11 },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  emptyCopy: { color: colors.inkMuted, fontSize: 12, textAlign: 'center' },
  wrongList: { gap: spacing.sm },
  wrongRow: { minHeight: 80, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rank: { width: 30, height: 30, borderRadius: 15, color: colors.brand, backgroundColor: colors.brandSoft, lineHeight: 30, textAlign: 'center', fontWeight: '900' },
  wrongCopy: { flex: 1, gap: 5 },
  wrongQuestion: { color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  wrongMeta: { color: colors.inkMuted, fontSize: 11 },
  resetSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg, gap: spacing.sm },
  resetTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  resetCopy: { color: colors.inkMuted, fontSize: 12, marginBottom: spacing.xs },
  pressed: { opacity: 0.74 },
});
