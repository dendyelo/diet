import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, MealLog } from '../types';

const SCHEMA_VERSION = 2;

const KEYS = {
  SCHEMA_VERSION: '@habitdiet_schema_version',
  USER_PROFILE: '@habitdiet_user_profile',
  MEAL_LOGS: '@habitdiet_meal_logs',
  WATER_GLASSES: '@habitdiet_water_glasses',
  STEP_RECORD: '@habitdiet_step_record',
  LEGACY_STEP_COUNT: '@habitdiet_step_count',
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
 * Storage Schema Migration Engine (Auto Migration V1 -> V2)
 */
export async function migrateStorageIfNeeded(): Promise<void> {
  try {
    const currentVersionStr = await AsyncStorage.getItem(KEYS.SCHEMA_VERSION);
    const currentVersion = currentVersionStr ? parseInt(currentVersionStr, 10) : 1;

    if (currentVersion < SCHEMA_VERSION) {
      console.log(`Migrating AsyncStorage from Schema V${currentVersion} to V${SCHEMA_VERSION}...`);

      const profileData = await AsyncStorage.getItem(KEYS.USER_PROFILE);
      if (profileData) {
        const parsed = JSON.parse(profileData);
        if (!parsed.bodyType) parsed.bodyType = 'normal';
        if (!parsed.fastingTargetHours) parsed.fastingTargetHours = 16;
        delete parsed.geminiApiKey; // Stripped for SecureStore
        await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(parsed));
      }

      await AsyncStorage.setItem(KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());
      console.log(`AsyncStorage Schema Migration to V${SCHEMA_VERSION} Complete.`);
    }
  } catch (error) {
    console.error('Error during storage migration:', error);
  }
}

export async function loadUserProfile(): Promise<UserProfile> {
  try {
    await migrateStorageIfNeeded();
    const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    if (data) {
      const parsed = JSON.parse(data);
      const profile: UserProfile = { ...DEFAULT_PROFILE, ...parsed };

      // Sanitize loaded profile values
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

      return profile;
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
  }
  return DEFAULT_PROFILE;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
}

export async function loadMealLogs(): Promise<MealLog[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.MEAL_LOGS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Sanitize & filter valid meal logs
        return parsed.filter(
          (log) =>
            log &&
            typeof log.id === 'string' &&
            log.nutrition &&
            typeof log.nutrition.calories === 'number'
        );
      }
    }
  } catch (error) {
    console.error('Error loading meal logs:', error);
  }
  return [];
}

export async function saveMealLogs(logs: MealLog[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.MEAL_LOGS, JSON.stringify(logs));
  } catch (error) {
    console.error('Error saving meal logs:', error);
  }
}

export async function loadWaterGlasses(dateStr: string): Promise<number> {
  try {
    const key = `${KEYS.WATER_GLASSES}_${dateStr}`;
    const data = await AsyncStorage.getItem(key);
    return data ? parseInt(data, 10) : 0;
  } catch (error) {
    console.error('Error loading water glasses:', error);
    return 0;
  }
}

export async function saveWaterGlasses(dateStr: string, count: number): Promise<void> {
  try {
    const key = `${KEYS.WATER_GLASSES}_${dateStr}`;
    await AsyncStorage.setItem(key, count.toString());
  } catch (error) {
    console.error('Error saving water glasses:', error);
  }
}

/**
 * Load Step Record (sensor & manual steps) with legacy fallback migration
 */
export async function loadStepRecord(dateStr: string): Promise<StepRecord> {
  try {
    const key = `${KEYS.STEP_RECORD}_${dateStr}`;
    const data = await AsyncStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }

    // Legacy Fallback Migration
    const legacyKey = `${KEYS.LEGACY_STEP_COUNT}_${dateStr}`;
    const legacyData = await AsyncStorage.getItem(legacyKey);
    if (legacyData) {
      const legacyCount = parseInt(legacyData, 10) || 0;
      const newRecord: StepRecord = { sensorSteps: legacyCount, manualSteps: 0 };
      await AsyncStorage.setItem(key, JSON.stringify(newRecord));
      await AsyncStorage.removeItem(legacyKey);
      return newRecord;
    }
  } catch (error) {
    console.error('Error loading step record:', error);
  }
  return { sensorSteps: 0, manualSteps: 0 };
}

/**
 * Save Step Record (sensor & manual steps)
 */
export async function saveStepRecord(dateStr: string, record: StepRecord): Promise<void> {
  try {
    const key = `${KEYS.STEP_RECORD}_${dateStr}`;
    await AsyncStorage.setItem(key, JSON.stringify(record));
  } catch (error) {
    console.error('Error saving step record:', error);
  }
}
