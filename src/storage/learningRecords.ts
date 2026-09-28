import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LearningRecords } from '@/types/records';
import type { ExamResult, QuizQuestion } from '@/types/quiz';

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

export function beginStudySession(): Promise<LearningRecords> {
  return mutateRecords((records) => {
    const now = new Date().toISOString();
    records.totals.studySessions += 1;
    records.totals.lastStudiedAt = now;
  });
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function recordLearningDuration(seconds: number, recordedAt = new Date()): Promise<LearningRecords> {
  const wholeSeconds = Math.floor(seconds);
  if (wholeSeconds <= 0) return loadLearningRecords();

  return mutateRecords((records) => {
    const dateKey = toLocalDateKey(recordedAt);
    records.dailyActivity[dateKey] = (records.dailyActivity[dateKey] ?? 0) + wholeSeconds;
    records.totals.lastStudiedAt = recordedAt.toISOString();
  });
}

export function recordStudyAttempt(
  question: QuizQuestion,
  isCorrect: boolean,
  firstAttemptForQuestion: boolean,
): Promise<LearningRecords> {
  return mutateRecords((records) => {
    const now = new Date().toISOString();
    const questionRecord = records.questions[question.id] ?? {
      questionId: question.id,
      correctCount: 0,
      wrongCount: 0,
      studyCount: 0,
      lastStudiedAt: now,
    };
    const categoryRecord = records.categories[question.categoryId] ?? {
      categoryId: question.categoryId,
      correctCount: 0,
      wrongCount: 0,
      lastStudiedAt: now,
    };

    if (isCorrect) {
      records.totals.correctCount += 1;
      questionRecord.correctCount += 1;
      categoryRecord.correctCount += 1;
    } else {
      records.totals.wrongCount += 1;
      questionRecord.wrongCount += 1;
      categoryRecord.wrongCount += 1;
    }

    if (firstAttemptForQuestion) questionRecord.studyCount += 1;
    questionRecord.lastStudiedAt = now;
    categoryRecord.lastStudiedAt = now;
    records.totals.lastStudiedAt = now;
    records.questions[question.id] = questionRecord;
    records.categories[question.categoryId] = categoryRecord;
  });
}

export function saveExamResult(result: ExamResult, questions: QuizQuestion[]): Promise<LearningRecords> {
  return mutateRecords((records) => {
    const now = result.completedAt;
    records.totals.examSessions += 1;
    records.totals.correctCount += result.correct;
    records.totals.wrongCount += result.wrong;
    records.totals.lastStudiedAt = now;

    const questionMap = new Map(questions.map((question) => [question.id, question]));
    result.answers.forEach((answer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) return;
      const questionRecord = records.questions[question.id] ?? {
        questionId: question.id,
        correctCount: 0,
        wrongCount: 0,
        studyCount: 0,
        lastStudiedAt: now,
      };
      const categoryRecord = records.categories[question.categoryId] ?? {
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
      records.questions[question.id] = questionRecord;
      records.categories[question.categoryId] = categoryRecord;
    });

    records.examHistory = [result, ...records.examHistory.filter((item) => item.id !== result.id)].slice(
      0,
      MAX_EXAM_HISTORY,
    );
  });
}

export async function clearLearningRecords(): Promise<void> {
  mutationQueue = mutationQueue.then(() => AsyncStorage.removeItem(STORAGE_KEY));
  await mutationQueue;
}
