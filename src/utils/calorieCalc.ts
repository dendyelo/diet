import { UserProfile, ActivityLevel, BodyType } from '../types';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const BODY_TYPE_MULTIPLIERS: Record<BodyType, number> = {
  easy_gain: 0.93, // Slow metabolism / Endomorph (-7% adjustment)
  normal: 1.0,    // Normal metabolism / Mesomorph
  hard_gain: 1.07, // Fast metabolism / Ectomorph (+7% adjustment)
};

export const BODY_TYPE_INFO: Record<BodyType, { label: string; emoji: string; desc: string; color: string }> = {
  easy_gain: {
    label: 'Mudah Naik Berat (Lambat)',
    emoji: '🐢',
    desc: 'Metabolisme cenderung efisien menyimpan lemak. Target kalori disesuaikan presisi.',
    color: '#F59E0B',
  },
  normal: {
    label: 'Normal / Seimbang',
    emoji: '⚖️',
    desc: 'Metabolisme seimbang. Perhitungan BMR & TDEE standar presisi.',
    color: '#10B981',
  },
  hard_gain: {
    label: 'Susah Naik Berat (Cepat)',
    emoji: '⚡',
    desc: 'Metabolisme cenderung cepat membakar kalori (NEAT tinggi).',
    color: '#60A5FA',
  },
};

/**
 * Calculate Basal Metabolic Rate (BMR) for 24 hours using Mifflin-St Jeor Formula
 * Fine-tuned with personalized Body Type Metabolic Adjustment.
 */
export function calculateBMR(profile: UserProfile): number {
  let weightKg = Number(profile.weightKg);
  if (isNaN(weightKg) || weightKg < 30 || weightKg > 250) {
    weightKg = 70;
  }

  let heightCm = Number(profile.heightCm);
  if (isNaN(heightCm) || heightCm < 100 || heightCm > 230) {
    heightCm = 170;
  }

  let age = Number(profile.age);
  if (isNaN(age) || age < 10 || age > 100) {
    age = 26;
  }

  const gender = profile.gender === 'female' ? 'female' : 'male';
  const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const rawBMR = Math.round(gender === 'male' ? baseBMR + 5 : baseBMR - 161);

  // Apply Body Type Metabolic Multiplier
  const bodyMultiplier = BODY_TYPE_MULTIPLIERS[profile.bodyType || 'normal'] || 1.0;
  const adjustedBMR = Math.round(rawBMR * bodyMultiplier);

  return Math.min(2800, Math.max(900, adjustedBMR));
}

/**
 * Calculate Pro-Rated BMR accumulated up to the current minute of the day.
 */
export function calculateElapsedBMR(dailyBMR: number, dateObj: Date = new Date()): number {
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const seconds = dateObj.getSeconds();

  const totalSecondsInDay = 24 * 3600;
  const elapsedSecondsInDay = hours * 3600 + minutes * 60 + seconds;

  const fraction = Math.min(1, Math.max(0, elapsedSecondsInDay / totalSecondsInDay));
  return Math.round(dailyBMR * fraction);
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
 * Calculate active calories burned directly from steps matching Apple Health / Garmin
 */
export function calculateStepCalories(steps: number, weightKg: number): number {
  if (!steps || steps <= 0) return 0;
  let userWeight = Number(weightKg);
  if (isNaN(userWeight) || userWeight < 30 || userWeight > 250) {
    userWeight = 70;
  }
  const caloriesPerStep = userWeight * 0.00041;
  return Math.round(steps * caloriesPerStep);
}

/**
 * Real-time Synchronized Energy Balance
 */
export function calculateEnergyBalance(
  profile: UserProfile,
  totalCaloriesIn: number,
  steps: number,
  dateObj: Date = new Date()
) {
  const dailyBMR = calculateBMR(profile);
  const elapsedBMR = calculateElapsedBMR(dailyBMR, dateObj);
  const stepCalories = calculateStepCalories(steps, profile.weightKg);

  const totalCaloriesOut = elapsedBMR + stepCalories;
  const netBalance = totalCaloriesOut - totalCaloriesIn;
  const targetDeficit = profile.isCheatDay ? 0 : (profile.targetDeficitKcal || 500);

  const isDeficit = netBalance >= 0;
  const percentageToGoal = Math.min(
    100,
    Math.max(0, Math.round((netBalance / (targetDeficit || 500)) * 100))
  );

  return {
    dailyBMR,
    elapsedBMR,
    stepCalories,
    totalCaloriesOut,
    totalCaloriesIn,
    netBalance,
    isDeficit,
    targetDeficit,
    percentageToGoal,
  };
}
