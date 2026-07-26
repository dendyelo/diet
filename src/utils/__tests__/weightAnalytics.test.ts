import {
  getLatestWeight,
  getStartWeight,
  getChangeFromStart,
  getProgressToTarget,
  getMovingAverage,
  detectTrend,
  prepareChartData,
  buildWeightSummary,
} from '../weightAnalytics';
import { WeightLog } from '../../types';

function makeLog(weightKg: number, daysAgo: number = 0, id?: string): WeightLog {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id: id || `weight_test_${daysAgo}_${Math.random().toString(36).slice(2, 6)}`,
    weightKg,
    recordedAt: date.toISOString(),
  };
}

describe('weightAnalytics', () => {
  describe('getLatestWeight', () => {
    it('returns null for empty logs', () => {
      expect(getLatestWeight([])).toBeNull();
    });

    it('returns the most recent weight from unsorted logs', () => {
      const logs = [makeLog(72, 5), makeLog(70, 0), makeLog(71, 2)];
      expect(getLatestWeight(logs)).toBe(70);
    });

    it('returns the only weight for single entry', () => {
      expect(getLatestWeight([makeLog(65, 0)])).toBe(65);
    });
  });

  describe('getStartWeight', () => {
    it('returns null for empty logs', () => {
      expect(getStartWeight([])).toBeNull();
    });

    it('returns the earliest weight', () => {
      const logs = [makeLog(72, 5), makeLog(70, 0), makeLog(71, 2)];
      expect(getStartWeight(logs)).toBe(72);
    });
  });

  describe('getChangeFromStart', () => {
    it('returns null for fewer than 2 logs', () => {
      expect(getChangeFromStart([])).toBeNull();
      expect(getChangeFromStart([makeLog(70, 0)])).toBeNull();
    });

    it('returns negative for weight loss', () => {
      const logs = [makeLog(75, 10), makeLog(73, 5), makeLog(71, 0)];
      expect(getChangeFromStart(logs)).toBe(-4);
    });

    it('returns positive for weight gain', () => {
      const logs = [makeLog(60, 10), makeLog(62, 0)];
      expect(getChangeFromStart(logs)).toBe(2);
    });

    it('returns 0 for no change', () => {
      const logs = [makeLog(70, 5), makeLog(70, 0)];
      expect(getChangeFromStart(logs)).toBe(0);
    });
  });

  describe('getProgressToTarget', () => {
    it('returns 0 for empty logs', () => {
      expect(getProgressToTarget([], 65)).toBe(0);
    });

    it('returns 100 when start weight equals target', () => {
      const logs = [makeLog(65, 5), makeLog(65, 0)];
      expect(getProgressToTarget(logs, 65)).toBe(100);
    });

    it('calculates progress for weight loss goal', () => {
      // Start 80, current 75, target 70 → lost 5 of 10 = 50%
      const logs = [makeLog(80, 10), makeLog(75, 0)];
      expect(getProgressToTarget(logs, 70)).toBe(50);
    });

    it('calculates progress for weight gain goal', () => {
      // Start 50, current 55, target 60 → gained 5 of 10 = 50%
      const logs = [makeLog(50, 10), makeLog(55, 0)];
      expect(getProgressToTarget(logs, 60)).toBe(50);
    });

    it('clamps at 0 when going the wrong direction', () => {
      // Start 80, current 85, target 70 → going up instead of down
      const logs = [makeLog(80, 10), makeLog(85, 0)];
      expect(getProgressToTarget(logs, 70)).toBe(0);
    });

    it('clamps at 100 when overshoot target', () => {
      // Start 80, current 65, target 70 → overshot
      const logs = [makeLog(80, 10), makeLog(65, 0)];
      expect(getProgressToTarget(logs, 70)).toBe(100);
    });
  });

  describe('getMovingAverage', () => {
    it('returns null for empty logs', () => {
      expect(getMovingAverage([], 7)).toBeNull();
    });

    it('calculates correct average for recent entries', () => {
      const logs = [
        makeLog(70, 6), makeLog(71, 5), makeLog(69, 4),
        makeLog(70, 3), makeLog(70, 2), makeLog(71, 1), makeLog(70, 0),
      ];
      const avg = getMovingAverage(logs, 7);
      expect(avg).not.toBeNull();
      // (70+71+69+70+70+71+70)/7 = 491/7 ≈ 70.1
      expect(avg).toBeCloseTo(70.1, 1);
    });

    it('uses only logs within the date window', () => {
      const logs = [
        makeLog(90, 30), // outside 7-day window
        makeLog(70, 2),
        makeLog(72, 0),
      ];
      const avg = getMovingAverage(logs, 7);
      // Only 70 and 72 are within 7 days
      expect(avg).toBe(71);
    });
  });

  describe('detectTrend', () => {
    it('returns stable for fewer than 3 logs', () => {
      expect(detectTrend([])).toBe('stable');
      expect(detectTrend([makeLog(70, 0)])).toBe('stable');
      expect(detectTrend([makeLog(70, 1), makeLog(70, 0)])).toBe('stable');
    });

    it('detects downward trend', () => {
      const logs = [
        makeLog(75, 6), makeLog(74, 5), makeLog(74, 4),
        makeLog(73, 3), makeLog(72, 2), makeLog(71, 1), makeLog(70, 0),
      ];
      expect(detectTrend(logs)).toBe('down');
    });

    it('detects upward trend', () => {
      const logs = [
        makeLog(70, 6), makeLog(71, 5), makeLog(71, 4),
        makeLog(72, 3), makeLog(73, 2), makeLog(74, 1), makeLog(75, 0),
      ];
      expect(detectTrend(logs)).toBe('up');
    });

    it('detects stable when weights are flat', () => {
      const logs = [
        makeLog(70, 6), makeLog(70, 5), makeLog(70, 4),
        makeLog(70, 3), makeLog(70, 2), makeLog(70, 1), makeLog(70, 0),
      ];
      expect(detectTrend(logs)).toBe('stable');
    });
  });

  describe('prepareChartData', () => {
    it('returns empty array for no logs', () => {
      expect(prepareChartData([], 7)).toEqual([]);
    });

    it('groups multiple logs per day to latest entry', () => {
      const now = new Date();
      const log1: WeightLog = {
        id: 'w1', weightKg: 70,
        recordedAt: new Date(now.getTime() - 3600000).toISOString(), // 1hr ago
      };
      const log2: WeightLog = {
        id: 'w2', weightKg: 71,
        recordedAt: now.toISOString(), // now (latest)
      };

      const data = prepareChartData([log1, log2], 7);
      expect(data.length).toBe(1);
      expect(data[0].weightKg).toBe(71); // should pick the latest
    });

    it('formats date labels as DD/MM', () => {
      const logs = [makeLog(70, 0)];
      const data = prepareChartData(logs, 7);
      expect(data[0].dateLabel).toMatch(/^\d{2}\/\d{2}$/);
    });

    it('sorts data chronologically', () => {
      const logs = [makeLog(72, 0), makeLog(70, 3), makeLog(71, 1)];
      const data = prepareChartData(logs, 7);
      expect(data[0].weightKg).toBe(70);
      expect(data[data.length - 1].weightKg).toBe(72);
    });
  });

  describe('buildWeightSummary', () => {
    it('returns default summary for empty logs', () => {
      const summary = buildWeightSummary([], 65);
      expect(summary.latestWeight).toBeNull();
      expect(summary.changeFromStart).toBeNull();
      expect(summary.progressPercent).toBe(0);
      expect(summary.movingAverage7).toBeNull();
      expect(summary.trend).toBe('stable');
    });

    it('builds complete summary from weight logs', () => {
      const logs = [
        makeLog(75, 10), makeLog(74, 8), makeLog(73, 6),
        makeLog(72, 4), makeLog(71, 2), makeLog(70, 0),
      ];
      const summary = buildWeightSummary(logs, 65);
      expect(summary.latestWeight).toBe(70);
      expect(summary.changeFromStart).toBe(-5);
      expect(summary.progressPercent).toBe(50); // 75→70 out of 75→65 = 50%
      expect(summary.movingAverage7).not.toBeNull();
      expect(summary.trend).toBe('down');
    });
  });
});
