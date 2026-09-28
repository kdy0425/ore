import type { ExamAnswer, ExamCategoryResult, QuizQuestion } from '@/types/quiz';

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export function calculateAccuracy(correct: number, wrong: number): number {
  const total = correct + wrong;
  return total === 0 ? 0 : (correct / total) * 100;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function createExamResult(
  questions: QuizQuestion[],
  selectedAnswers: Record<string, number>,
  mode: 'all' | 'category' | 'wrong',
) {
  const answers: ExamAnswer[] = questions.map((question) => ({
    questionId: question.id,
    selectedAnswer: selectedAnswers[question.id],
    isCorrect: selectedAnswers[question.id] === question.correctAnswer,
  }));
  const correct = answers.filter((answer) => answer.isCorrect).length;

  const categoryMap = new Map<string, ExamCategoryResult>();
  questions.forEach((question, index) => {
    const current = categoryMap.get(question.categoryId) ?? {
      categoryId: question.categoryId,
      correct: 0,
      total: 0,
    };
    current.total += 1;
    if (answers[index].isCorrect) current.correct += 1;
    categoryMap.set(question.categoryId, current);
  });

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    completedAt: new Date().toISOString(),
    mode,
    answers,
    correct,
    wrong: answers.length - correct,
    score: answers.length === 0 ? 0 : Math.round((correct / answers.length) * 100),
    categoryResults: [...categoryMap.values()],
  };
}
