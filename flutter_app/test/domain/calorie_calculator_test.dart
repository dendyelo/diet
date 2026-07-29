import 'package:diet/domain/domain.dart';
import 'package:flutter_test/flutter_test.dart';

const profile = UserProfile(
  name: 'Dendy',
  age: 30,
  gender: Gender.male,
  heightCm: 175,
  weightKg: 70,
  targetWeightKg: 65,
  activityLevel: ActivityLevel.light,
  bodyResponse: BodyResponse.normal,
  targetDeficitKcal: 500,
);

void main() {
  group('CalorieCalculator profile targets', () {
    test('uses Mifflin-St Jeor for BMR', () {
      expect(CalorieCalculator.calculateBmr(profile), 1649);
    });

    test('body response adjusts TDEE without changing BMR', () {
      final easy = profile.copyWith(bodyResponse: BodyResponse.easyGain);
      final hard = profile.copyWith(bodyResponse: BodyResponse.hardGain);

      expect(
        CalorieCalculator.calculateBmr(easy),
        CalorieCalculator.calculateBmr(profile),
      );
      expect(
        CalorieCalculator.calculateBmr(hard),
        CalorieCalculator.calculateBmr(profile),
      );
      expect(
        CalorieCalculator.calculateTdee(easy),
        lessThan(CalorieCalculator.calculateTdee(profile)),
      );
      expect(
        CalorieCalculator.calculateTdee(hard),
        greaterThan(CalorieCalculator.calculateTdee(profile)),
      );
    });

    test('profile activity changes projected TDEE', () {
      final sedentary = profile.copyWith(
        activityLevel: ActivityLevel.sedentary,
      );
      final active = profile.copyWith(activityLevel: ActivityLevel.active);

      expect(
        CalorieCalculator.calculateTdee(active),
        greaterThan(CalorieCalculator.calculateTdee(sedentary)),
      );
    });

    test('applies a safe deficit and minimum diet target', () {
      expect(CalorieCalculator.calculateTdee(profile), 2267);
      expect(CalorieCalculator.calculateEffectiveDeficit(profile), 500);
      expect(CalorieCalculator.calculateDietTarget(profile), 1767);

      final excessive = profile.copyWith(targetDeficitKcal: 1500);
      expect(CalorieCalculator.calculateEffectiveDeficit(excessive), 1000);
      expect(CalorieCalculator.calculateDietTarget(excessive), 1267);
    });

    test('does not apply deficit for maintenance, gain, or cheat day', () {
      final maintenance = profile.copyWith(targetWeightKg: 70);
      final gain = profile.copyWith(targetWeightKg: 75);
      final cheatDay = profile.copyWith(isCheatDay: true);

      expect(CalorieCalculator.calculateEffectiveDeficit(maintenance), 0);
      expect(CalorieCalculator.calculateEffectiveDeficit(gain), 0);
      expect(CalorieCalculator.calculateEffectiveDeficit(cheatDay), 0);
      expect(
        CalorieCalculator.calculateDietTarget(maintenance),
        CalorieCalculator.calculateTdee(maintenance),
      );
    });

    test('calculates protein from body weight', () {
      expect(CalorieCalculator.calculateTargetProtein(profile), 105);
    });

    test('sanitizes implausible measurements', () {
      const invalid = UserProfile(age: 2, heightCm: 20, weightKg: double.nan);
      const fallback = UserProfile(age: 26, heightCm: 170, weightKg: 70);

      expect(
        CalorieCalculator.calculateBmr(invalid),
        CalorieCalculator.calculateBmr(fallback),
      );
      expect(CalorieCalculator.calculateTargetProtein(invalid), 105);
    });
  });

  group('CalorieCalculator time and activity', () {
    test('accrues base energy over the day instead of adding full TDEE', () {
      final sixAm = DateTime(2026, 7, 28, 6);
      final noon = DateTime(2026, 7, 28, 12);

      final morning = CalorieCalculator.calculateEnergyBalance(
        profile: profile,
        totalCaloriesIn: 0,
        steps: 0,
        at: sixAm,
      );
      final midday = CalorieCalculator.calculateEnergyBalance(
        profile: profile,
        totalCaloriesIn: 0,
        steps: 0,
        at: noon,
      );

      expect(morning.elapsedBaseCaloriesOut, 567);
      expect(midday.elapsedBaseCaloriesOut, 1134);
      expect(midday.totalCaloriesOut, lessThan(midday.dailyTdee));
      expect(midday.elapsedDayPercent, 50);
    });

    test('shows all step calories but credits only above profile baseline', () {
      final atBaseline = CalorieCalculator.calculateActivitySummary(
        profile,
        5000,
      );
      final aboveBaseline = CalorieCalculator.calculateActivitySummary(
        profile,
        10000,
      );

      expect(atBaseline.baselineSteps, 5000);
      expect(atBaseline.stepCalories, 144);
      expect(atBaseline.creditedStepCalories, 0);
      expect(aboveBaseline.bonusSteps, 5000);
      expect(aboveBaseline.stepCalories, 287);
      expect(aboveBaseline.creditedStepCalories, 144);
    });

    test('derives step goal and progress from activity profile', () {
      final light = CalorieCalculator.calculateActivitySummary(profile, 3750);
      final active = CalorieCalculator.calculateActivitySummary(
        profile.copyWith(activityLevel: ActivityLevel.active),
        11000,
      );

      expect(light.stepGoal, 7500);
      expect(light.stepProgressPercent, 50);
      expect(active.stepGoal, 11000);
      expect(active.stepProgressPercent, 100);
    });

    test('steps and workouts add output but never raise fixed diet target', () {
      final noon = DateTime(2026, 7, 28, 12);
      final quietDay = CalorieCalculator.calculateEnergyBalance(
        profile: profile,
        totalCaloriesIn: 900,
        steps: 0,
        at: noon,
      );
      final activeDay = CalorieCalculator.calculateEnergyBalance(
        profile: profile,
        totalCaloriesIn: 900,
        steps: 12000,
        narratedActivityCalories: 400,
        at: noon,
      );

      expect(activeDay.dietTargetCalories, quietDay.dietTargetCalories);
      expect(activeDay.dailyTdee, quietDay.dailyTdee);
      expect(
        activeDay.totalCaloriesOut,
        greaterThan(quietDay.totalCaloriesOut),
      );
      expect(
        activeDay.projectedCaloriesOut,
        greaterThan(quietDay.projectedCaloriesOut),
      );
      expect(activeDay.remainingToDietTarget, quietDay.remainingToDietTarget);
    });

    test('keeps current and projected energy balance separate', () {
      final morning = CalorieCalculator.calculateEnergyBalance(
        profile: profile,
        totalCaloriesIn: 1000,
        steps: 0,
        at: DateTime(2026, 7, 28, 6),
      );

      expect(morning.currentNetBalance, lessThan(0));
      expect(morning.projectedNetBalance, greaterThan(0));
      expect(morning.isCurrentDeficit, isFalse);
    });

    test('diet progress can exceed 100 without changing the target', () {
      final energy = CalorieCalculator.calculateEnergyBalance(
        profile: profile,
        totalCaloriesIn: 2000,
        steps: 20000,
        narratedActivityCalories: 500,
        at: DateTime(2026, 7, 28, 20),
      );

      expect(energy.dietTargetCalories, 1767);
      expect(energy.dietTargetProgressPercent, greaterThan(100));
      expect(energy.caloriesOverDietTarget, 233);
      expect(energy.isAboveDietTarget, isTrue);
    });
  });
}
