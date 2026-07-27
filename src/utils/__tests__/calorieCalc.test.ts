import {
  calculateBMR,
  calculateElapsedBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateAdjustedTargetCalories,
  calculateEffectiveDeficit,
  calculateStepCalories,
  calculateActivitySummary,
  calculateEnergyBalance,
  BODY_TYPE_MULTIPLIERS,
} from '../calorieCalc';
import { UserProfile } from '../../types';

const MOCK_MALE_PROFILE: UserProfile = {
  name: 'Test Male',
  age: 30,
  gender: 'male',
  heightCm: 175,
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

describe('Calorie Calculation Utility Suite', () => {
  test('calculateBMR calculates correct Mifflin-St Jeor BMR for male', () => {
    const bmr = calculateBMR(MOCK_MALE_PROFILE);
    expect(bmr).toBeGreaterThanOrEqual(1600);
    expect(bmr).toBeLessThanOrEqual(1700);
  });

  test('body response adjusts TDEE slightly without changing BMR', () => {
    const normalBMR = calculateBMR({ ...MOCK_MALE_PROFILE, bodyType: 'normal' });
    const easyGainBMR = calculateBMR({ ...MOCK_MALE_PROFILE, bodyType: 'easy_gain' });
    const hardGainBMR = calculateBMR({ ...MOCK_MALE_PROFILE, bodyType: 'hard_gain' });

    expect(easyGainBMR).toBe(normalBMR);
    expect(hardGainBMR).toBe(normalBMR);
    expect(
      calculateTDEE({ ...MOCK_MALE_PROFILE, bodyType: 'easy_gain' })
    ).toBeLessThan(calculateTDEE(MOCK_MALE_PROFILE));
    expect(
      calculateTDEE({ ...MOCK_MALE_PROFILE, bodyType: 'hard_gain' })
    ).toBeGreaterThan(calculateTDEE(MOCK_MALE_PROFILE));
    expect(BODY_TYPE_MULTIPLIERS.easy_gain).toBe(0.95);
  });

  test('calculateElapsedBMR pro-rates 24-hour BMR correctly for noon (12:00 PM)', () => {
    const dailyBMR = 2400;
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);

    const elapsed = calculateElapsedBMR(dailyBMR, noon);
    expect(elapsed).toBe(1200);
  });

  test('calculateStepCalories estimates active burn accurately (~287 kcal per 10k steps)', () => {
    const burn = calculateStepCalories(10000, 70);
    expect(burn).toBeGreaterThanOrEqual(280);
    expect(burn).toBeLessThanOrEqual(295);
  });

  test('activity summary avoids double-counting steps already included in TDEE', () => {
    const baseline = calculateActivitySummary(MOCK_MALE_PROFILE, 5000);
    const aboveBaseline = calculateActivitySummary(MOCK_MALE_PROFILE, 10000);

    expect(baseline.baselineSteps).toBe(5000);
    expect(baseline.activityBonusCalories).toBe(0);
    expect(baseline.adjustedMaintenance).toBe(baseline.baseMaintenance);

    expect(aboveBaseline.bonusSteps).toBe(5000);
    expect(aboveBaseline.stepCalories).toBe(calculateStepCalories(10000, 70));
    expect(aboveBaseline.activityBonusCalories).toBe(
      calculateStepCalories(5000, 70)
    );
    expect(aboveBaseline.adjustedMaintenance).toBe(
      aboveBaseline.baseMaintenance + aboveBaseline.activityBonusCalories
    );
  });

  test('activity summary derives a clear step goal from profile activity', () => {
    const light = calculateActivitySummary(MOCK_MALE_PROFILE, 3750);
    const active = calculateActivitySummary(
      { ...MOCK_MALE_PROFILE, activityLevel: 'active' },
      11000
    );

    expect(light.stepGoal).toBe(7500);
    expect(light.stepProgressPct).toBe(50);
    expect(active.stepGoal).toBe(11000);
    expect(active.stepProgressPct).toBe(100);
  });

  test('calculateEnergyBalance identifies Deficit vs Surplus accurately', () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);

    const deficitResult = calculateEnergyBalance(MOCK_MALE_PROFILE, 500, 10000, noon);
    expect(deficitResult.isDeficit).toBe(true);
    expect(deficitResult.netBalance).toBeGreaterThan(0);

    const surplusResult = calculateEnergyBalance(MOCK_MALE_PROFILE, 2500, 0, noon);
    expect(surplusResult.isDeficit).toBe(false);
    expect(surplusResult.netBalance).toBeLessThan(0);
  });

  test('energy expenditure accrues with time instead of exposing full TDEE as burned', () => {
    const morning = new Date();
    morning.setHours(6, 0, 0, 0);
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);

    const morningEnergy = calculateEnergyBalance(
      MOCK_MALE_PROFILE,
      0,
      0,
      morning
    );
    const noonEnergy = calculateEnergyBalance(
      MOCK_MALE_PROFILE,
      0,
      0,
      noon
    );

    expect(morningEnergy.totalCaloriesOut).toBeLessThan(
      noonEnergy.totalCaloriesOut
    );
    expect(noonEnergy.totalCaloriesOut).toBeLessThan(
      noonEnergy.adjustedMaintenance
    );
    expect(noonEnergy.elapsedMaintenanceProgressPct).toBe(50);
  });

  test('profile activity changes projected TDEE but accrues over time', () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    const sedentaryProfile = {
      ...MOCK_MALE_PROFILE,
      activityLevel: 'sedentary' as const,
    };
    const activeProfile = {
      ...MOCK_MALE_PROFILE,
      activityLevel: 'active' as const,
    };
    const sedentary = calculateEnergyBalance(
      sedentaryProfile,
      0,
      0,
      noon
    );
    const active = calculateEnergyBalance(activeProfile, 0, 0, noon);

    expect(active.adjustedMaintenance).toBeGreaterThan(
      sedentary.adjustedMaintenance
    );
    expect(active.totalCaloriesOut).toBeGreaterThan(
      sedentary.totalCaloriesOut
    );
    expect(active.totalCaloriesOut).toBeLessThan(active.adjustedMaintenance);
    expect(active.elapsedMaintenanceProgressPct).toBe(50);
  });

  test('body response adjustment also accrues instead of being burned instantly', () => {
    const sixAM = new Date();
    sixAM.setHours(6, 0, 0, 0);
    const hardGain = calculateEnergyBalance(
      { ...MOCK_MALE_PROFILE, bodyType: 'hard_gain' },
      0,
      0,
      sixAM
    );

    expect(hardGain.totalCaloriesOut).toBeLessThan(
      hardGain.adjustedMaintenance
    );
    expect(hardGain.elapsedMaintenanceProgressPct).toBe(25);
  });

  test('confirmed narrated activity increases today’s energy need', () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    const withoutActivity = calculateEnergyBalance(
      MOCK_MALE_PROFILE,
      0,
      0,
      noon
    );
    const withActivity = calculateEnergyBalance(
      MOCK_MALE_PROFILE,
      0,
      0,
      noon,
      240
    );

    expect(withActivity.loggedActivityCalories).toBe(240);
    expect(withActivity.adjustedMaintenance - withoutActivity.adjustedMaintenance).toBe(240);
    expect(withActivity.totalCaloriesOut - withoutActivity.totalCaloriesOut).toBe(240);
  });

  test('calculateTargetCalories applies deficit and cheat day correctly', () => {
    const normalTarget = calculateTargetCalories(MOCK_MALE_PROFILE);
    const cheatDayTarget = calculateTargetCalories({ ...MOCK_MALE_PROFILE, isCheatDay: true });

    expect(normalTarget).toBe(calculateTDEE(MOCK_MALE_PROFILE) - 500);
    expect(cheatDayTarget).toBe(calculateTDEE(MOCK_MALE_PROFILE));
  });

  test('activity raises the eating plan while preserving the selected deficit', () => {
    const baselineMaintenance = calculateTDEE(MOCK_MALE_PROFILE);
    const activeMaintenance = baselineMaintenance + 420;

    expect(
      calculateAdjustedTargetCalories(MOCK_MALE_PROFILE, activeMaintenance)
    ).toBe(activeMaintenance - MOCK_MALE_PROFILE.targetDeficitKcal);
  });

  test('caps an excessive deficit and reports the effective value', () => {
    const profile = { ...MOCK_MALE_PROFILE, targetDeficitKcal: 1500 };
    const maintenance = calculateTDEE(profile);
    const expectedEffectiveDeficit = Math.min(1000, maintenance - 1200);

    expect(calculateEffectiveDeficit(profile, maintenance)).toBe(
      expectedEffectiveDeficit
    );
    expect(calculateTargetCalories(profile)).toBe(
      maintenance - expectedEffectiveDeficit
    );
  });

  test('does not apply a deficit for a maintain or gain goal', () => {
    const profile = {
      ...MOCK_MALE_PROFILE,
      targetWeightKg: MOCK_MALE_PROFILE.weightKg,
    };

    expect(
      calculateEffectiveDeficit(profile, calculateTDEE(profile))
    ).toBe(0);
    expect(calculateTargetCalories(profile)).toBe(calculateTDEE(profile));
  });
});
