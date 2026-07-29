class FastingState {
  const FastingState({required this.elapsed, required this.hasMealRecorded});

  final Duration elapsed;
  final bool hasMealRecorded;

  bool get isActive => hasMealRecorded;
  int get elapsedSeconds => elapsed.inSeconds;
  double get elapsedHours => elapsed.inSeconds / Duration.secondsPerHour;
}

abstract final class FastingCalculator {
  static bool shouldMealEndFast({
    required DateTime? fastingStartedAt,
    required DateTime? mealTimestamp,
  }) {
    if (fastingStartedAt == null || mealTimestamp == null) return false;
    return !mealTimestamp.isBefore(fastingStartedAt);
  }

  /// Automatic meal gap. There is deliberately no configurable fasting target:
  /// this only reports the time since the latest recorded meal.
  static Duration mealGap({required DateTime? lastMealAt, DateTime? now}) {
    if (lastMealAt == null) return Duration.zero;
    final current = now ?? DateTime.now();
    if (lastMealAt.isAfter(current)) return Duration.zero;
    return current.difference(lastMealAt);
  }

  static int mealGapSeconds({required DateTime? lastMealAt, DateTime? now}) {
    return mealGap(lastMealAt: lastMealAt, now: now).inSeconds;
  }

  static FastingState state({required DateTime? lastMealAt, DateTime? now}) {
    return FastingState(
      elapsed: mealGap(lastMealAt: lastMealAt, now: now),
      hasMealRecorded: lastMealAt != null,
    );
  }

  /// Creates a timestamp for today from `HH:MM`.
  ///
  /// A future time is rejected so an accidentally mistyped meal cannot produce
  /// a negative meal gap. Dates other than today are never accepted here.
  static DateTime? createTodayMealTimestamp(String timeText, {DateTime? now}) {
    final match = RegExp(r'^(\d{1,2}):(\d{2})$').firstMatch(timeText.trim());
    if (match == null) return null;
    final hours = int.parse(match.group(1)!);
    final minutes = int.parse(match.group(2)!);
    if (hours > 23 || minutes > 59) return null;

    final current = now ?? DateTime.now();
    final result = current.isUtc
        ? DateTime.utc(current.year, current.month, current.day, hours, minutes)
        : DateTime(current.year, current.month, current.day, hours, minutes);
    if (result.isAfter(current)) return null;
    return result;
  }

  static String formatMealTime(DateTime value) {
    final hours = value.hour.toString().padLeft(2, '0');
    final minutes = value.minute.toString().padLeft(2, '0');
    return '$hours:$minutes';
  }
}
