export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameLocalDay(isoTimestamp: string, date: Date = new Date()): boolean {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return false;
  return getLocalDateString(parsed) === getLocalDateString(date);
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
