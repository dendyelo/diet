import {
  formatElapsedTime,
  getFastingStage,
  calculateTriggerStats,
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
    expect(getFastingStage(1).id).toBe('digesting');
    expect(getFastingStage(5).id).toBe('post_absorptive');
    expect(getFastingStage(10).id).toBe('glycogen_depletion');
    expect(getFastingStage(14).id).toBe('fat_adaptation');
    expect(getFastingStage(18).id).toBe('autofagi');
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
});
