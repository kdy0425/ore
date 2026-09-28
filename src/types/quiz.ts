export type AnswerSource = 'document' | 'operational' | string;

export interface QuizCategory {
  id: string;
  name: string;
  description: string;
}

export interface QuizQuestion {
  id: string;
  categoryId: string;
  subcategory: string;
  question: string;
  options: string[];
  correctAnswer: number;
  correctValue: string;
  explanation: string;
  answerSource: AnswerSource;
  sourceLines?: string;
}

export interface QuizBank {
  meta: {
    title: string;
    totalQuestions: number;
    note?: string;
  };
  categories: QuizCategory[];
  questions: QuizQuestion[];
}

export type ExamMode = 'all' | 'category' | 'wrong';

export interface StudySessionResult {
  scopeName: string;
  totalQuestions: number;
  correctAttempts: number;
  wrongAttempts: number;
}

export interface ExamAnswer {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
}

export interface ExamCategoryResult {
  categoryId: string;
  correct: number;
  total: number;
}

export interface ExamResult {
  id: string;
  completedAt: string;
  mode: ExamMode;
  answers: ExamAnswer[];
  correct: number;
  wrong: number;
  score: number;
  categoryResults: ExamCategoryResult[];
}
