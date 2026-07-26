import { UserProfile, ActivityLevel } from '../types';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Formula
 */
export function calculateBMR(profile: UserProfile): number {
  const { weightKg, heightCm, age, gender } = profile;
  if (!weightKg || !heightCm || !age) return 1600;

  const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'male' ? baseBMR + 5 : baseBMR - 161);
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE) based on activity level
 */
export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel || 'light'] || 1.375;
  return Math.round(bmr * multiplier);
}

/**
 * Calculate active calories burned directly from steps matching Apple Health / Garmin:
 * ~287 kcal per 10,000 steps for 70kg adult
 */
export function calculateStepCalories(steps: number, weightKg: number): number {
  if (!steps || steps <= 0) return 0;
  const userWeight = weightKg || 70;
  const caloriesPerStep = userWeight * 0.00041;
  return Math.round(steps * caloriesPerStep);
}

/**
 * Synchronized Net Energy Balance (Deficit or Surplus)
 * Calorie OUT = Resting BMR + Active Step Calories (100% Synchronized with Steps!)
 */
export function calculateEnergyBalance(
  profile: UserProfile,
  totalCaloriesIn: number,
  steps: number
) {
  const bmr = calculateBMR(profile);
  const stepCalories = calculateStepCalories(steps, profile.weightKg);
  
  // Direct synchronization: BMR (Resting) + Step Burn (Active)
  const totalCaloriesOut = bmr + stepCalories;
  const netBalance = totalCaloriesOut - totalCaloriesIn; // Positive = Deficit, Negative = Surplus
  const targetDeficit = profile.isCheatDay ? 0 : (profile.targetDeficitKcal || 500);

  const isDeficit = netBalance >= 0;
  const percentageToGoal = Math.min(
    100,
    Math.max(0, Math.round((netBalance / (targetDeficit || 500)) * 100))
  );

  return {
    bmr,
    stepCalories,
    totalCaloriesOut,
    netBalance, // if positive, calories burned > eaten (DEFICIT)
    isDeficit,
    targetDeficit,
    percentageToGoal,
  };
}
