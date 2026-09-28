import { supabase } from '@/lib/supabase';
import { clearLearningRecords } from '@/storage/learningRecords';

export async function deleteCurrentAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>('delete-account', {
    body: {},
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error ?? '계정을 삭제하지 못했습니다.');

  await Promise.allSettled([
    clearLearningRecords(),
    supabase.auth.signOut({ scope: 'local' }),
  ]);
}
