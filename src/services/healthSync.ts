import { Pedometer } from 'expo-sensors';

export interface HealthSyncStatus {
  isAvailable: boolean;
  stepCount: number;
  error?: string;
}

/**
 * Check Pedometer availability and fetch step count for today
 */
export async function getTodayStepCount(): Promise<HealthSyncStatus> {
  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) {
      return { isAvailable: false, stepCount: 0, error: 'Sensor Pedometer tidak tersedia' };
    }

    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Beginning of today

    const result = await Pedometer.getStepCountAsync(start, end);
    return {
      isAvailable: true,
      stepCount: result?.steps || 0,
    };
  } catch (error) {
    return {
      isAvailable: false,
      stepCount: 0,
      error: 'Izin Pedometer belum diberikan',
    };
  }
}

/**
 * Subscribe to real-time step updates
 */
export function subscribeStepCount(onStepUpdate: (steps: number) => void) {
  try {
    return Pedometer.watchStepCount((result) => {
      if (result && typeof result.steps === 'number') {
        onStepUpdate(result.steps);
      }
    });
  } catch (error) {
    console.warn('Unable to watch step count:', error);
    return { remove: () => {} };
  }
}
