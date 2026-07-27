import { createMealTimestamp, formatMealTime } from '../mealTimestamp';

describe('mealTimestamp', () => {
  const now = new Date('2026-07-27T12:30:00+07:00');

  it('creates a local timestamp for today', () => {
    const result = createMealTimestamp('10:15', now);
    expect(result).toBe(new Date('2026-07-27T10:15:00+07:00').toISOString());
  });

  it('rejects invalid and future times', () => {
    expect(createMealTimestamp('25:00', now)).toBeNull();
    expect(createMealTimestamp('13:00', now)).toBeNull();
  });

  it('formats time with leading zeros', () => {
    expect(formatMealTime(new Date('2026-07-27T08:05:00+07:00'))).toBe('08:05');
  });
});
