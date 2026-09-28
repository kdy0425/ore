import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { EMPTY_LEARNING_RECORDS, loadLearningRecords } from '@/storage/learningRecords';
import type { LearningRecords } from '@/types/records';

export function useLearningRecords() {
  const [records, setRecords] = useState<LearningRecords>(EMPTY_LEARNING_RECORDS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const nextRecords = await loadLearningRecords();
    setRecords(nextRecords);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { records, loading, refresh };
}
