import { WeightLog, WeightTrend } from '../types';
import { getLocalDateString } from './date';

export interface ChartDataPoint {
  dateLabel: string; // "26/07"
  dateStr: string;   // "2026-07-26"
  weightKg: number;
}

export interface WeightSummary {
  latestWeight: number | null;
  changeFromStart: number | null;
  progressPercent: number;
  movingAverage7: number | null;
  trend: WeightTrend;
  /** true when target weight > start weight (user wants to gain) */
  isGainGoal: boolean;
}

/**
 * Sort weight logs by recordedAt ascending (oldest first)
 */
function sortByDate(logs: WeightLog[]): WeightLog[] {
  return [...logs].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
}

/**
 * Group logs by local calendar day, keeping only the latest entry per day.
 * Returns daily weights sorted ascending by date.
 */
export function groupByDay(logs: WeightLog[]): { dateStr: string; weightKg: number }[] {
  const sorted = sortByDate(logs);
  const dayMap = new Map<string, { dateStr: string; weightKg: number; time: number }>();

  for (const log of sorted) {
    const dateStr = getLocalDateString(new Date(log.recordedAt));
    const time = new Date(log.recordedAt).getTime();
    const existing = dayMap.get(dateStr);
    if (!existing || time > existing.time) {
      dayMap.set(dateStr, { dateStr, weightKg: log.weightKg, time });
    }
  }

  return Array.from(dayMap.values())
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
    .map(({ dateStr, weightKg }) => ({ dateStr, weightKg }));
}

/**
 * Get the most recent weight log entry
 */
export function getLatestWeight(logs: WeightLog[]): number | null {
  if (logs.length === 0) return null;
  const sorted = sortByDate(logs);
  return sorted[sorted.length - 1].weightKg;
}

/**
 * Get the earliest weight log entry
 */
export function getStartWeight(logs: WeightLog[]): number | null {
  if (logs.length === 0) return null;
  const sorted = sortByDate(logs);
  return sorted[0].weightKg;
}

/**
 * Calculate change from the first recorded weight to the latest
 * Positive = gained, Negative = lost
 */
export function getChangeFromStart(logs: WeightLog[]): number | null {
  if (logs.length < 2) return null;
  const sorted = sortByDate(logs);
  const first = sorted[0].weightKg;
  const last = sorted[sorted.length - 1].weightKg;
  return Math.round((last - first) * 10) / 10;
}

/**
 * Calculate progress toward target weight as percentage (0-100)
 * Works for both weight loss and weight gain targets
 */
export function getProgressToTarget(logs: WeightLog[], targetKg: number): number {
  if (logs.length === 0) return 0;
  const sorted = sortByDate(logs);
  const startWeight = sorted[0].weightKg;
  const latestWeight = sorted[sorted.length - 1].weightKg;

  const totalToLose = startWeight - targetKg;
  if (Math.abs(totalToLose) < 0.1) return 100; // Already at target

  const actualLost = startWeight - latestWeight;
  const progress = (actualLost / totalToLose) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

/**
 * Determine if the user's goal is weight gain (target > start weight)
 */
export function isGainGoal(logs: WeightLog[], targetKg: number): boolean {
  const start = getStartWeight(logs);
  if (start === null) return false;
  return targetKg > start;
}

/**
 * Calculate N-day moving average using one representative weight per day.
 * Groups multiple logs per day to the latest entry for that day,
 * then averages the last N daily values.
 */
export function getMovingAverage(logs: WeightLog[], days: number = 7): number | null {
  if (logs.length === 0) return null;

  const dailyWeights = groupByDay(logs);
  if (dailyWeights.length === 0) return null;

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = getLocalDateString(cutoff);

  const recentDays = dailyWeights.filter((d) => d.dateStr >= cutoffStr);

  if (recentDays.length === 0) {
    // Fallback: use last N daily entries if no days within window
    const lastN = dailyWeights.slice(-days);
    const sum = lastN.reduce((acc, d) => acc + d.weightKg, 0);
    return Math.round((sum / lastN.length) * 10) / 10;
  }

  const sum = recentDays.reduce((acc, d) => acc + d.weightKg, 0);
  return Math.round((sum / recentDays.length) * 10) / 10;
}

/**
 * Detect weight trend by comparing short-term MA (3 days) vs longer-term MA (7 days)
 * Both MAs use daily-grouped data to avoid per-entry bias.
 * - down: MA-3 < MA-7 by more than 0.2 kg
 * - up: MA-3 > MA-7 by more than 0.2 kg
 * - stable: within ±0.2 kg
 */
export function detectTrend(logs: WeightLog[]): WeightTrend {
  if (logs.length < 3) return 'stable';

  const ma3 = getMovingAverage(logs, 3);
  const ma7 = getMovingAverage(logs, 7);

  if (ma3 === null || ma7 === null) return 'stable';

  const diff = ma3 - ma7;
  if (diff < -0.2) return 'down';
  if (diff > 0.2) return 'up';
  return 'stable';
}

/**
 * Prepare data points for the chart, filtered to the last N days
 * Groups multiple logs per day to the latest entry for that day
 */
export function prepareChartData(logs: WeightLog[], days: number = 7): ChartDataPoint[] {
  if (logs.length === 0) return [];

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = getLocalDateString(cutoff);

  const dailyWeights = groupByDay(logs).filter((d) => d.dateStr >= cutoffStr);

  return dailyWeights.map(({ dateStr, weightKg }) => {
    const [, month, day] = dateStr.split('-');
    return {
      dateLabel: `${day}/${month}`,
      dateStr,
      weightKg,
    };
  });
}

/**
 * Prepare moving average line data for chart overlay.
 * Uses daily-grouped weights and rolling N-day window.
 */
export function prepareMAChartData(logs: WeightLog[], days: number = 7, maWindow: number = 7): ChartDataPoint[] {
  const chartData = prepareChartData(logs, days);
  if (chartData.length < 2) return [];

  const allDailyWeights = groupByDay(logs);

  return chartData.map((point) => {
    // Get all daily weights up to and including this date
    const dailiesUpTo = allDailyWeights.filter((d) => d.dateStr <= point.dateStr);
    const windowDays = dailiesUpTo.slice(-maWindow);
    const avg = windowDays.reduce((sum, d) => sum + d.weightKg, 0) / windowDays.length;

    return {
      dateLabel: point.dateLabel,
      dateStr: point.dateStr,
      weightKg: Math.round(avg * 10) / 10,
    };
  });
}

/**
 * Build a complete weight summary from logs
 */
export function buildWeightSummary(logs: WeightLog[], targetKg: number): WeightSummary {
  return {
    latestWeight: getLatestWeight(logs),
    changeFromStart: getChangeFromStart(logs),
    progressPercent: getProgressToTarget(logs, targetKg),
    movingAverage7: getMovingAverage(logs, 7),
    trend: detectTrend(logs),
    isGainGoal: isGainGoal(logs, targetKg),
  };
}

/**
 * Get context-aware trend display info.
 * Colors reflect whether the trend direction is favorable for the user's goal.
 */
export function getTrendInfo(
  trend: WeightTrend,
  gainGoal: boolean
): { label: string; emoji: string; color: string } {
  const labels: Record<WeightTrend, { label: string; emoji: string }> = {
    down: { label: 'Turun', emoji: '⬇️' },
    stable: { label: 'Stabil', emoji: '➡️' },
    up: { label: 'Naik', emoji: '⬆️' },
  };

  const { label, emoji } = labels[trend];

  // Determine if trend is favorable based on goal direction
  let color: string;
  if (trend === 'stable') {
    color = '#F59E0B'; // amber for stable
  } else if (gainGoal) {
    // Goal is to gain weight
    color = trend === 'up' ? '#10B981' : '#EF4444'; // up=good(green), down=bad(red)
  } else {
    // Goal is to lose weight (default)
    color = trend === 'down' ? '#10B981' : '#EF4444'; // down=good(green), up=bad(red)
  }

  return { label, emoji, color };
}

/**
 * Get context-aware color for weight change.
 * Positive change is green when gaining is the goal, red when losing is the goal.
 */
export function getChangeColor(change: number | null, gainGoal: boolean): string {
  if (change === null || change === 0) return '#F59E0B'; // amber
  if (gainGoal) {
    return change > 0 ? '#10B981' : '#EF4444'; // gain goal: + is good, - is bad
  }
  return change < 0 ? '#10B981' : '#EF4444'; // loss goal: - is good, + is bad
}

/**
 * @deprecated Use getTrendInfo() for context-aware colors instead.
 * Kept for backward compatibility but should not be used in new code.
 */
export const TREND_INFO: Record<WeightTrend, { label: string; emoji: string; color: string }> = {
  down: { label: 'Turun', emoji: '⬇️', color: '#10B981' },
  stable: { label: 'Stabil', emoji: '➡️', color: '#F59E0B' },
  up: { label: 'Naik', emoji: '⬆️', color: '#EF4444' },
};
