import { UserProfile, ActivityLevel, BodyType } from '../types';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Step baselines are product heuristics used to avoid adding the same everyday
 * movement twice: once through the activity multiplier and again as steps.
 */
export const ACTIVITY_STEP_BASELINES: Record<ActivityLevel, number> = {
  sedentary: 3000,
  light: 5000,
  moderate: 7500,
  active: 9000,
  very_active: 11000,
};

export const ACTIVITY_STEP_GOALS: Record<ActivityLevel, number> = {
  sedentary: 6000,
  light: 7500,
  moderate: 9000,
  active: 11000,
  very_active: 13000,
};

export const BODY_TYPE_MULTIPLIERS: Record<BodyType, number> = {
  easy_gain: 0.95,
  normal: 1.0,
  hard_gain: 1.05,
};

export const BODY_TYPE_INFO: Record<BodyType, { label: string; emoji: string; desc: string; color: string }> = {
  easy_gain: {
    label: 'Mudah Naik Berat (Lambat)',
    emoji: '🐢',
    desc: 'Berat badan cenderung mudah naik. Menurunkan perkiraan kebutuhan harian sedikit, tanpa mengubah BMR.',
    color: '#F59E0B',
  },
  normal: {
    label: 'Normal / Seimbang',
    emoji: '⚖️',
    desc: 'Metabolisme seimbang. Perkiraan kebutuhan energi menggunakan rumus standar.',
    color: '#10B981',
  },
  hard_gain: {
    label: 'Susah Naik Berat (Cepat)',
    emoji: '⚡',
    desc: 'Berat badan cenderung sulit naik. Menaikkan perkiraan kebutuhan harian sedikit, tanpa mengubah BMR.',
    color: '#60A5FA',
  },
};

/**
 * Calculate Basal Metabolic Rate (BMR) for 24 hours using Mifflin-St Jeor Formula
 * Body type is intentionally not used as a metabolic multiplier because it is
 * not a measured physiological input.
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

  return Math.min(2800, Math.max(900, rawBMR));
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
 * Calculate conservative baseline daily expenditure. Deliberate movement is
 * added from actual steps and narrated activities instead of a profile
 * multiplier, preventing the same exercise from being counted twice.
 */
export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  const activityLevel = profile.activityLevel || 'light';
  const bodyType = profile.bodyType || 'normal';
  return Math.round(
    bmr *
      ACTIVITY_MULTIPLIERS[activityLevel] *
      BODY_TYPE_MULTIPLIERS[bodyType]
  );
}

export function calculateEffectiveDeficit(
  profile: UserProfile,
  maintenanceCalories: number
): number {
  if (
    profile.isCheatDay ||
    Number(profile.targetWeightKg) >= Number(profile.weightKg)
  ) {
    return 0;
  }

  const requested = Number.isFinite(Number(profile.targetDeficitKcal))
    ? Math.round(Number(profile.targetDeficitKcal))
    : 500;
  const safeRequested = Math.min(1000, Math.max(100, requested));
  const safeMaintenance = Math.max(0, Math.round(maintenanceCalories));

  return Math.min(safeRequested, Math.max(0, safeMaintenance - 1200));
}

/**
 * Calculate target daily calorie intake after applying deficit
 */
export function calculateTargetCalories(profile: UserProfile): number {
  const tdee = calculateTDEE(profile);
  const deficit = calculateEffectiveDeficit(profile, tdee);
  return Math.max(1200, tdee - deficit);
}

export function calculateAdjustedTargetCalories(
  profile: UserProfile,
  adjustedMaintenance: number
): number {
  const safeMaintenance = Math.max(
    calculateTDEE(profile),
    Math.round(Number(adjustedMaintenance) || 0)
  );
  const deficit = calculateEffectiveDeficit(profile, safeMaintenance);
  return Math.max(1200, safeMaintenance - deficit);
}

/**
 * Calculate target daily protein intake based on body weight (1.5g per kg)
 * Single Source of Truth across the entire app
 */
export function calculateTargetProtein(profile: UserProfile): number {
  let weightKg = Number(profile.weightKg);
  if (isNaN(weightKg) || weightKg < 30 || weightKg > 250) {
    weightKg = 70;
  }
  return Math.round(weightKg * 1.5);
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
 * Calculate today's activity context without double-counting everyday movement.
 *
 * TDEE already contains a typical activity allowance. All step calories remain
 * visible as an estimate, but only steps above the profile baseline increase
 * today's maintenance threshold.
 */
export function calculateActivitySummary(
  profile: UserProfile,
  steps: number
) {
  const safeSteps = Math.max(
    0,
    Math.round(Number.isFinite(steps) ? steps : 0)
  );
  const activityLevel = profile.activityLevel || 'light';
  const baselineSteps = ACTIVITY_STEP_BASELINES[activityLevel];
  const stepGoal = ACTIVITY_STEP_GOALS[activityLevel];
  const bonusSteps = Math.max(0, safeSteps - baselineSteps);
  const stepCalories = calculateStepCalories(safeSteps, profile.weightKg);
  const activityBonusCalories = calculateStepCalories(
    bonusSteps,
    profile.weightKg
  );
  const baseMaintenance = calculateTDEE(profile);
  const adjustedMaintenance = baseMaintenance + activityBonusCalories;
  const stepProgressPct = Math.min(
    100,
    Math.max(0, Math.round((safeSteps / Math.max(1, stepGoal)) * 100))
  );

  return {
    steps: safeSteps,
    baselineSteps,
    stepGoal,
    bonusSteps,
    stepCalories,
    activityBonusCalories,
    baseMaintenance,
    adjustedMaintenance,
    stepProgressPct,
  };
}

/**
 * Real-time Synchronized Energy Balance
 */
export function calculateEnergyBalance(
  profile: UserProfile,
  totalCaloriesIn: number,
  steps: number,
  dateObj: Date = new Date(),
  loggedActivityCalories = 0
) {
  const dailyBMR = calculateBMR(profile);
  const elapsedBMR = calculateElapsedBMR(dailyBMR, dateObj);
  const activity = calculateActivitySummary(profile, steps);
  const safeLoggedActivityCalories = Math.max(
    0,
    Math.round(
      Number.isFinite(loggedActivityCalories) ? loggedActivityCalories : 0
    )
  );
  const adjustedMaintenance =
    activity.adjustedMaintenance + safeLoggedActivityCalories;
  const elapsedBaseMaintenance = calculateElapsedBMR(
    activity.baseMaintenance,
    dateObj
  );
  const activityCalories =
    Math.max(0, elapsedBaseMaintenance - elapsedBMR) +
    activity.activityBonusCalories +
    safeLoggedActivityCalories;
  const totalCaloriesOut =
    elapsedBaseMaintenance +
    activity.activityBonusCalories +
    safeLoggedActivityCalories;
  const elapsedMaintenanceProgressPct = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (totalCaloriesOut / Math.max(1, adjustedMaintenance)) * 100
      )
    )
  );
  const netBalance = totalCaloriesOut - totalCaloriesIn;
  const targetDeficit = calculateEffectiveDeficit(
    profile,
    adjustedMaintenance
  );

  const isDeficit = netBalance >= 0;
  const percentageToGoal = targetDeficit <= 0
    ? 100
    : Math.min(100, Math.max(0, Math.round((netBalance / targetDeficit) * 100)));

  return {
    dailyBMR,
    dailyTDEE: adjustedMaintenance,
    baseMaintenance: activity.baseMaintenance,
    adjustedMaintenance,
    elapsedBaseMaintenance,
    elapsedMaintenanceProgressPct,
    elapsedBMR,
    activityCalories,
    stepCalories: activity.stepCalories,
    activityBonusCalories: activity.activityBonusCalories,
    loggedActivityCalories: safeLoggedActivityCalories,
    baselineSteps: activity.baselineSteps,
    bonusSteps: activity.bonusSteps,
    stepGoal: activity.stepGoal,
    stepProgressPct: activity.stepProgressPct,
    totalCaloriesOut,
    totalCaloriesIn,
    netBalance,
    isDeficit,
    targetDeficit,
    percentageToGoal,
  };
}
