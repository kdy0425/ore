import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/components/AppButton';
import { Screen } from '@/components/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { getQuestion } from '@/data/quizRepository';
import { useLearningRecords } from '@/hooks/useLearningRecords';

export default function ExamReviewScreen() {
  const { resultId = '', questionId = '' } = useLocalSearchParams<{ resultId: string; questionId: string }>();
  const { records, loading } = useLearningRecords();
  const result = records.examHistory.find((item) => item.id === resultId);
  const answer = result?.answers.find((item) => item.questionId === questionId);
  const question = getQuestion(questionId);

  if (loading) return <Screen><Text style={styles.loading}>오답을 불러오는 중...</Text></Screen>;
  if (!question || !answer) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <Text style={styles.missing}>오답 정보를 찾을 수 없습니다.</Text>
        <AppButton label="돌아가기" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.questionCard}>
        <Text style={styles.subcategory}>{question.subcategory}</Text>
        <Text style={styles.question}>{question.question}</Text>
      </View>

      <View style={styles.answerCard}>
        <View style={styles.answerRow}>
          <View style={[styles.answerIcon, styles.wrongIcon]}><Ionicons name="close" size={18} color={colors.white} /></View>
          <View style={styles.answerCopy}>
            <Text style={styles.answerLabel}>내가 선택한 답</Text>
            <Text style={[styles.answerValue, styles.wrongValue]}>{question.options[answer.selectedAnswer]}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.answerRow}>
          <View style={[styles.answerIcon, styles.correctIcon]}><Ionicons name="checkmark" size={18} color={colors.white} /></View>
          <View style={styles.answerCopy}>
            <Text style={styles.answerLabel}>실제 정답</Text>
            <Text style={[styles.answerValue, styles.correctValue]}>{question.options[question.correctAnswer]}</Text>
          </View>
        </View>
      </View>

      <View style={styles.explanationCard}>
        <View style={styles.explanationTitleRow}>
          <Ionicons name="bulb-outline" size={22} color={colors.warning} />
          <Text style={styles.explanationTitle}>해설</Text>
        </View>
        <Text style={styles.explanation}>{question.explanation}</Text>
      </View>

      <AppButton
        label="이 문제 다시 공부하기"
        icon="refresh"
        onPress={() => router.push({ pathname: '/study/quiz', params: { questionIds: question.id } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loading: { color: colors.inkMuted },
  missing: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  questionCard: { backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  subcategory: { color: '#F09A94', fontSize: 12, fontWeight: '900' },
  question: { color: colors.white, fontSize: 22, lineHeight: 31, fontWeight: '900' },
  answerCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: spacing.md },
  answerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  answerIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  wrongIcon: { backgroundColor: colors.danger },
  correctIcon: { backgroundColor: colors.success },
  answerCopy: { flex: 1, gap: 3 },
  answerLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  answerValue: { fontSize: 16, fontWeight: '900' },
  wrongValue: { color: colors.danger },
  correctValue: { color: colors.success },
  divider: { height: 1, backgroundColor: colors.border },
  explanationCard: { backgroundColor: '#FFF7E7', borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  explanationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  explanationTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  explanation: { color: colors.ink, fontSize: 14, lineHeight: 22 },
});
