import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageQueue, saveMealLogs, loadMealLogs, runStepByStepMigrations, loadUserProfile } from '../storageService';
import { msUntilMidnight } from '../../utils/date';
import { createLocalId } from '../../utils/id';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('Advanced Storage Queue & Schema V5 Migration Suite', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('AsyncStorageQueue recovers and continues executing subsequent tasks when a task fails', async () => {
    const executed: string[] = [];

    const failingTask = () =>
      new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Disk Write Failure'));
        }, 10);
      });

    const successTask = () =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          executed.push('success');
          resolve();
        }, 10);
      });

    const pFailing = storageQueue.enqueue(failingTask);
    const pSuccess = storageQueue.enqueue(successTask);

    await expect(pFailing).rejects.toThrow('Disk Write Failure');
    await pSuccess;

    expect(executed).toEqual(['success']);
  });

  test('createLocalId generates prefixed collision-proof unique ID string', () => {
    const id1 = createLocalId('meal');
    const id2 = createLocalId('chat');

    expect(id1.startsWith('meal_')).toBe(true);
    expect(id2.startsWith('chat_')).toBe(true);
    expect(id1).not.toEqual(id2);
  });

  test('loadMealLogs strictly filters corrupted entries and sanitizes negative nutrition', async () => {
    const rawCorrupted = JSON.stringify([
      { id: 'm1', name: 'Nasi Uduk', isSnack: false, timestamp: '2026-07-26T12:00:00.000Z', nutrition: { calories: 500, proteinGrams: -10 } },
      { id: '', name: 'Invalid ID', isSnack: false, timestamp: '2026-07-26T12:00:00.000Z', nutrition: { calories: 100 } },
      { id: 'm3', name: '', isSnack: false, timestamp: '2026-07-26T12:00:00.000Z', nutrition: { calories: 100 } },
      { id: 'm4', name: 'Bad Date', isSnack: false, timestamp: 'Invalid-Date-String', nutrition: { calories: 100 } },
      { id: 'm5', name: 'Negative Calories', isSnack: false, timestamp: '2026-07-26T12:00:00.000Z', nutrition: { calories: -50 } },
    ]);

    await AsyncStorage.setItem('@habitdiet_meal_logs', rawCorrupted);

    const logs = await loadMealLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].id).toBe('m1');
    expect(logs[0].nutrition.proteinGrams).toBe(0); // Sanitized from -10 to 0
  });

  test('runStepByStepMigrations upgrades V1 schema to V5 seamlessly', async () => {
    await AsyncStorage.setItem('@habitdiet_schema_version', '1');
    await AsyncStorage.setItem('@habitdiet_user_profile', JSON.stringify({ name: 'Old User', geminiApiKey: 'legacy-key' }));

    await runStepByStepMigrations(1);

    const profile = await loadUserProfile();
    expect(profile.name).toBe('Old User');
    expect(profile.bodyType).toBe('normal');
    expect((profile as any).geminiApiKey).toBeUndefined();

    const version = await AsyncStorage.getItem('@habitdiet_schema_version');
    expect(version).toBe('5');
  });

  test('msUntilMidnight calculates positive milliseconds until midnight local time', () => {
    const testNow = new Date(2026, 6, 26, 23, 50, 0);
    const delay = msUntilMidnight(testNow);
    expect(delay).toBe(10 * 60 * 1000);
  });
});
