import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageQueue, saveMealLogs, loadMealLogs } from '../storageService';
import { msUntilMidnight } from '../../utils/date';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('Storage Queue & Out-of-Order Write Protection Suite', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('AsyncStorageQueue executes rapid sequential writes in strict chronological order', async () => {
    const order: number[] = [];

    const task1 = () =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          order.push(1);
          resolve();
        }, 50);
      });

    const task2 = () =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          order.push(2);
          resolve();
        }, 10);
      });

    const p1 = storageQueue.enqueue(task1);
    const p2 = storageQueue.enqueue(task2);

    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });

  test('Rapid double meal save requests do not overwrite out-of-order', async () => {
    const meal1 = [{ id: '1', name: 'Meal 1', timestamp: new Date().toISOString(), isSnack: false, nutrition: { calories: 300, proteinGrams: 20, carbsGrams: 40, fatGrams: 10 }, source: 'ai' as const }];
    const meal2 = [
      { id: '2', name: 'Meal 2', timestamp: new Date().toISOString(), isSnack: false, nutrition: { calories: 400, proteinGrams: 25, carbsGrams: 50, fatGrams: 12 }, source: 'ai' as const },
      ...meal1,
    ];

    const p1 = saveMealLogs(meal1);
    const p2 = saveMealLogs(meal2);

    await Promise.all([p1, p2]);

    const loaded = await loadMealLogs();
    expect(loaded.length).toBe(2);
    expect(loaded[0].id).toBe('2');
  });

  test('msUntilMidnight calculates positive milliseconds until midnight local time', () => {
    const testNow = new Date(2026, 6, 26, 23, 50, 0); // 10 minutes before midnight
    const delay = msUntilMidnight(testNow);
    expect(delay).toBe(10 * 60 * 1000); // 600,000 ms
  });
});
