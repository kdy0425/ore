import rawQuizBank from './oreno_quiz_full.json';
import type { QuizBank, QuizCategory, QuizQuestion } from '@/types/quiz';

const quizBank = rawQuizBank as QuizBank;

function validateQuizBank(bank: QuizBank): void {
  if (!Array.isArray(bank.categories) || !Array.isArray(bank.questions)) {
    throw new Error('퀴즈 데이터 형식이 올바르지 않습니다.');
  }

  const categoryIds = new Set(bank.categories.map((category) => category.id));
  const questionIds = new Set<string>();

  bank.questions.forEach((question) => {
    if (questionIds.has(question.id)) {
      throw new Error(`중복된 문제 ID입니다: ${question.id}`);
    }
    if (!categoryIds.has(question.categoryId)) {
      throw new Error(`존재하지 않는 카테고리입니다: ${question.categoryId}`);
    }
    if (question.options.length < 2 || question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
      throw new Error(`정답 인덱스가 올바르지 않습니다: ${question.id}`);
    }
    questionIds.add(question.id);
  });
}

validateQuizBank(quizBank);

export function getQuizBank(): QuizBank {
  return quizBank;
}

export function getCategories(): QuizCategory[] {
  return quizBank.categories;
}

export function getCategory(categoryId: string): QuizCategory | undefined {
  return quizBank.categories.find((category) => category.id === categoryId);
}

export function getQuestion(questionId: string): QuizQuestion | undefined {
  return quizBank.questions.find((question) => question.id === questionId);
}

export function getQuestions(options?: {
  categoryId?: string;
  subcategory?: string;
  questionIds?: string[];
}): QuizQuestion[] {
  const idSet = options?.questionIds ? new Set(options.questionIds) : null;

  return quizBank.questions.filter((question) => {
    if (options?.categoryId && question.categoryId !== options.categoryId) return false;
    if (options?.subcategory && question.subcategory !== options.subcategory) return false;
    if (idSet && !idSet.has(question.id)) return false;
    return true;
  });
}

export function getQuestionsInOrder(questionIds: string[]): QuizQuestion[] {
  const questionMap = new Map(quizBank.questions.map((question) => [question.id, question]));
  return questionIds.flatMap((id) => {
    const question = questionMap.get(id);
    return question ? [question] : [];
  });
}

export function getSubcategories(categoryId: string): string[] {
  return [...new Set(getQuestions({ categoryId }).map((question) => question.subcategory))];
}
