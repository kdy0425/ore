import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/components/AppButton';
import { Screen } from '@/components/Screen';
import { StatCard } from '@/components/StatCard';
import { colors, radii, spacing } from '@/constants/theme';
import { getCategory, getQuestion } from '@/data/quizRepository';
import { useLearningRecords } from '@/hooks/useLearningRecords';

export default function ExamResultScreen() {
  const { resultId = '' } = useLocalSearchParams<{ resultId: string }>();
  const { records, loading } = useLearningRecords();
  const result = records.examHistory.find((item) => item.id === resultId);

  if (loading) {
    return <Screen contentContainerStyle={styles.center}><Text style={styles.loading}>결과를 불러오는 중...</Text></Screen>;
  }

  if (!result) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.inkMuted} />
        <Text style={styles.missing}>시험 결과를 찾을 수 없습니다.</Text>
        <AppButton label="메인으로" variant="secondary" onPress={() => router.dismissAll()} />
      </Screen>
    );
  }

  const wrongAnswers = result.answers.filter((answer) => !answer.isCorrect);

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>EXAM RESULT</Text>
        <Text style={styles.score}>{result.score}<Text style={styles.scoreUnit}>점</Text></Text>
        <Text style={styles.summary}>{result.answers.length}문제 중 {result.correct}문제를 맞혔습니다.</Text>
      </View>

      <View style={styles.stats}>
        <StatCard label="정답" value={result.correct} accent />
        <StatCard label="오답" value={result.wrong} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>카테고리별 결과</Text>
        <View style={styles.breakdownList}>
          {result.categoryResults.map((item) => {
            const percent = item.total === 0 ? 0 : Math.round((item.correct / item.total) * 100);
            return (
              <View key={item.categoryId} style={styles.breakdownRow}>
                <View style={styles.breakdownTop}>
                  <Text style={styles.breakdownName}>{getCategory(item.categoryId)?.name ?? item.categoryId}</Text>
                  <Text style={styles.breakdownPercent}>{percent}%</Text>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${percent}%` }]} /></View>
                <Text style={styles.breakdownCount}>{item.correct} / {item.total} 정답</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>틀린 문제 {wrongAnswers.length}</Text>
        {wrongAnswers.length === 0 ? (
          <View style={styles.perfect}>
            <Ionicons name="sparkles" size={24} color={colors.success} />
            <Text style={styles.perfectText}>모든 문제를 맞혔습니다!</Text>
          </View>
        ) : (
          <View style={styles.wrongList}>
            {wrongAnswers.map((answer, index) => {
              const question = getQuestion(answer.questionId);
              if (!question) return null;
              return (
                <Pressable
                  key={answer.questionId}
                  onPress={() => router.push({ pathname: '/exam/review', params: { resultId, questionId: answer.questionId } })}
                  style={({ pressed }) => [styles.wrongRow, pressed && styles.pressed]}
                >
                  <Text style={styles.wrongNumber}>{index + 1}</Text>
                  <View style={styles.wrongCopy}>
                    <Text style={styles.wrongQuestion} numberOfLines={2}>{question.question}</Text>
                    <Text style={styles.wrongMeta}>{question.subcategory}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {wrongAnswers.length > 0 ? (
          <AppButton
            label="오답 다시 공부하기"
            icon="refresh"
            onPress={() => router.push({
              pathname: '/study/quiz',
              params: { questionIds: wrongAnswers.map((answer) => answer.questionId).join(',') },
            })}
          />
        ) : null}
        <AppButton label="메인으로" variant="secondary" icon="home-outline" onPress={() => router.dismissAll()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loading: { color: colors.inkMuted, fontSize: 15 },
  missing: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  hero: { backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  eyebrow: { color: '#F09A94', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  score: { color: colors.white, fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  scoreUnit: { fontSize: 22 },
  summary: { color: '#D2CEC9', fontSize: 14 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  breakdownList: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  breakdownRow: { gap: spacing.xs },
  breakdownTop: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  breakdownPercent: { color: colors.brand, fontSize: 14, fontWeight: '900' },
  track: { height: 6, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.brand, borderRadius: radii.pill },
  breakdownCount: { color: colors.inkMuted, fontSize: 11 },
  perfect: { backgroundColor: colors.successSoft, borderRadius: radii.md, padding: spacing.lg, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  perfectText: { color: colors.success, fontWeight: '900' },
  wrongList: { gap: spacing.sm },
  wrongRow: { minHeight: 76, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wrongNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.dangerSoft, color: colors.danger, textAlign: 'center', lineHeight: 30, fontWeight: '900' },
  wrongCopy: { flex: 1, gap: 4 },
  wrongQuestion: { color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  wrongMeta: { color: colors.inkMuted, fontSize: 12 },
  actions: { gap: spacing.sm },
  pressed: { opacity: 0.74 },
});
