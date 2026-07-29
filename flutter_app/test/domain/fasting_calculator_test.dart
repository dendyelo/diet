import 'package:diet/domain/domain.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('FastingCalculator automatic meal gap', () {
    test('calculates time since the latest meal', () {
      final gap = FastingCalculator.mealGap(
        lastMealAt: DateTime(2026, 7, 28, 6),
        now: DateTime(2026, 7, 28, 8, 30),
      );

      expect(gap, const Duration(hours: 2, minutes: 30));
      expect(
        FastingCalculator.mealGapSeconds(
          lastMealAt: DateTime(2026, 7, 28, 6),
          now: DateTime(2026, 7, 28, 8, 30),
        ),
        9000,
      );
    });

    test('returns zero for missing or future meals', () {
      final now = DateTime(2026, 7, 28, 8, 30);

      expect(
        FastingCalculator.mealGap(lastMealAt: null, now: now),
        Duration.zero,
      );
      expect(
        FastingCalculator.mealGap(
          lastMealAt: DateTime(2026, 7, 28, 9),
          now: now,
        ),
        Duration.zero,
      );
    });

    test('has no arbitrary fasting target', () {
      final state = FastingCalculator.state(
        lastMealAt: DateTime(2026, 7, 27, 20),
        now: DateTime(2026, 7, 28, 8),
      );

      expect(state.hasMealRecorded, isTrue);
      expect(state.isActive, isTrue);
      expect(state.elapsedHours, 12);
    });
  });

  group('FastingCalculator meal timestamp', () {
    final now = DateTime(2026, 7, 28, 12, 30);

    test('creates an HH:MM timestamp for today only', () {
      expect(
        FastingCalculator.createTodayMealTimestamp('10:15', now: now),
        DateTime(2026, 7, 28, 10, 15),
      );
    });

    test('rejects invalid and future times', () {
      expect(
        FastingCalculator.createTodayMealTimestamp('25:00', now: now),
        isNull,
      );
      expect(
        FastingCalculator.createTodayMealTimestamp('10:5', now: now),
        isNull,
      );
      expect(
        FastingCalculator.createTodayMealTimestamp('13:00', now: now),
        isNull,
      );
    });

    test('formats with leading zeroes', () {
      expect(
        FastingCalculator.formatMealTime(DateTime(2026, 7, 28, 8, 5)),
        '08:05',
      );
    });

    test('a meal ends a fast only when it follows the start', () {
      final start = DateTime(2026, 7, 28, 6);

      expect(
        FastingCalculator.shouldMealEndFast(
          fastingStartedAt: start,
          mealTimestamp: DateTime(2026, 7, 28, 8),
        ),
        isTrue,
      );
      expect(
        FastingCalculator.shouldMealEndFast(
          fastingStartedAt: start,
          mealTimestamp: DateTime(2026, 7, 28, 5),
        ),
        isFalse,
      );
      expect(
        FastingCalculator.shouldMealEndFast(
          fastingStartedAt: null,
          mealTimestamp: DateTime(2026, 7, 28, 8),
        ),
        isFalse,
      );
    });
  });
}
