import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityLog, UserProfile, MealLog, WeightLog } from '../types';

const SCHEMA_VERSION = 6;

const KEYS = {
  SCHEMA_VERSION: '@habitdiet_schema_version',
  USER_PROFILE: '@habitdiet_user_profile',
  MEAL_LOGS: '@habitdiet_meal_logs',
  WATER_GLASSES: '@habitdiet_water_glasses',
  STEP_RECORD: '@habitdiet_step_record',
  LEGACY_STEP_COUNT: '@habitdiet_step_count',
  WEIGHT_LOGS: '@habitdiet_weight_logs',
  ACTIVITY_LOGS: '@habitdiet_activity_logs',
};

export interface StepRecord {
  sensorSteps: number;
  manualSteps: number;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Teman Diet',
  age: 26,
  gender: 'male',
  heightCm: 170,
  weightKg: 70,
  targetWeightKg: 65,
  activityLevel: 'light',
  bodyType: 'normal',
  targetDeficitKcal: 500,
  bedtimeHour: 23,
  fastingTargetHours: 16,
  lastMealTimestamp: new Date().toISOString(),
  isCheatDay: false,
};

/**
 * Fault-Tolerant Serialized Write Queue.
 * If one task fails, subsequent queued tasks ALWAYS continue safely.
 */
class AsyncStorageQueue {
  private queue: Promise<any> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = this.queue.then(task, task);
      this.queue = run.then(
        () => undefined,
        () => undefined
      );
      run.then(resolve, reject);
    });
  }
}

export const storageQueue = new AsyncStorageQueue();

/**
 * Step-by-Step Explicit Schema Migrations (V1 -> V5)
 */
export async function runStepByStepMigrations(currentVersion: number): Promise<void> {
  let ver = currentVersion;

  // V1 -> V2: Body Type & Fasting Target
  if (ver < 2) {
    const profileData = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    if (profileData) {
      const parsed = JSON.parse(profileData);
      if (!parsed.bodyType) parsed.bodyType = 'normal';
      if (!parsed.fastingTargetHours) parsed.fastingTargetHours = 16;
      await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(parsed));
    }
    ver = 2;
  }

  // V2 -> V3: Pedometer StepRecord Separation
  if (ver < 3) {
    // Migration handled in loadStepRecord fallback
    ver = 3;
  }

  // V3 -> V4: SecureStore API Key Removal from Profile
  if (ver < 4) {
    const profileData = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    if (profileData) {
      const parsed = JSON.parse(profileData);
      delete parsed.geminiApiKey;
      await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(parsed));
    }
    ver = 4;
  }

  // V4 -> V5: Nullable lastMealTimestamp & Sanitized Fields
  if (ver < 5) {
    const profileData = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    if (profileData) {
      const parsed = JSON.parse(profileData);
      if (parsed.lastMealTimestamp && Number.isNaN(new Date(parsed.lastMealTimestamp).getTime())) {
        parsed.lastMealTimestamp = null;
      }
      await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(parsed));
    }
    ver = 5;
  }

  // V5 -> V6: Weight Tracking - seed initial weight log from profile
  if (ver < 6) {
    const existingLogs = await AsyncStorage.getItem(KEYS.WEIGHT_LOGS);
    if (!existingLogs) {
      const profileData = await AsyncStorage.getItem(KEYS.USER_PROFILE);
      if (profileData) {
        const parsed = JSON.parse(profileData);
        if (parsed.weightKg && typeof parsed.weightKg === 'number' && parsed.weightKg >= 20 && parsed.weightKg <= 300) {
          const seedLog: WeightLog = {
            id: 'weight-profile-seed-v6',
            weightKg: parsed.weightKg,
            recordedAt: new Date().toISOString(),
            note: 'Berat dari profil saat fitur Weight Tracking diaktifkan',
          };
          await AsyncStorage.setItem(KEYS.WEIGHT_LOGS, JSON.stringify([seedLog]));
        }
      }
    }
    ver = 6;
  }

  await AsyncStorage.setItem(KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());
}

/**
 * Storage Schema Migration Engine
 */
export async function migrateStorageIfNeeded(): Promise<void> {
  return storageQueue.enqueue(async () => {
    try {
      const currentVersionStr = await AsyncStorage.getItem(KEYS.SCHEMA_VERSION);
      const currentVersion = currentVersionStr ? parseInt(currentVersionStr, 10) : 1;

      if (currentVersion < SCHEMA_VERSION) {
        console.log(`Migrating AsyncStorage from Schema V${currentVersion} to V${SCHEMA_VERSION}...`);
        await runStepByStepMigrations(currentVersion);
        console.log(`AsyncStorage Schema Migration to V${SCHEMA_VERSION} Complete.`);
      }
    } catch (error) {
      console.error('Error during storage migration:', error);
    }
  });
}

export async function loadUserProfile(): Promise<UserProfile> {
  try {
    await migrateStorageIfNeeded();
    const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    if (data) {
      const parsed = JSON.parse(data);
      const profile: UserProfile = { ...DEFAULT_PROFILE, ...parsed };

      // Strict Field Sanitization
      if (typeof profile.weightKg !== 'number' || profile.weightKg < 30 || profile.weightKg > 250) {
        profile.weightKg = DEFAULT_PROFILE.weightKg;
      }
      if (typeof profile.heightCm !== 'number' || profile.heightCm < 100 || profile.heightCm > 250) {
        profile.heightCm = DEFAULT_PROFILE.heightCm;
      }
      if (typeof profile.age !== 'number' || profile.age < 10 || profile.age > 100) {
        profile.age = DEFAULT_PROFILE.age;
      }
      if (!['easy_gain', 'normal', 'hard_gain'].includes(profile.bodyType)) {
        profile.bodyType = 'normal';
      }
      if (profile.lastMealTimestamp && Number.isNaN(new Date(profile.lastMealTimestamp).getTime())) {
        profile.lastMealTimestamp = null;
      }

      return profile;
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
  }
  return DEFAULT_PROFILE;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  return storageQueue.enqueue(async () => {
    try {
      await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  });
}

/**
 * Load Meal Logs with Strict Schema Validation
 */
export async function loadMealLogs(): Promise<MealLog[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.MEAL_LOGS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter((log: any) => {
          if (!log || typeof log !== 'object') return false;
          if (typeof log.id !== 'string' || log.id.trim() === '') return false;
          if (typeof log.name !== 'string' || log.name.trim() === '') return false;
          if (typeof log.isSnack !== 'boolean') return false;
          if (!log.timestamp || Number.isNaN(new Date(log.timestamp).getTime())) return false;
          if (!log.nutrition || typeof log.nutrition !== 'object') return false;

          const cal = Number(log.nutrition.calories);
          if (Number.isNaN(cal) || cal < 0) return false;

          // Sanitize non-negative nutrition numbers
          log.nutrition.calories = Math.max(0, cal);
          log.nutrition.proteinGrams = Math.max(0, Number(log.nutrition.proteinGrams) || 0);
          log.nutrition.carbsGrams = Math.max(0, Number(log.nutrition.carbsGrams) || 0);
          log.nutrition.fatGrams = Math.max(0, Number(log.nutrition.fatGrams) || 0);

          if (log.source !== 'ai' && log.source !== 'manual') {
            log.source = 'manual';
          }

          return true;
        });
      }
    }
  } catch (error) {
    console.error('Error loading meal logs:', error);
  }
  return [];
}

export async function saveMealLogs(logs: MealLog[]): Promise<void> {
  return storageQueue.enqueue(async () => {
    try {
      await AsyncStorage.setItem(KEYS.MEAL_LOGS, JSON.stringify(logs));
    } catch (error) {
      console.error('Error saving meal logs:', error);
    }
  });
}

export async function loadWaterGlasses(dateStr: string): Promise<number> {
  try {
    const key = `${KEYS.WATER_GLASSES}_${dateStr}`;
    const data = await AsyncStorage.getItem(key);
    return data ? Math.max(0, parseInt(data, 10) || 0) : 0;
  } catch (error) {
    console.error('Error loading water glasses:', error);
    return 0;
  }
}

export async function saveWaterGlasses(dateStr: string, count: number): Promise<void> {
  return storageQueue.enqueue(async () => {
    try {
      const key = `${KEYS.WATER_GLASSES}_${dateStr}`;
      await AsyncStorage.setItem(key, Math.max(0, count).toString());
    } catch (error) {
      console.error('Error saving water glasses:', error);
    }
  });
}

export async function loadStepRecord(dateStr: string): Promise<StepRecord> {
  try {
    const key = `${KEYS.STEP_RECORD}_${dateStr}`;
    const data = await AsyncStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        sensorSteps: Math.max(0, Number(parsed.sensorSteps) || 0),
        manualSteps: Math.max(0, Number(parsed.manualSteps) || 0),
      };
    }

    const legacyKey = `${KEYS.LEGACY_STEP_COUNT}_${dateStr}`;
    const legacyData = await AsyncStorage.getItem(legacyKey);
    if (legacyData) {
      const legacyCount = Math.max(0, parseInt(legacyData, 10) || 0);
      const newRecord: StepRecord = { sensorSteps: legacyCount, manualSteps: 0 };
      await saveStepRecord(dateStr, newRecord);
      await AsyncStorage.removeItem(legacyKey);
      return newRecord;
    }
  } catch (error) {
    console.error('Error loading step record:', error);
  }
  return { sensorSteps: 0, manualSteps: 0 };
}

export async function saveStepRecord(dateStr: string, record: StepRecord): Promise<void> {
  return storageQueue.enqueue(async () => {
    try {
      const key = `${KEYS.STEP_RECORD}_${dateStr}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        sensorSteps: Math.max(0, record.sensorSteps || 0),
        manualSteps: Math.max(0, record.manualSteps || 0),
      }));
    } catch (error) {
      console.error('Error saving step record:', error);
    }
  });
}

export async function loadActivityLogs(dateStr: string): Promise<ActivityLog[]> {
  try {
    const data = await AsyncStorage.getItem(`${KEYS.ACTIVITY_LOGS}_${dateStr}`);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is ActivityLog => {
        if (!item || typeof item !== 'object') return false;
        if (typeof item.id !== 'string' || typeof item.name !== 'string') return false;
        if (!item.timestamp || Number.isNaN(new Date(item.timestamp).getTime())) return false;
        return (
          Number(item.durationMinutes) > 0 &&
          Number(item.met) >= 1 &&
          Number(item.estimatedCalories) >= 0 &&
          Number(item.creditedCalories) >= 0
        );
      })
      .map((item) => ({
        ...item,
        durationMinutes: Math.min(720, Math.max(1, Number(item.durationMinutes))),
        met: Math.min(20, Math.max(1, Number(item.met))),
        estimatedCalories: Math.round(Math.max(0, Number(item.estimatedCalories))),
        creditedCalories: Math.round(Math.max(0, Number(item.creditedCalories))),
        stepOverlap: ['high', 'medium', 'low'].includes(item.stepOverlap)
          ? item.stepOverlap
          : 'medium',
        source: item.source === 'ai' ? 'ai' : 'local',
      }));
  } catch (error) {
    console.error('Error loading activity logs:', error);
    return [];
  }
}

export async function saveActivityLogs(
  dateStr: string,
  logs: ActivityLog[]
): Promise<void> {
  return storageQueue.enqueue(async () => {
    await AsyncStorage.setItem(
      `${KEYS.ACTIVITY_LOGS}_${dateStr}`,
      JSON.stringify(logs)
    );
  });
}

/**
 * Load Weight Logs with Strict Schema Validation
 */
export async function loadWeightLogs(): Promise<WeightLog[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.WEIGHT_LOGS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter((log: any) => {
          if (!log || typeof log !== 'object') return false;
          if (typeof log.id !== 'string' || log.id.trim() === '') return false;
          if (typeof log.weightKg !== 'number' || log.weightKg < 20 || log.weightKg > 300) return false;
          if (!log.recordedAt || Number.isNaN(new Date(log.recordedAt).getTime())) return false;
          return true;
        });
      }
    }
  } catch (error) {
    console.error('Error loading weight logs:', error);
  }
  return [];
}

export async function saveWeightLogs(logs: WeightLog[]): Promise<void> {
  return storageQueue.enqueue(async () => {
    try {
      await AsyncStorage.setItem(KEYS.WEIGHT_LOGS, JSON.stringify(logs));
    } catch (error) {
      console.error('Error saving weight logs:', error);
    }
  });
}
