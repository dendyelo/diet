export type TriggerType = 'BOSAN' | 'STRES' | 'NONGKRONG' | 'LAPAR_ASLI' | 'LAPAR_MALAM';

export interface TriggerOption {
  type: TriggerType;
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  targetDeficitKcal: number; // e.g. 500 kcal
  bedtimeHour: number; // 24-hr format, e.g. 23 (11 PM)
  lastMealTimestamp: string; // ISO String
  geminiApiKey: string;
  isCheatDay: boolean;
}

export interface NutritionData {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
}

export interface MealLog {
  id: string;
  timestamp: string; // ISO string
  name: string;
  isSnack: boolean;
  trigger?: TriggerType;
  nutrition: NutritionData;
  source: 'ai' | 'manual';
  notes?: string;
}

export interface FastingStage {
  id: string;
  name: string;
  description: string;
  minHours: number;
  maxHours: number;
  color: string;
  iconName: string;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalCaloriesIn: number;
  totalCaloriesOut: number;
  netDeficit: number;
  waterGlasses: number;
  stepCount: number;
  isCheatDay: boolean;
  snackCount: number;
}
