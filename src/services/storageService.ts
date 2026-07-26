import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, MealLog, DailySummary } from '../types';

const KEYS = {
  USER_PROFILE: '@habitdiet_user_profile',
  MEAL_LOGS: '@habitdiet_meal_logs',
  WATER_GLASSES: '@habitdiet_water_glasses',
  STEP_COUNT: '@habitdiet_step_count',
  LAST_LOGGED_DATE: '@habitdiet_last_date',
};

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Teman Diet',
  age: 26,
  gender: 'male',
  heightCm: 170,
  weightKg: 70,
  targetWeightKg: 65,
  activityLevel: 'light',
  targetDeficitKcal: 500,
  bedtimeHour: 23,
  lastMealTimestamp: new Date().toISOString(),
  geminiApiKey: '',
  isCheatDay: false,
};

export async function loadUserProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    if (data) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
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
      return JSON.parse(data);
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

export async function loadStepCount(dateStr: string): Promise<number> {
  try {
    const key = `${KEYS.STEP_COUNT}_${dateStr}`;
    const data = await AsyncStorage.getItem(key);
    return data ? parseInt(data, 10) : 0;
  } catch (error) {
    console.error('Error loading step count:', error);
    return 0;
  }
}

export async function saveStepCount(dateStr: string, count: number): Promise<void> {
  try {
    const key = `${KEYS.STEP_COUNT}_${dateStr}`;
    await AsyncStorage.setItem(key, count.toString());
  } catch (error) {
    console.error('Error saving step count:', error);
  }
}
