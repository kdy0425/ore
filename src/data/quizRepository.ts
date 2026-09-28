import rawQuizBank from './oreno_quiz_full.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { Json, Tables } from '@/types/database';
import type { QuizBank, QuizCategory, QuizQuestion } from '@/types/quiz';

const bundledQuizBank = rawQuizBank as QuizBank;
const RECIPE_CACHE_KEY = 'ore.recipe-bundle.v1';
let quizBank = bundledQuizBank;
let recipeVersion: number | null = null;

export function validateQuizBank(bank: QuizBank): void {
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
    if (question.options[question.correctAnswer] !== question.correctValue) {
      throw new Error(`정답 값이 보기와 일치하지 않습니다: ${question.id}`);
    }
    questionIds.add(question.id);
  });
}

validateQuizBank(quizBank);

function applyBundle(bank: QuizBank, version: number | null) {
  validateQuizBank(bank);
  quizBank = bank;
  recipeVersion = version;
}

export function parseQuizBankText(text: string): QuizBank {
  if (text.length > 5 * 1024 * 1024) {
    throw new Error('JSON 파일은 5MB 이하여야 합니다.');
  }
  const parsed = JSON.parse(text) as QuizBank;
  validateQuizBank(parsed);
  return parsed;
}

export async function refreshQuizBank(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('recipe_bundles')
      .select('*')
      .eq('is_current', true)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      applyBundle(data.payload as unknown as QuizBank, data.version);
      await AsyncStorage.setItem(RECIPE_CACHE_KEY, JSON.stringify({ version: data.version, payload: data.payload }));
      return;
    }
  } catch {
    const cached = await AsyncStorage.getItem(RECIPE_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { version: number; payload: QuizBank };
        applyBundle(parsed.payload, parsed.version);
        return;
      } catch { /* bundled data remains available */ }
    }
  }
  applyBundle(bundledQuizBank, null);
}

export async function uploadQuizBank(bank: QuizBank): Promise<Tables<'recipe_bundles'>> {
  validateQuizBank(bank);
  const { data, error } = await supabase.rpc('replace_recipe_bundle', { bundle: bank as unknown as Json });
  if (error) throw error;
  applyBundle(data.payload as unknown as QuizBank, data.version);
  await AsyncStorage.setItem(RECIPE_CACHE_KEY, JSON.stringify({ version: data.version, payload: data.payload }));
  return data;
}

export function getRecipeVersion(): number | null {
  return recipeVersion;
}

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
