import { decideHunger, HungerDecisionInput } from '../hungerDecision';

const base: HungerDecisionInput = {
  answer: 'hungry',
  signal: 'physical',
  intent: 'meal',
  caloriesIn: 900,
  targetCalories: 1800,
  maintenanceCalories: 2300,
  snackCount: 0,
  fastingHours: 4,
};

describe('decideHunger', () => {
  it('does not recommend food when the user says they are not hungry', () => {
    const result = decideHunger({ ...base, answer: 'not_hungry', signal: null, intent: null });

    expect(result.kind).toBe('none');
    expect(result.status).toBe('TIDAK LAPAR');
    expect(result.headline).toContain('ruang makan masih ada');
    expect(result.remainingCalories).toBe(900);
  });

  it('uses water and a pause for uncertainty or non-physical signals', () => {
    expect(decideHunger({ ...base, answer: 'unsure', signal: null }).kind).toBe('water');
    expect(decideHunger({ ...base, signal: 'specific_craving' }).kind).toBe('water');
    expect(decideHunger({ ...base, signal: 'emotion' }).kind).toBe('water');
  });

  it('allows a meal when physical hunger has comfortable calorie room', () => {
    const result = decideHunger(base);

    expect(result.kind).toBe('meal');
    expect(result.comfortThreshold).toBe(270);
    expect(result.maxSuggestedCalories).toBe(900);
  });

  it('caps a snack at 200 calories', () => {
    const result = decideHunger({ ...base, intent: 'snack' });

    expect(result.kind).toBe('snack');
    expect(result.maxSuggestedCalories).toBe(200);
  });

  it('recommends a small meal below the comfort threshold', () => {
    const result = decideHunger({ ...base, caloriesIn: 1600 });

    expect(result.kind).toBe('small_meal');
    expect(result.maxSuggestedCalories).toBe(200);
  });

  it('treats the comfort threshold as enough room for a regular meal', () => {
    const atThreshold = decideHunger({ ...base, caloriesIn: 1530 });
    const belowThreshold = decideHunger({ ...base, caloriesIn: 1531 });

    expect(atThreshold.comfortThreshold).toBe(270);
    expect(atThreshold.kind).toBe('meal');
    expect(belowThreshold.kind).toBe('small_meal');
  });

  it('never suggests a snack larger than the remaining budget', () => {
    const result = decideHunger({
      ...base,
      intent: 'snack',
      caloriesIn: 1660,
    });

    expect(result.kind).toBe('snack');
    expect(result.maxSuggestedCalories).toBe(140);
  });

  it('does not call intake above the diet target a surplus while below maintenance', () => {
    const result = decideHunger({ ...base, caloriesIn: 1950 });

    expect(result.kind).toBe('small_meal');
    expect(result.calorieZone).toBe('above_plan');
    expect(result.remainingCalories).toBe(-150);
    expect(result.overTargetCalories).toBe(150);
    expect(result.maintenanceRemainingCalories).toBe(350);
    expect(result.body).toContain('di bawah perkiraan kebutuhan harian');
  });

  it('can still respond to physical hunger at the diet target when below maintenance', () => {
    const result = decideHunger({ ...base, caloriesIn: 1800 });

    expect(result.kind).toBe('meal');
    expect(result.remainingCalories).toBe(0);
    expect(result.overTargetCalories).toBe(0);
    expect(result.maintenanceRemainingCalories).toBe(500);
  });

  it('starts with a pause only after maintenance has been passed', () => {
    const result = decideHunger({ ...base, caloriesIn: 2350 });

    expect(result.kind).toBe('water');
    expect(result.calorieZone).toBe('above_maintenance');
    expect(result.overMaintenanceCalories).toBe(50);
    expect(result.body).toContain('melebihi perkiraan kebutuhan harian');
  });

  it('sanitizes invalid and negative numbers', () => {
    const result = decideHunger({
      ...base,
      caloriesIn: Number.NaN,
      targetCalories: -100,
      maintenanceCalories: -100,
      snackCount: -4,
      fastingHours: Number.POSITIVE_INFINITY,
    });

    expect(result.remainingCalories).toBe(1);
    expect(result.overTargetCalories).toBe(0);
    expect(result.maxSuggestedCalories).toBe(1);
  });
});
