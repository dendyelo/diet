export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameLocalDay(isoTimestamp: string, targetDateStr?: string): boolean {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return false;

  const logDayStr = getLocalDateString(parsed);
  if (targetDateStr) {
    return logDayStr === targetDateStr;
  }
  return logDayStr === getLocalDateString();
}

export function getLatestMealTimestamp(logs: { timestamp: string }[]): string | null {
  let latest: string | null = null;
  let latestTime = -Infinity;

  for (const log of logs) {
    const time = new Date(log.timestamp).getTime();
    if (Number.isFinite(time) && time > latestTime) {
      latestTime = time;
      latest = log.timestamp;
    }
  }

  return latest;
}

/**
 * Calculate milliseconds remaining until midnight local time
 */
export function msUntilMidnight(now: Date = new Date()): number {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(1000, midnight.getTime() - now.getTime());
}
