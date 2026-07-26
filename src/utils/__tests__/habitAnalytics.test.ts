import {
  formatElapsedTime,
  getFastingStage,
  calculateTriggerStats,
  generateWeeklyHabitSummary,
} from '../habitAnalytics';
import { MealLog } from '../../types';

describe('Habit Analytics Utility Suite', () => {
  test('formatElapsedTime formats seconds into HH:MM:SS correctly', () => {
    const formatted = formatElapsedTime(3665); // 1 hour, 1 minute, 5 seconds
    expect(formatted.hours).toBe(1);
    expect(formatted.minutes).toBe(1);
    expect(formatted.seconds).toBe(5);
    expect(formatted.formatted).toBe('01:01:05');
  });

  test('getFastingStage returns correct biological stage by hours', () => {
    expect(getFastingStage(1 * 3600).id).toBe('digesting');
    expect(getFastingStage(5 * 3600).id).toBe('post_absorptive');
    expect(getFastingStage(10 * 3600).id).toBe('glycogen_depletion');
    expect(getFastingStage(14 * 3600).id).toBe('fat_adaptation');
    expect(getFastingStage(18 * 3600).id).toBe('autofagi');
  });

  test('calculateTriggerStats aggregates emotional snacking triggers correctly', () => {
    const mockLogs: MealLog[] = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        name: 'Keripik Singkong',
        isSnack: true,
        trigger: 'BOSAN',
        nutrition: { calories: 200, proteinGrams: 2, carbsGrams: 20, fatGrams: 10 },
        source: 'ai',
      },
      {
        id: '2',
        timestamp: new Date().toISOString(),
        name: 'Boba',
        isSnack: true,
        trigger: 'BOSAN',
        nutrition: { calories: 350, proteinGrams: 3, carbsGrams: 50, fatGrams: 12 },
        source: 'ai',
      },
      {
        id: '3',
        timestamp: new Date().toISOString(),
        name: 'Cokelat',
        isSnack: true,
        trigger: 'STRES',
        nutrition: { calories: 250, proteinGrams: 4, carbsGrams: 25, fatGrams: 15 },
        source: 'ai',
      },
    ];

    const stats = calculateTriggerStats(mockLogs);
    expect(stats.totalSnacks).toBe(3);

    const bosanStat = stats.breakdown.find((b) => b.type === 'BOSAN');
    expect(bosanStat?.count).toBe(2);
    expect(bosanStat?.percentage).toBe(67);
  });

  test('generateWeeklyHabitSummary calculates habit score and compliance accurately', () => {
    const mockLogs: MealLog[] = [
      {
        id: '1',
        timestamp: '2026-07-26T08:00:00.000Z',
        name: 'Sarapan Telur',
        isSnack: false,
        nutrition: { calories: 350, proteinGrams: 24, carbsGrams: 10, fatGrams: 15 },
        source: 'manual',
      },
      {
        id: '2',
        timestamp: '2026-07-26T12:30:00.000Z',
        name: 'Makan Siang Dada Ayam',
        isSnack: false,
        nutrition: { calories: 550, proteinGrams: 55, carbsGrams: 40, fatGrams: 12 },
        source: 'manual',
      },
    ];

    const summary = generateWeeklyHabitSummary(
      mockLogs,
      8,
      80,
      new Date('2026-07-26T20:00:00.000Z')
    );
    expect(summary.habitScore).toBe(52);
    expect(summary.waterCompliancePct).toBe(100);
    expect(summary.avgDailyCalories).toBe(900);
    expect(summary.insightSentence).toContain('Awal yang baik');
  });

  test('today water is reported separately and does not inflate a weekly score', () => {
    const summary = generateWeeklyHabitSummary(
      [],
      8,
      80,
      new Date('2026-07-26T20:00:00.000Z')
    );

    expect(summary.waterCompliancePct).toBe(100);
    expect(summary.habitScore).toBe(0);
  });

  test('generateWeeklyHabitSummary excludes logs outside the last seven local days', () => {
    const mockLogs: MealLog[] = [
      {
        id: 'recent',
        timestamp: '2026-07-26T08:00:00.000Z',
        name: 'Makan baru',
        isSnack: false,
        nutrition: { calories: 500, proteinGrams: 40, carbsGrams: 30, fatGrams: 15 },
        source: 'manual',
      },
      {
        id: 'old',
        timestamp: '2026-07-10T08:00:00.000Z',
        name: 'Makan lama',
        isSnack: false,
        nutrition: { calories: 1200, proteinGrams: 10, carbsGrams: 100, fatGrams: 40 },
        source: 'manual',
      },
    ];

    const summary = generateWeeklyHabitSummary(
      mockLogs,
      0,
      80,
      new Date('2026-07-26T20:00:00.000Z')
    );

    expect(summary.avgDailyCalories).toBe(500);
    expect(summary.proteinCompliancePct).toBe(50);
  });
});
