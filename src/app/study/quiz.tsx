import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/components/AppButton';
import { OptionCard } from '@/components/OptionCard';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { getCategory, getQuestions, getQuestionsInOrder } from '@/data/quizRepository';
import { useLearningTimer } from '@/hooks/useLearningTimer';
import { beginStudySession, recordStudyAttempt } from '@/storage/learningRecords';

type StudyParams = {
  categoryId?: string;
  subcategory?: string;
  questionIds?: string;
};

export default function StudyQuizScreen() {
  const params = useLocalSearchParams<StudyParams>();
  const questions = useMemo(() => {
    if (params.questionIds) return getQuestionsInOrder(params.questionIds.split(',').filter(Boolean));
    return getQuestions({ categoryId: params.categoryId, subcategory: params.subcategory });
  }, [params.categoryId, params.questionIds, params.subcategory]);
  const scopeName = params.subcategory
    ?? (params.categoryId ? getCategory(params.categoryId)?.name : undefined)
    ?? (params.questionIds ? '오답 집중 학습' : '전체 학습');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongOptions, setWrongOptions] = useState<Set<number>>(new Set());
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const visitedQuestions = useRef(new Set<string>());
  const startedSession = useRef(false);
  useLearningTimer(questions.length > 0);

  useEffect(() => {
    if (questions.length > 0 && !startedSession.current) {
      startedSession.current = true;
      void beginStudySession();
    }
  }, [questions.length]);

  const question = questions[currentIndex];

  if (!question) {
    return (
      <Screen contentContainerStyle={styles.empty}>
        <Ionicons name="file-tray-outline" size={44} color={colors.inkMuted} />
        <Text style={styles.emptyTitle}>학습할 문제가 없습니다.</Text>
        <AppButton label="돌아가기" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const selectOption = async (optionIndex: number) => {
    if (answeredCorrectly || wrongOptions.has(optionIndex) || saving) return;
    const isCorrect = optionIndex === question.correctAnswer;
    const isFirstAttempt = !visitedQuestions.current.has(question.id);
    visitedQuestions.current.add(question.id);
    setSaving(true);
    try {
      await recordStudyAttempt(question, isCorrect, isFirstAttempt);
      if (isCorrect) {
        setAnsweredCorrectly(true);
        setCorrectAttempts((value) => value + 1);
      } else {
        setWrongOptions((current) => new Set(current).add(optionIndex));
        setWrongAttempts((value) => value + 1);
      }
    } finally {
      setSaving(false);
    }
  };

  const nextQuestion = () => {
    if (!answeredCorrectly) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((value) => value + 1);
      setWrongOptions(new Set());
      setAnsweredCorrectly(false);
      return;
    }

    router.replace({
      pathname: '/study/result',
      params: {
        scopeName,
        total: String(questions.length),
        correct: String(correctAttempts),
        wrong: String(wrongAttempts),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.subcategory ? { subcategory: params.subcategory } : {}),
        ...(params.questionIds ? { questionIds: params.questionIds } : {}),
      },
    });
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.progressHeader}>
        <View>
          <Text style={styles.scope}>{question.subcategory || scopeName}</Text>
          <Text style={styles.progressText}>{currentIndex + 1} / {questions.length}</Text>
        </View>
        <Text style={styles.wrongCounter}>오답 {wrongAttempts}</Text>
      </View>
      <ProgressBar value={(currentIndex + (answeredCorrectly ? 1 : 0)) / questions.length} />

      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>QUESTION {String(currentIndex + 1).padStart(2, '0')}</Text>
        <Text style={styles.question}>{question.question}</Text>
      </View>

      <View style={styles.options}>
        {question.options.map((option, optionIndex) => {
          const isWrong = wrongOptions.has(optionIndex);
          const isCorrect = answeredCorrectly && optionIndex === question.correctAnswer;
          return (
            <OptionCard
              key={`${question.id}-${optionIndex}`}
              index={optionIndex}
              label={option}
              state={isCorrect ? 'correct' : isWrong ? 'wrong' : 'default'}
              disabled={saving || answeredCorrectly || isWrong}
              onPress={() => void selectOption(optionIndex)}
            />
          );
        })}
      </View>

      {wrongOptions.size > 0 && !answeredCorrectly ? (
        <View style={[styles.feedback, styles.wrongFeedback]}>
          <Ionicons name="refresh-circle" size={23} color={colors.danger} />
          <Text style={[styles.feedbackText, styles.wrongText]}>틀렸습니다. 다시 선택해주세요.</Text>
        </View>
      ) : null}

      {answeredCorrectly ? (
        <View style={[styles.feedback, styles.correctFeedback]}>
          <Ionicons name="checkmark-circle" size={23} color={colors.success} />
          <View style={styles.feedbackCopy}>
            <Text style={[styles.feedbackText, styles.correctText]}>정답입니다.</Text>
            <Text style={styles.explanation}>{question.explanation}</Text>
          </View>
        </View>
      ) : null}

      <AppButton
        label={currentIndex === questions.length - 1 ? '학습 결과 보기' : '다음 문제'}
        icon="arrow-forward"
        disabled={!answeredCorrectly}
        onPress={nextQuestion}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  scope: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  progressText: { color: colors.inkMuted, fontSize: 14, fontWeight: '700', marginTop: 4 },
  wrongCounter: { color: colors.danger, backgroundColor: colors.dangerSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, fontSize: 13, fontWeight: '800' },
  questionCard: { minHeight: 142, backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.lg, justifyContent: 'center', gap: spacing.sm },
  questionLabel: { color: '#F09A94', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  question: { color: colors.white, fontSize: 22, fontWeight: '900', lineHeight: 31, letterSpacing: -0.4 },
  options: { gap: spacing.sm },
  feedback: { borderRadius: radii.md, borderWidth: 1, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  wrongFeedback: { backgroundColor: colors.dangerSoft, borderColor: '#F3C2BE' },
  correctFeedback: { backgroundColor: colors.successSoft, borderColor: '#BEE3CF' },
  feedbackCopy: { flex: 1, gap: 5 },
  feedbackText: { fontSize: 15, fontWeight: '900', lineHeight: 21 },
  wrongText: { color: colors.danger },
  correctText: { color: colors.success },
  explanation: { color: colors.ink, fontSize: 14, lineHeight: 21 },
});
