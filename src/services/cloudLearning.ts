import { supabase } from '@/lib/supabase';
import type { ExamResult, QuizQuestion } from '@/types/quiz';

async function hasSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function syncExamResult(result: ExamResult, questions: QuizQuestion[]): Promise<void> {
  if (!(await hasSession())) return;
  const categoryByQuestion = new Map(questions.map((question) => [question.id, question.categoryId]));
  const { error } = await supabase.rpc('record_exam_attempt', {
    client_result_id: result.id,
    exam_mode: result.mode,
    exam_score: result.score,
    total_questions: result.answers.length,
    correct_count: result.correct,
    wrong_count: result.wrong,
    started_at: result.startedAt ?? result.completedAt,
    completed_at: result.completedAt,
    answers: result.answers.map((answer) => ({
      questionId: answer.questionId,
      categoryId: categoryByQuestion.get(answer.questionId) ?? 'unknown',
      selectedAnswer: answer.selectedAnswer,
      isCorrect: answer.isCorrect,
    })),
  });
  if (error) throw error;
}

export async function syncStudyAttempt(
  question: QuizQuestion,
  isCorrect: boolean,
  firstAttempt: boolean,
  studiedAt: string,
): Promise<void> {
  if (!(await hasSession())) return;
  const { error } = await supabase.rpc('record_study_attempt', {
    question_id: question.id,
    category_key: question.categoryId,
    is_correct: isCorrect,
    first_attempt: firstAttempt,
    studied_at: studiedAt,
  });
  if (error) throw error;
}

export async function syncStudySession(startedAt: string): Promise<void> {
  if (!(await hasSession())) return;
  const { error } = await supabase.rpc('begin_study_session', { started_at: startedAt });
  if (error) throw error;
}

export async function syncLearningDuration(seconds: number, recordedAt: string): Promise<void> {
  if (!(await hasSession())) return;
  const { error } = await supabase.rpc('record_learning_duration', {
    duration_seconds: seconds,
    recorded_at: recordedAt,
  });
  if (error) throw error;
}
