export type TriggerType = 'BOSAN' | 'STRES' | 'NONGKRONG' | 'LAPAR_ASLI' | 'LAPAR_MALAM';

export interface TriggerOption {
  type: TriggerType;
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type BodyType = 'easy_gain' | 'normal' | 'hard_gain';

export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  bodyType: BodyType; // easy_gain | normal | hard_gain
  targetDeficitKcal: number; // e.g. 500 kkal
  bedtimeHour: number; // 24-hr format, e.g. 23 (11 PM)
  fastingTargetHours: number; // e.g. 16 hours
  lastMealTimestamp?: string | null; // ISO String or null if no meals recorded
  fastingStartedAt?: string | null; // intentional fasting session, separate from last meal
  isCheatDay: boolean;
}

export interface NutritionData {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
}

export interface FoodItemBreakdown {
  name: string;
  calories: number;
}

export interface MealLog {
  id: string;
  timestamp: string; // ISO string
  name: string;
  isSnack: boolean;
  trigger?: TriggerType;
  nutrition: NutritionData;
  source: 'ai' | 'manual';
  itemsBreakdown?: FoodItemBreakdown[];
  notes?: string;
}

export type ActivityStepOverlap = 'high' | 'medium' | 'low';

export interface ActivityLog {
  id: string;
  timestamp: string;
  name: string;
  durationMinutes: number;
  met: number;
  estimatedCalories: number;
  creditedCalories: number;
  stepOverlap: ActivityStepOverlap;
  source: 'ai' | 'local';
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

export type AIConnectionStatus =
  | 'not_configured'
  | 'checking'
  | 'connected'
  | 'invalid_key'
  | 'rate_limited'
  | 'offline';

export interface WeightLog {
  id: string;
  weightKg: number;
  recordedAt: string; // ISO string
  note?: string;
}

export type WeightTrend = 'down' | 'stable' | 'up';
