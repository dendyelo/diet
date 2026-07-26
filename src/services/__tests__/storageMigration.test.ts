import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadStepRecord, loadMealLogs } from '../storageService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('Storage Service & Migration Suite', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('loadStepRecord migrates legacy step count to StepRecord seamlessly', async () => {
    const dateStr = '2026-07-26';
    await AsyncStorage.setItem('@habitdiet_step_count_2026-07-26', '4500');

    const record = await loadStepRecord(dateStr);
    expect(record.sensorSteps).toBe(4500);
    expect(record.manualSteps).toBe(0);

    const legacyKeyData = await AsyncStorage.getItem('@habitdiet_step_count_2026-07-26');
    expect(legacyKeyData).toBeNull();
  });

  test('loadMealLogs filters out corrupted or invalid meal log entries safely', async () => {
    const rawCorruptedData = JSON.stringify([
      { id: '1', name: 'Nasi Goreng', nutrition: { calories: 450 } },
      { id: null, name: 'Invalid Log' },
      null,
      { id: '3', name: 'Ayam Bakar' }, // missing nutrition
    ]);

    await AsyncStorage.setItem('@habitdiet_meal_logs', rawCorruptedData);

    const logs = await loadMealLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].id).toBe('1');
    expect(logs[0].name).toBe('Nasi Goreng');
  });
});
