import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { recordLearningDuration } from '@/storage/learningRecords';

const SAVE_INTERVAL_MS = 30_000;

export function useLearningTimer(enabled = true) {
  const activeStartedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const start = () => {
      if (activeStartedAt.current === null) activeStartedAt.current = Date.now();
    };

    const flush = () => {
      if (activeStartedAt.current === null) return;
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - activeStartedAt.current) / 1000);
      activeStartedAt.current = now;
      if (elapsedSeconds > 0) void recordLearningDuration(elapsedSeconds, new Date(now));
    };

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') start();
      else {
        flush();
        activeStartedAt.current = null;
      }
    };

    if (AppState.currentState === 'active') start();
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    const interval = setInterval(flush, SAVE_INTERVAL_MS);

    return () => {
      flush();
      subscription.remove();
      clearInterval(interval);
      activeStartedAt.current = null;
    };
  }, [enabled]);
}
