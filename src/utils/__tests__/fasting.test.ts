import { calculateMealGapSeconds, shouldMealEndFast } from '../fasting';

describe('shouldMealEndFast', () => {
  it('ends an active fast when the meal occurs after it started', () => {
    expect(
      shouldMealEndFast(
        '2026-07-27T00:00:00.000Z',
        '2026-07-27T06:00:00.000Z'
      )
    ).toBe(true);
  });

  it('does not end the current fast for a backdated earlier meal', () => {
    expect(
      shouldMealEndFast(
        '2026-07-27T06:00:00.000Z',
        '2026-07-27T05:00:00.000Z'
      )
    ).toBe(false);
  });

  it('ignores missing or invalid timestamps', () => {
    expect(shouldMealEndFast(null, '2026-07-27T06:00:00.000Z')).toBe(false);
    expect(shouldMealEndFast('invalid', '2026-07-27T06:00:00.000Z')).toBe(
      false
    );
  });

  it('calculates the automatic gap since the latest meal', () => {
    expect(
      calculateMealGapSeconds(
        '2026-07-27T06:00:00.000Z',
        new Date('2026-07-27T08:30:00.000Z').getTime()
      )
    ).toBe(9000);
  });

  it('never returns a negative timer for a future or invalid meal', () => {
    const now = new Date('2026-07-27T08:30:00.000Z').getTime();
    expect(calculateMealGapSeconds('2026-07-27T09:00:00.000Z', now)).toBe(0);
    expect(calculateMealGapSeconds('invalid', now)).toBe(0);
  });
});
