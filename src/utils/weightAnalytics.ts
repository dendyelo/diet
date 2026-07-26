import { WeightLog, WeightTrend } from '../types';
import { getLocalDateString } from './date';
import { ColorTokens } from '../theme/colors';

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
 * Get the earliest weight log entry (starting weight)
 */
export function getStartWeight(logs: WeightLog[]): number | null {
  if (logs.length === 0) return null;
  const sorted = sortByDate(logs);
  return sorted[0].weightKg;
}

/**
 * Calculate weight change from earliest log to latest log
 */
export function getChangeFromStart(logs: WeightLog[]): number | null {
  if (logs.length < 2) return null;
  const sorted = sortByDate(logs);
  const startWeight = sorted[0].weightKg;
  const latestWeight = sorted[sorted.length - 1].weightKg;
  return Math.round((latestWeight - startWeight) * 10) / 10;
}

/**
 * Check if the user's target weight represents a weight gain goal
 */
export function isGainGoal(logs: WeightLog[], targetKg: number): boolean {
  if (logs.length === 0) return false;
  const sorted = sortByDate(logs);
  const startWeight = sorted[0].weightKg;
  return targetKg > startWeight;
}

/**
 * Calculate percentage progress toward target weight
 */
export function getProgressToTarget(logs: WeightLog[], targetKg: number): number {
  if (logs.length === 0) return 0;
  const sorted = sortByDate(logs);
  const startWeight = sorted[0].weightKg;
  const currentWeight = sorted[sorted.length - 1].weightKg;

  const totalNeeded = Math.abs(targetKg - startWeight);
  if (totalNeeded === 0) return 100;

  const achieved = isGainGoal(logs, targetKg)
    ? currentWeight - startWeight
    : startWeight - currentWeight;

  const pct = Math.round((achieved / totalNeeded) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Calculate 7-day moving average
 */
export function getMovingAverage(logs: WeightLog[], windowDays: number = 7): number | null {
  const daily = groupByDay(logs);
  if (daily.length === 0) return null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = getLocalDateString(cutoff);

  const filtered = daily.filter((d) => d.dateStr >= cutoffStr);
  const recent = filtered.length > 0 ? filtered : daily.slice(-windowDays);

  const sum = recent.reduce((acc, curr) => acc + curr.weightKg, 0);
  return Math.round((sum / recent.length) * 10) / 10;
}

/**
 * Detect weight trend over recent entries (down, stable, up)
 */
export function detectTrend(logs: WeightLog[]): WeightTrend {
  const daily = groupByDay(logs);
  if (daily.length < 2) return 'stable';

  const recent = daily.slice(-7);
  if (recent.length < 2) return 'stable';

  const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
  const secondHalf = recent.slice(Math.floor(recent.length / 2));

  const avg1 = firstHalf.reduce((acc, curr) => acc + curr.weightKg, 0) / firstHalf.length;
  const avg2 = secondHalf.reduce((acc, curr) => acc + curr.weightKg, 0) / secondHalf.length;

  const diff = avg2 - avg1;
  if (diff < -0.3) return 'down';
  if (diff > 0.3) return 'up';
  return 'stable';
}

/**
 * Prepare chart data points for the last N days
 */
export function prepareChartData(logs: WeightLog[], days: number): ChartDataPoint[] {
  const daily = groupByDay(logs);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = getLocalDateString(cutoff);

  const filtered = daily.filter((d) => d.dateStr >= cutoffStr);

  return filtered.map((item) => {
    const parts = item.dateStr.split('-');
    const dateLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.dateStr;
    return {
      dateLabel,
      dateStr: item.dateStr,
      weightKg: item.weightKg,
    };
  });
}

/**
 * Prepare 7-day moving average series for chart matching daily points
 */
export function prepareMAChartData(logs: WeightLog[], days: number): ChartDataPoint[] {
  const rawChartData = prepareChartData(logs, days);
  const daily = groupByDay(logs);

  return rawChartData.map((point) => {
    const pointIdx = daily.findIndex((d) => d.dateStr === point.dateStr);
    if (pointIdx < 0) return point;

    const windowSlice = daily.slice(Math.max(0, pointIdx - 6), pointIdx + 1);
    const avg = windowSlice.reduce((sum, item) => sum + item.weightKg, 0) / windowSlice.length;

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

export type StatusKey = 'success' | 'warning' | 'danger';

/**
 * Get context-aware trend display info.
 * Resolves color dynamically using theme ColorTokens.
 */
export function getTrendInfo(
  trend: WeightTrend,
  gainGoal: boolean,
  themeColors?: ColorTokens
): { label: string; emoji: string; status: StatusKey; color: string } {
  const labels: Record<WeightTrend, { label: string; emoji: string }> = {
    down: { label: 'Turun', emoji: '⬇️' },
    stable: { label: 'Stabil', emoji: '➡️' },
    up: { label: 'Naik', emoji: '⬆️' },
  };

  const { label, emoji } = labels[trend];

  let status: StatusKey;
  if (trend === 'stable') {
    status = 'warning';
  } else if (gainGoal) {
    status = trend === 'up' ? 'success' : 'danger';
  } else {
    status = trend === 'down' ? 'success' : 'danger';
  }

  const fallbackMap = { success: '#10B981', warning: '#F59E0B', danger: '#EF4444' };
  const color = themeColors ? themeColors[status] : fallbackMap[status];

  return { label, emoji, status, color };
}

/**
 * Get context-aware status and color for weight change.
 */
export function getChangeColor(change: number | null, gainGoal: boolean, themeColors?: ColorTokens): string {
  if (change === null || change === 0) return themeColors ? themeColors.warning : '#F59E0B';
  let status: StatusKey;
  if (gainGoal) {
    status = change > 0 ? 'success' : 'danger';
  } else {
    status = change < 0 ? 'success' : 'danger';
  }
  return themeColors ? themeColors[status] : (status === 'success' ? '#10B981' : '#EF4444');
}

/**
 * Legacy compatibility export
 */
export const TREND_INFO: Record<WeightTrend, { label: string; emoji: string; color: string }> = {
  down: { label: 'Turun', emoji: '⬇️', color: '#10B981' },
  stable: { label: 'Stabil', emoji: '➡️', color: '#F59E0B' },
  up: { label: 'Naik', emoji: '⬆️', color: '#EF4444' },
};
