export function createMealTimestamp(
  timeText: string,
  now: Date = new Date()
): string | null {
  const match = timeText.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const result = new Date(now);
  result.setHours(hours, minutes, 0, 0);

  if (result.getTime() > now.getTime()) return null;
  return result.toISOString();
}

export function formatMealTime(date: Date = new Date()): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}
