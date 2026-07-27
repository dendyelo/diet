export function shouldMealEndFast(
  fastingStartedAt?: string | null,
  mealTimestamp?: string | null
): boolean {
  if (!fastingStartedAt || !mealTimestamp) return false;

  const fastingStartMs = new Date(fastingStartedAt).getTime();
  const mealMs = new Date(mealTimestamp).getTime();

  return (
    Number.isFinite(fastingStartMs) &&
    Number.isFinite(mealMs) &&
    mealMs >= fastingStartMs
  );
}

export function calculateMealGapSeconds(
  lastMealTimestamp?: string | null,
  nowMs: number = Date.now()
): number {
  if (!lastMealTimestamp) return 0;
  const lastMealMs = new Date(lastMealTimestamp).getTime();
  if (!Number.isFinite(lastMealMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.floor((nowMs - lastMealMs) / 1000));
}
