import {
  calculateCreditedActivityCalories,
  calculateNetActivityCalories,
  calculateNarratedActivityCalories,
  extractDurationMinutes,
  parseActivityLocally,
} from '../activityCalc';

describe('activityCalc', () => {
  it('reads hours and minutes from Indonesian activity stories', () => {
    expect(extractDurationMinutes('treadmill 1 jam')).toBe(60);
    expect(extractDurationMinutes('berlari 30 menit')).toBe(30);
    expect(extractDurationMinutes('sepak bola 1 jam 15 menit')).toBe(75);
  });

  it('uses conservative local presets when AI is unavailable', () => {
    expect(parseActivityLocally('berlari 30 menit')).toMatchObject({
      durationMinutes: 30,
      met: 7,
      stepOverlap: 'high',
    });
    expect(parseActivityLocally('bermain sepakbola 1 jam')).toMatchObject({
      durationMinutes: 60,
      met: 7,
      stepOverlap: 'medium',
    });
  });

  it('calculates only energy above resting metabolism', () => {
    expect(calculateNetActivityCalories(70, 60, 8)).toBe(515);
  });

  it('deducts only step calories that actually became a bonus', () => {
    expect(calculateCreditedActivityCalories(500, 'high', 325)).toBe(175);
    expect(calculateCreditedActivityCalories(500, 'low', 325)).toBe(500);
    expect(calculateCreditedActivityCalories(500, 'high', 0)).toBe(500);
  });

  it('deducts the same step bonus only once across multiple activities', () => {
    const activities = [
      { estimatedCalories: 400, stepOverlap: 'high' as const },
      { estimatedCalories: 300, stepOverlap: 'high' as const },
    ];
    expect(calculateNarratedActivityCalories(activities, 200)).toBe(500);
  });
});
