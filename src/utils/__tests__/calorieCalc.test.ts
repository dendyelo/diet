import {
  calculateBMR,
  calculateElapsedBMR,
  calculateTDEE,
  calculateStepCalories,
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

  test('calculateBMR applies body type multipliers correctly', () => {
    const normalBMR = calculateBMR({ ...MOCK_MALE_PROFILE, bodyType: 'normal' });
    const easyGainBMR = calculateBMR({ ...MOCK_MALE_PROFILE, bodyType: 'easy_gain' });
    const hardGainBMR = calculateBMR({ ...MOCK_MALE_PROFILE, bodyType: 'hard_gain' });

    expect(easyGainBMR).toBeLessThan(normalBMR);
    expect(hardGainBMR).toBeGreaterThan(normalBMR);
    expect(easyGainBMR).toBe(Math.round(normalBMR * BODY_TYPE_MULTIPLIERS.easy_gain));
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
});
