const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  return result;
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return {
      date,
      key: toLocalDateKey(date),
      dayLabel: DAY_LABELS[date.getDay()],
      dayNumber: date.getDate(),
    };
  });
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startText = `${weekStart.getMonth() + 1}.${weekStart.getDate()}`;
  const endText = `${weekEnd.getMonth() + 1}.${weekEnd.getDate()}`;
  return `${weekStart.getFullYear()}년 ${startText} – ${endText}`;
}

export function formatLearningMinutes(seconds: number): string {
  if (seconds <= 0) return '0분';
  if (seconds < 60) return '<1분';
  return `${Math.max(1, Math.round(seconds / 60))}분`;
}
