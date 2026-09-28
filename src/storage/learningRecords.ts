import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LearningRecords } from '@/types/records';
import type { ExamResult, QuizQuestion } from '@/types/quiz';
import {
  syncExamResult,
  syncLearningDuration,
  syncStudyAttempt,
  syncStudySession,
} from '@/services/cloudLearning';

const STORAGE_KEY = '@oreno/learning-records/v1';
const MAX_EXAM_HISTORY = 20;

export const EMPTY_LEARNING_RECORDS: LearningRecords = {
  version: 1,
  totals: {
    studySessions: 0,
    examSessions: 0,
    correctCount: 0,
    wrongCount: 0,
    lastStudiedAt: null,
  },
  questions: {},
  categories: {},
  dailyActivity: {},
  examHistory: [],
};

function createEmptyRecords(): LearningRecords {
  return {
    version: 1,
    totals: { ...EMPTY_LEARNING_RECORDS.totals },
    questions: {},
    categories: {},
    dailyActivity: {},
    examHistory: [],
  };
}

let mutationQueue: Promise<unknown> = Promise.resolve();

function normalizeRecords(value: Partial<LearningRecords> | null): LearningRecords {
  if (!value) return createEmptyRecords();

  return {
    version: 1,
    totals: { ...EMPTY_LEARNING_RECORDS.totals, ...value.totals },
    questions: value.questions ?? {},
    categories: value.categories ?? {},
    dailyActivity: value.dailyActivity ?? {},
    examHistory: Array.isArray(value.examHistory) ? value.examHistory : [],
  };
}

export async function loadLearningRecords(): Promise<LearningRecords> {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
  if (!storedValue) return normalizeRecords(null);

  try {
    return normalizeRecords(JSON.parse(storedValue) as LearningRecords);
  } catch {
    return normalizeRecords(null);
  }
}

function mutateRecords(mutator: (records: LearningRecords) => void): Promise<LearningRecords> {
  const operation = mutationQueue.then(async () => {
    const records = await loadLearningRecords();
    mutator(records);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return records;
  });
  mutationQueue = operation.catch(() => undefined);
  return operation;
}

export async function beginStudySession(): Promise<LearningRecords> {
  const now = new Date().toISOString();
  const records = await mutateRecords((current) => {
    current.totals.studySessions += 1;
    current.totals.lastStudiedAt = now;
  });
  void syncStudySession(now).catch((error) => console.warn('Supabase study session sync failed', error));
  return records;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function recordLearningDuration(seconds: number, recordedAt = new Date()): Promise<LearningRecords> {
  const wholeSeconds = Math.floor(seconds);
  if (wholeSeconds <= 0) return loadLearningRecords();

  const records = await mutateRecords((current) => {
    const dateKey = toLocalDateKey(recordedAt);
    current.dailyActivity[dateKey] = (current.dailyActivity[dateKey] ?? 0) + wholeSeconds;
    current.totals.lastStudiedAt = recordedAt.toISOString();
  });
  void syncLearningDuration(wholeSeconds, recordedAt.toISOString())
    .catch((error) => console.warn('Supabase learning duration sync failed', error));
  return records;
}

export async function recordStudyAttempt(
  question: QuizQuestion,
  isCorrect: boolean,
  firstAttemptForQuestion: boolean,
): Promise<LearningRecords> {
  const now = new Date().toISOString();
  const records = await mutateRecords((current) => {
    const questionRecord = current.questions[question.id] ?? {
      questionId: question.id,
      correctCount: 0,
      wrongCount: 0,
      studyCount: 0,
      lastStudiedAt: now,
    };
    const categoryRecord = current.categories[question.categoryId] ?? {
      categoryId: question.categoryId,
      correctCount: 0,
      wrongCount: 0,
      lastStudiedAt: now,
    };

    if (isCorrect) {
      current.totals.correctCount += 1;
      questionRecord.correctCount += 1;
      categoryRecord.correctCount += 1;
    } else {
      current.totals.wrongCount += 1;
      questionRecord.wrongCount += 1;
      categoryRecord.wrongCount += 1;
    }

    if (firstAttemptForQuestion) questionRecord.studyCount += 1;
    questionRecord.lastStudiedAt = now;
    categoryRecord.lastStudiedAt = now;
    current.totals.lastStudiedAt = now;
    current.questions[question.id] = questionRecord;
    current.categories[question.categoryId] = categoryRecord;
  });
  void syncStudyAttempt(question, isCorrect, firstAttemptForQuestion, now)
    .catch((error) => console.warn('Supabase study attempt sync failed', error));
  return records;
}

export async function saveExamResult(result: ExamResult, questions: QuizQuestion[]): Promise<LearningRecords> {
  const records = await mutateRecords((current) => {
    const now = result.completedAt;
    current.totals.examSessions += 1;
    current.totals.correctCount += result.correct;
    current.totals.wrongCount += result.wrong;
    current.totals.lastStudiedAt = now;

    const questionMap = new Map(questions.map((question) => [question.id, question]));
    result.answers.forEach((answer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) return;
      const questionRecord = current.questions[question.id] ?? {
        questionId: question.id,
        correctCount: 0,
        wrongCount: 0,
        studyCount: 0,
        lastStudiedAt: now,
      };
      const categoryRecord = current.categories[question.categoryId] ?? {
        categoryId: question.categoryId,
        correctCount: 0,
        wrongCount: 0,
        lastStudiedAt: now,
      };

      if (answer.isCorrect) {
        questionRecord.correctCount += 1;
        categoryRecord.correctCount += 1;
      } else {
        questionRecord.wrongCount += 1;
        categoryRecord.wrongCount += 1;
      }
      questionRecord.lastStudiedAt = now;
      categoryRecord.lastStudiedAt = now;
      current.questions[question.id] = questionRecord;
      current.categories[question.categoryId] = categoryRecord;
    });

    current.examHistory = [result, ...current.examHistory.filter((item) => item.id !== result.id)].slice(
      0,
      MAX_EXAM_HISTORY,
    );
  });
  void syncExamResult(result, questions).catch((error) => console.warn('Supabase exam sync failed', error));
  return records;
}

export async function clearLearningRecords(): Promise<void> {
  mutationQueue = mutationQueue.then(() => AsyncStorage.removeItem(STORAGE_KEY));
  await mutationQueue;
}
