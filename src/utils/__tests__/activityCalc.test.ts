import {
  calculateCreditedActivityCalories,
  calculateNetActivityCalories,
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
      met: 8.3,
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

  it('reduces step-based credit when a step sensor is connected', () => {
    expect(calculateCreditedActivityCalories(500, 'high', true)).toBe(175);
    expect(calculateCreditedActivityCalories(500, 'low', true)).toBe(500);
    expect(calculateCreditedActivityCalories(500, 'high', false)).toBe(500);
  });
});
