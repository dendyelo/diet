import 'package:diet/domain/domain.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('UserProfile serialization', () {
    test('reads legacy Expo field names', () {
      final profile = UserProfile.fromJson({
        'name': 'Dendy',
        'age': 31,
        'gender': 'male',
        'heightCm': 174,
        'weightKg': 72,
        'targetWeightKg': 67,
        'activityLevel': 'very_active',
        'bodyType': 'easy_gain',
        'targetDeficitKcal': 400,
        'lastMealTimestamp': '2026-07-28T08:00:00.000Z',
      });

      expect(profile.activityLevel, ActivityLevel.veryActive);
      expect(profile.bodyResponse, BodyResponse.easyGain);
      expect(profile.lastMealAt, DateTime.utc(2026, 7, 28, 8));
      expect(profile.targetDeficitKcal, 400);
    });

    test('round trips the new schema', () {
      final original = UserProfile(
        name: 'Dendy',
        activityLevel: ActivityLevel.moderate,
        bodyResponse: BodyResponse.hardGain,
        lastMealAt: DateTime.utc(2026, 7, 28, 10),
      );
      final decoded = UserProfile.fromJson(original.toJson());

      expect(decoded.name, original.name);
      expect(decoded.activityLevel, original.activityLevel);
      expect(decoded.bodyResponse, original.bodyResponse);
      expect(decoded.lastMealAt, original.lastMealAt);
    });
  });

  group('log serialization', () {
    test('meal preserves nutrition, trigger, items, source, and time', () {
      final meal = MealLog(
        id: 'meal-1',
        timestamp: DateTime.utc(2026, 7, 28, 8, 15),
        name: 'Nasi dan ayam',
        isSnack: false,
        trigger: TriggerType.physicalHunger,
        nutrition: const NutritionData(
          calories: 550,
          proteinGrams: 35,
          carbsGrams: 60,
          fatGrams: 18,
        ),
        source: MealSource.ai,
        itemsBreakdown: const [
          FoodItemBreakdown(name: 'Nasi', calories: 250),
          FoodItemBreakdown(name: 'Ayam', calories: 300),
        ],
      );
      final decoded = MealLog.fromJson(meal.toJson());

      expect(decoded.id, meal.id);
      expect(decoded.timestamp, meal.timestamp);
      expect(decoded.trigger, TriggerType.physicalHunger);
      expect(decoded.nutrition.proteinGrams, 35);
      expect(decoded.source, MealSource.ai);
      expect(decoded.itemsBreakdown, hasLength(2));
    });

    test('nutrition clamps corrupted negative values', () {
      final nutrition = NutritionData.fromJson({
        'calories': -50,
        'proteinGrams': -2,
        'carbsGrams': '12.5',
      });

      expect(nutrition.calories, 0);
      expect(nutrition.proteinGrams, 0);
      expect(nutrition.carbsGrams, 12.5);
    });

    test('activity sanitizes bounds and round trips overlap', () {
      final activity = ActivityLog.fromJson({
        'id': 'a-1',
        'timestamp': '2026-07-28T09:00:00.000Z',
        'name': 'Jogging',
        'durationMinutes': 1000,
        'met': 50,
        'estimatedCalories': 400,
        'creditedCalories': 250,
        'stepOverlap': 'high',
        'source': 'ai',
      });

      expect(activity.durationMinutes, 720);
      expect(activity.met, 20);
      expect(activity.stepOverlap, ActivityStepOverlap.high);
      expect(activity.source, ActivitySource.ai);
      expect(ActivityLog.fromJson(activity.toJson()).creditedCalories, 250);
    });

    test('weight and step records round trip', () {
      final weight = WeightLog(
        id: 'w-1',
        weightKg: 71.4,
        recordedAt: DateTime.utc(2026, 7, 28),
        note: 'Pagi',
      );
      const steps = StepRecord(sensorSteps: 4200, manualSteps: 300);

      expect(WeightLog.fromJson(weight.toJson()).weightKg, 71.4);
      expect(StepRecord.fromJson(steps.toJson()).totalSteps, 4500);
    });
  });
}
