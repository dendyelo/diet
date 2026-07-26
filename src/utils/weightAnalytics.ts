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
 * Calculate N-day moving average from the most recent logs
 */
export function getMovingAverage(logs: WeightLog[], days: number = 7): number | null {
  if (logs.length === 0) return null;
  const sorted = sortByDate(logs);

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  const recentLogs = sorted.filter(
    (log) => new Date(log.recordedAt).getTime() >= cutoff.getTime()
  );

  if (recentLogs.length === 0) {
    // Fallback: use last N entries if no logs within date window
    const lastN = sorted.slice(-days);
    const sum = lastN.reduce((acc, log) => acc + log.weightKg, 0);
    return Math.round((sum / lastN.length) * 10) / 10;
  }

  const sum = recentLogs.reduce((acc, log) => acc + log.weightKg, 0);
  return Math.round((sum / recentLogs.length) * 10) / 10;
}

/**
 * Detect weight trend by comparing short-term MA (3 days) vs longer-term MA (7 days)
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

  const sorted = sortByDate(logs);
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  const filteredLogs = sorted.filter(
    (log) => new Date(log.recordedAt).getTime() >= cutoff.getTime()
  );

  // Group by date, take the latest entry per day
  const dayMap = new Map<string, WeightLog>();
  for (const log of filteredLogs) {
    const dateStr = getLocalDateString(new Date(log.recordedAt));
    const existing = dayMap.get(dateStr);
    if (!existing || new Date(log.recordedAt).getTime() > new Date(existing.recordedAt).getTime()) {
      dayMap.set(dateStr, log);
    }
  }

  // Convert to sorted array of data points
  const entries = Array.from(dayMap.entries()).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  return entries.map(([dateStr, log]) => {
    const [, month, day] = dateStr.split('-');
    return {
      dateLabel: `${day}/${month}`,
      dateStr,
      weightKg: log.weightKg,
    };
  });
}

/**
 * Prepare moving average line data for chart overlay
 */
export function prepareMAChartData(logs: WeightLog[], days: number = 7, maWindow: number = 7): ChartDataPoint[] {
  const chartData = prepareChartData(logs, days);
  if (chartData.length < 2) return [];

  const sorted = sortByDate(logs);

  return chartData.map((point) => {
    // Get all logs up to and including this date
    const logsUpTo = sorted.filter(
      (log) => getLocalDateString(new Date(log.recordedAt)) <= point.dateStr
    );
    const windowLogs = logsUpTo.slice(-maWindow);
    const avg = windowLogs.reduce((sum, l) => sum + l.weightKg, 0) / windowLogs.length;

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
  };
}

/**
 * Trend display info
 */
export const TREND_INFO: Record<WeightTrend, { label: string; emoji: string; color: string }> = {
  down: { label: 'Turun', emoji: '⬇️', color: '#10B981' },
  stable: { label: 'Stabil', emoji: '➡️', color: '#F59E0B' },
  up: { label: 'Naik', emoji: '⬆️', color: '#EF4444' },
};
