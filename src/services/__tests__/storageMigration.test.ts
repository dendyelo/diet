import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadStepRecord, loadMealLogs } from '../storageService';
import { getLocalDateString, isSameLocalDay, getLatestMealTimestamp } from '../../utils/date';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('Storage Service & Date Utility Suite', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('getLocalDateString returns YYYY-MM-DD matching local timezone', () => {
    const testDate = new Date(2026, 6, 26, 23, 55, 0); // Local Date: July 26, 2026
    const localStr = getLocalDateString(testDate);
    expect(localStr).toBe('2026-07-26');
  });

  test('isSameLocalDay identifies same day correctly near midnight', () => {
    const nightDate = new Date(2026, 6, 26, 23, 59, 59); // 11:59:59 PM Local
    const noonDateStr = getLocalDateString(new Date(2026, 6, 26, 12, 0, 0)); // 2026-07-26
    expect(isSameLocalDay(nightDate.toISOString(), noonDateStr)).toBe(true);
  });

  test('getLatestMealTimestamp returns latest timestamp or null when logs empty', () => {
    const logs = [
      { timestamp: '2026-07-26T10:00:00.000Z' },
      { timestamp: '2026-07-26T14:30:00.000Z' },
      { timestamp: '2026-07-26T08:15:00.000Z' },
    ];
    expect(getLatestMealTimestamp(logs)).toBe('2026-07-26T14:30:00.000Z');
    expect(getLatestMealTimestamp([])).toBeNull();
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
      { id: '1', name: 'Nasi Goreng', isSnack: false, timestamp: '2026-07-26T12:00:00.000Z', nutrition: { calories: 450 } },
      { id: null, name: 'Invalid Log' },
      null,
      { id: '3', name: 'Ayam Bakar' },
    ]);

    await AsyncStorage.setItem('@habitdiet_meal_logs', rawCorruptedData);

    const logs = await loadMealLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].id).toBe('1');
    expect(logs[0].name).toBe('Nasi Goreng');
  });
});
