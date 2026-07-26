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
  if (!weightKg || !heightCm || !age) return 1600; // Default fallback

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
 * Calculate active calories burned from walking steps
 */
export function calculateStepCalories(steps: number, weightKg: number): number {
  if (!steps || steps <= 0) return 0;
  const caloriesPerStep = (weightKg || 70) * 0.000571;
  return Math.round(steps * caloriesPerStep);
}

/**
 * Calculate Net Energy Balance (Deficit or Surplus)
 */
export function calculateEnergyBalance(
  profile: UserProfile,
  totalCaloriesIn: number,
  steps: number
) {
  const tdee = calculateTDEE(profile);
  const stepCalories = calculateStepCalories(steps, profile.weightKg);
  const totalCaloriesOut = tdee + stepCalories;
  const netBalance = totalCaloriesOut - totalCaloriesIn; // Positive = Deficit, Negative = Surplus
  const targetDeficit = profile.isCheatDay ? 0 : (profile.targetDeficitKcal || 500);

  const isDeficit = netBalance >= 0;
  const percentageToGoal = Math.min(
    100,
    Math.max(0, Math.round((netBalance / (targetDeficit || 500)) * 100))
  );

  return {
    tdee,
    stepCalories,
    totalCaloriesOut,
    netBalance, // if positive, calories burned > eaten (DEFICIT)
    isDeficit,
    targetDeficit,
    percentageToGoal,
  };
}
