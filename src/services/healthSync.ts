import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

export interface HealthSyncStatus {
  isAvailable: boolean;
  stepCount: number;
  historicalCountAvailable: boolean;
  error?: string;
}

/**
 * Check Pedometer availability and fetch step count for today
 */
export async function getTodayStepCount(): Promise<HealthSyncStatus> {
  try {
    const currentPermission = await Pedometer.getPermissionsAsync();
    const permission = currentPermission.granted
      ? currentPermission
      : await Pedometer.requestPermissionsAsync();

    if (!permission.granted) {
      return {
        isAvailable: false,
        stepCount: 0,
        historicalCountAvailable: false,
        error: 'Izin Pedometer belum diberikan',
      };
    }

    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) {
      return {
        isAvailable: false,
        stepCount: 0,
        historicalCountAvailable: false,
        error: 'Sensor Pedometer tidak tersedia',
      };
    }

    // Expo SDK 57 only exposes historical step queries on iOS. Android can
    // still stream live steps, so preserve the locally stored daily base there.
    if (Platform.OS !== 'ios') {
      return {
        isAvailable: true,
        stepCount: 0,
        historicalCountAvailable: false,
      };
    }

    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Beginning of today

    const result = await Pedometer.getStepCountAsync(start, end);
    return {
      isAvailable: true,
      stepCount: result?.steps || 0,
      historicalCountAvailable: true,
    };
  } catch (error) {
    return {
      isAvailable: false,
      stepCount: 0,
      historicalCountAvailable: false,
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
