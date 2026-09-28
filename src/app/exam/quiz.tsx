import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/components/AppButton';
import { OptionCard } from '@/components/OptionCard';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { getQuestionsInOrder } from '@/data/quizRepository';
import { useLearningTimer } from '@/hooks/useLearningTimer';
import { saveExamResult } from '@/storage/learningRecords';
import type { ExamMode } from '@/types/quiz';
import { createExamResult } from '@/utils/quiz';

type ExamQuizParams = {
  mode?: ExamMode;
  questionIds?: string;
};

export default function ExamQuizScreen() {
  const { mode = 'all', questionIds = '' } = useLocalSearchParams<ExamQuizParams>();
  const questions = useMemo(() => getQuestionsInOrder(questionIds.split(',').filter(Boolean)), [questionIds]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  useLearningTimer(questions.length > 0);
  const question = questions[currentIndex];
  const selectedAnswer = question ? answers[question.id] : undefined;

  if (!question) {
    return (
      <Screen contentContainerStyle={styles.empty}>
        <Ionicons name="file-tray-outline" size={44} color={colors.inkMuted} />
        <Text style={styles.emptyTitle}>시험 문제가 없습니다.</Text>
        <AppButton label="시험 설정으로" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const selectOption = (optionIndex: number) => {
    if (selectedAnswer !== undefined) return;
    setAnswers((current) => ({ ...current, [question.id]: optionIndex }));
  };

  const next = async () => {
    if (selectedAnswer === undefined || submitting) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((value) => value + 1);
      return;
    }

    setSubmitting(true);
    try {
      const result = createExamResult(questions, answers, mode);
      await saveExamResult(result, questions);
      router.replace({ pathname: '/exam/result', params: { resultId: result.id } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.progressHeader}>
        <Text style={styles.mode}>실전 시험</Text>
        <Text style={styles.progressText}>{currentIndex + 1} / {questions.length}</Text>
      </View>
      <ProgressBar value={(currentIndex + (selectedAnswer !== undefined ? 1 : 0)) / questions.length} />

      <View style={styles.ruleNotice}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />
        <Text style={styles.ruleText}>답을 선택하면 변경할 수 없습니다.</Text>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>{question.subcategory}</Text>
        <Text style={styles.question}>{question.question}</Text>
      </View>

      <View style={styles.options}>
        {question.options.map((option, optionIndex) => (
          <OptionCard
            key={`${question.id}-${optionIndex}`}
            index={optionIndex}
            label={option}
            state={selectedAnswer === optionIndex ? 'selected' : 'default'}
            disabled={selectedAnswer !== undefined}
            onPress={() => selectOption(optionIndex)}
          />
        ))}
      </View>

      {selectedAnswer !== undefined ? (
        <View style={styles.lockedNotice}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.ink} />
          <Text style={styles.lockedText}>답변이 저장되었습니다. 결과는 시험 종료 후 확인합니다.</Text>
        </View>
      ) : null}

      <AppButton
        label={currentIndex === questions.length - 1 ? '시험 제출' : '다음 문제'}
        icon={currentIndex === questions.length - 1 ? 'send' : 'arrow-forward'}
        disabled={selectedAnswer === undefined}
        loading={submitting}
        onPress={() => void next()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mode: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  progressText: { color: colors.inkMuted, fontSize: 14, fontWeight: '800' },
  ruleNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surfaceMuted, padding: spacing.sm, borderRadius: radii.sm },
  ruleText: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  questionCard: { minHeight: 150, borderRadius: radii.lg, backgroundColor: colors.ink, padding: spacing.lg, justifyContent: 'center', gap: spacing.sm },
  questionLabel: { color: '#F09A94', fontSize: 12, fontWeight: '900' },
  question: { color: colors.white, fontSize: 22, fontWeight: '900', lineHeight: 31 },
  options: { gap: spacing.sm },
  lockedNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  lockedText: { flex: 1, color: colors.inkMuted, fontSize: 13, lineHeight: 19 },
});
