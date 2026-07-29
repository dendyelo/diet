import 'package:diet/domain/domain.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ActivityCalculator parser', () {
    test('reads Indonesian hours and minutes', () {
      expect(ActivityCalculator.extractDurationMinutes('treadmill 1 jam'), 60);
      expect(ActivityCalculator.extractDurationMinutes('berlari 30 menit'), 30);
      expect(
        ActivityCalculator.extractDurationMinutes(
          'bermain sepak bola 1 jam 15 menit',
        ),
        75,
      );
      expect(
        ActivityCalculator.extractDurationMinutes('bersepeda 1,5 jam'),
        90,
      );
    });

    test('defaults unknown duration to 30 minutes and caps extremes', () {
      expect(ActivityCalculator.extractDurationMinutes('yoga santai'), 30);
      expect(ActivityCalculator.extractDurationMinutes('lari 20 jam'), 720);
    });

    test('uses conservative local MET presets', () {
      final running = ActivityCalculator.parseLocally('berlari 30 menit');
      final football = ActivityCalculator.parseLocally(
        'bermain sepakbola 1 jam',
      );
      final generic = ActivityCalculator.parseLocally(
        'treadmill selama 45 menit',
      );

      expect(running.name, 'Jogging');
      expect(running.durationMinutes, 30);
      expect(running.met, 7);
      expect(running.stepOverlap, ActivityStepOverlap.high);
      expect(football.name, 'Sepak bola');
      expect(football.stepOverlap, ActivityStepOverlap.medium);
      expect(generic.met, 5);
      expect(generic.notes, contains('konservatif'));
    });

    test('marks unknown activity with low confidence', () {
      final parsed = ActivityCalculator.parseLocally(
        'membersihkan gudang 40 menit',
      );

      expect(parsed.name, 'Aktivitas fisik');
      expect(parsed.confidence, ActivityConfidence.low);
      expect(parsed.met, 4);
    });
  });

  group('ActivityCalculator calories and overlap', () {
    test('calculates only energy above resting metabolism', () {
      expect(
        ActivityCalculator.calculateNetCalories(
          weightKg: 70,
          durationMinutes: 60,
          met: 8,
        ),
        515,
      );
    });

    test('deducts only credited steps according to overlap', () {
      expect(
        ActivityCalculator.calculateCreditedCalories(
          estimatedCalories: 500,
          stepOverlap: ActivityStepOverlap.high,
          creditedStepCalories: 325,
        ),
        175,
      );
      expect(
        ActivityCalculator.calculateCreditedCalories(
          estimatedCalories: 500,
          stepOverlap: ActivityStepOverlap.medium,
          creditedStepCalories: 200,
        ),
        400,
      );
      expect(
        ActivityCalculator.calculateCreditedCalories(
          estimatedCalories: 500,
          stepOverlap: ActivityStepOverlap.low,
          creditedStepCalories: 325,
        ),
        500,
      );
    });

    test('deducts a step pool only once across activities', () {
      final activities = [
        ActivityLog(
          id: '1',
          timestamp: DateTime(2026, 7, 28, 8),
          name: 'Jogging',
          durationMinutes: 40,
          met: 7,
          estimatedCalories: 400,
          creditedCalories: 400,
          stepOverlap: ActivityStepOverlap.high,
        ),
        ActivityLog(
          id: '2',
          timestamp: DateTime(2026, 7, 28, 18),
          name: 'Sepak bola',
          durationMinutes: 30,
          met: 7,
          estimatedCalories: 300,
          creditedCalories: 300,
          stepOverlap: ActivityStepOverlap.high,
        ),
      ];

      expect(
        ActivityCalculator.calculateNarratedCalories(
          activities: activities,
          creditedStepCalories: 200,
        ),
        500,
      );

      final allocation = ActivityCalculator.allocateNarratedCalories(
        activities: activities,
        creditedStepCalories: 200,
      );
      expect(allocation.totalCalories, 500);
      expect(
        allocation.byActivityId.values.fold<int>(
          0,
          (total, value) => total + value,
        ),
        500,
      );
      expect(allocation.byActivityId['1'], 286);
      expect(allocation.byActivityId['2'], 214);
    });

    test('low-overlap activities are not reduced by steps', () {
      final activities = [
        ActivityLog(
          id: 'swim',
          timestamp: DateTime(2026, 7, 28),
          name: 'Berenang',
          durationMinutes: 60,
          met: 6,
          estimatedCalories: 350,
          creditedCalories: 350,
          stepOverlap: ActivityStepOverlap.low,
        ),
      ];

      expect(
        ActivityCalculator.calculateNarratedCalories(
          activities: activities,
          creditedStepCalories: 500,
        ),
        350,
      );
    });
  });
}
