import 'package:diet/domain/domain.dart';
import 'package:flutter_test/flutter_test.dart';

const base = HungerDecisionInput(
  answer: HungerCheckAnswer.hungry,
  signal: HungerSignal.physical,
  intent: EatingIntent.meal,
  caloriesIn: 900,
  targetCalories: 1800,
  maintenanceCalories: 2300,
  waterGlasses: 4,
  snackCount: 0,
  hoursSinceLastMeal: 4,
);

void main() {
  group('decideHunger', () {
    test('never recommends food when user says they are not hungry', () {
      final result = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.notHungry,
          caloriesIn: 900,
          targetCalories: 1800,
          maintenanceCalories: 2300,
        ),
      );

      expect(result.kind, HungerRecommendationKind.none);
      expect(result.status, 'TIDAK LAPAR');
      expect(result.headline, contains('tidak perlu makan'));
      expect(result.remainingCalories, 900);
    });

    test('uses water and a pause for uncertainty or non-physical signal', () {
      final unsure = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.unsure,
          caloriesIn: 900,
          targetCalories: 1800,
        ),
      );
      final craving = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.hungry,
          signal: HungerSignal.specificCraving,
          caloriesIn: 900,
          targetCalories: 1800,
        ),
      );

      expect(unsure.kind, HungerRecommendationKind.water);
      expect(craving.kind, HungerRecommendationKind.water);
    });

    test('does not suggest more water when hydration is already met', () {
      final result = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.unsure,
          caloriesIn: 2356,
          targetCalories: 1526,
          maintenanceCalories: 2000,
          waterGlasses: 9,
        ),
      );

      expect(result.kind, HungerRecommendationKind.none);
      expect(result.headline, 'Beri jeda sebentar.');
      expect(result.body, contains('Air hari ini sudah cukup'));
      expect(result.body, isNot(contains('Minum satu gelas')));
    });

    test('allows a meal for physical hunger with comfortable room', () {
      final result = decideHunger(base);

      expect(result.kind, HungerRecommendationKind.meal);
      expect(result.comfortThreshold, 270);
      expect(result.maxSuggestedCalories, 900);
      expect(result.body, contains('lebih dari empat jam'));
    });

    test('pauses briefly when hunger is logged soon after eating', () {
      final result = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.hungry,
          signal: HungerSignal.physical,
          intent: EatingIntent.meal,
          caloriesIn: 500,
          targetCalories: 1800,
          maintenanceCalories: 2300,
          waterGlasses: 8,
          hoursSinceLastMeal: 0.5,
        ),
      );

      expect(result.kind, HungerRecommendationKind.none);
      expect(result.status, 'BARU SAJA MAKAN');
      expect(result.headline, 'Beri tubuh waktu sebentar.');
      expect(result.body, contains('30 menit lalu'));
      expect(result.maxSuggestedCalories, 150);
    });

    test('caps snack at 200 and never above the remaining plan', () {
      final normalSnack = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.hungry,
          signal: HungerSignal.physical,
          intent: EatingIntent.snack,
          caloriesIn: 900,
          targetCalories: 1800,
        ),
      );
      final nearLimit = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.hungry,
          signal: HungerSignal.physical,
          intent: EatingIntent.snack,
          caloriesIn: 1660,
          targetCalories: 1800,
        ),
      );

      expect(normalSnack.maxSuggestedCalories, 200);
      expect(nearLimit.maxSuggestedCalories, 140);
    });

    test('uses a small meal below the comfort threshold', () {
      final result = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.hungry,
          signal: HungerSignal.physical,
          intent: EatingIntent.meal,
          caloriesIn: 1600,
          targetCalories: 1800,
          maintenanceCalories: 2300,
        ),
      );

      expect(result.kind, HungerRecommendationKind.smallMeal);
      expect(result.maxSuggestedCalories, 200);
    });

    test('does not call above-plan intake an energy surplus', () {
      final result = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.hungry,
          signal: HungerSignal.physical,
          intent: EatingIntent.meal,
          caloriesIn: 1950,
          targetCalories: 1800,
          maintenanceCalories: 2300,
        ),
      );

      expect(result.calorieZone, CaloriePlanZone.abovePlan);
      expect(result.remainingCalories, -150);
      expect(result.overTargetCalories, 150);
      expect(result.maintenanceRemainingCalories, 350);
      expect(result.body, contains('di bawah perkiraan kebutuhan'));
    });

    test('starts with pause only after maintenance is passed', () {
      final result = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.hungry,
          signal: HungerSignal.physical,
          intent: EatingIntent.meal,
          caloriesIn: 2350,
          targetCalories: 1800,
          maintenanceCalories: 2300,
        ),
      );

      expect(result.kind, HungerRecommendationKind.water);
      expect(result.calorieZone, CaloriePlanZone.aboveMaintenance);
      expect(result.overMaintenanceCalories, 50);
      expect(result.body, contains('melebihi perkiraan kebutuhan'));
    });

    test('keeps maintenance independent when minimum intake is higher', () {
      final result = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.hungry,
          signal: HungerSignal.physical,
          intent: EatingIntent.meal,
          caloriesIn: 1100,
          targetCalories: 1200,
          maintenanceCalories: 1026,
          hoursSinceLastMeal: 4,
        ),
      );

      expect(result.maintenanceCalories, 1026);
      expect(result.calorieZone, CaloriePlanZone.aboveMaintenance);
      expect(result.overMaintenanceCalories, 74);
    });

    test('sanitizes invalid and negative numbers deterministically', () {
      final result = decideHunger(
        HungerDecisionInput(
          answer: HungerCheckAnswer.hungry,
          signal: HungerSignal.physical,
          intent: EatingIntent.meal,
          caloriesIn: double.nan,
          targetCalories: -100,
          maintenanceCalories: -100,
          snackCount: -4,
          hoursSinceLastMeal: double.infinity,
        ),
      );

      expect(result.remainingCalories, 1);
      expect(result.overTargetCalories, 0);
      expect(result.maxSuggestedCalories, 1);
    });

    test('formats Indonesian thousands consistently', () {
      final result = decideHunger(
        const HungerDecisionInput(
          answer: HungerCheckAnswer.notHungry,
          caloriesIn: 0,
          targetCalories: 1750,
          maintenanceCalories: 2250,
        ),
      );

      expect(result.body, contains('1.750 kkal'));
    });
  });
}
