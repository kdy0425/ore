import type { ExamResult } from './quiz';

export interface QuestionLearningRecord {
  questionId: string;
  correctCount: number;
  wrongCount: number;
  studyCount: number;
  lastStudiedAt: string;
}

export interface CategoryLearningRecord {
  categoryId: string;
  correctCount: number;
  wrongCount: number;
  lastStudiedAt: string;
}

export interface LearningTotals {
  studySessions: number;
  examSessions: number;
  correctCount: number;
  wrongCount: number;
  lastStudiedAt: string | null;
}

export interface LearningRecords {
  version: 1;
  totals: LearningTotals;
  questions: Record<string, QuestionLearningRecord>;
  categories: Record<string, CategoryLearningRecord>;
  dailyActivity: Record<string, number>;
  examHistory: ExamResult[];
}
