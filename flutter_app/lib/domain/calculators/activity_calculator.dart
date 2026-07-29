import '../models/models.dart';

enum ActivityConfidence { high, medium, low }

class ParsedActivity {
  const ParsedActivity({
    required this.name,
    required this.durationMinutes,
    required this.met,
    required this.stepOverlap,
    required this.confidence,
    required this.notes,
    required this.source,
  });

  final String name;
  final int durationMinutes;
  final double met;
  final ActivityStepOverlap stepOverlap;
  final ActivityConfidence confidence;
  final String notes;
  final ActivitySource source;
}

class ActivityCreditAllocation {
  const ActivityCreditAllocation({
    required this.totalCalories,
    required this.byActivityId,
  });

  final int totalCalories;
  final Map<String, int> byActivityId;
}

class _ActivityPreset {
  const _ActivityPreset({
    required this.pattern,
    required this.name,
    required this.met,
    required this.stepOverlap,
  });

  final RegExp pattern;
  final String name;
  final double met;
  final ActivityStepOverlap stepOverlap;
}

abstract final class ActivityCalculator {
  static final List<_ActivityPreset> _presets = [
    _ActivityPreset(
      pattern: RegExp(
        r'(?:jalan|walking).{0,20}treadmill|treadmill.{0,20}(?:jalan|walking)',
        caseSensitive: false,
      ),
      name: 'Berjalan di treadmill',
      met: 3.8,
      stepOverlap: ActivityStepOverlap.high,
    ),
    _ActivityPreset(
      pattern: RegExp(
        r'(?:lari|berlari|jogging|running).{0,20}treadmill|treadmill.{0,20}(?:lari|berlari|jogging|running)',
        caseSensitive: false,
      ),
      name: 'Lari di treadmill',
      met: 7,
      stepOverlap: ActivityStepOverlap.high,
    ),
    _ActivityPreset(
      pattern: RegExp(r'treadmill', caseSensitive: false),
      name: 'Treadmill intensitas sedang',
      met: 5,
      stepOverlap: ActivityStepOverlap.high,
    ),
    _ActivityPreset(
      pattern: RegExp(r'lari|berlari|jogging|running', caseSensitive: false),
      name: 'Jogging',
      met: 7,
      stepOverlap: ActivityStepOverlap.high,
    ),
    _ActivityPreset(
      pattern: RegExp(
        r'sepak ?bola|futsal|football|soccer',
        caseSensitive: false,
      ),
      name: 'Sepak bola',
      met: 7,
      stepOverlap: ActivityStepOverlap.medium,
    ),
    _ActivityPreset(
      pattern: RegExp(r'sepeda|bersepeda|cycling', caseSensitive: false),
      name: 'Bersepeda',
      met: 6.8,
      stepOverlap: ActivityStepOverlap.low,
    ),
    _ActivityPreset(
      pattern: RegExp(r'renang|berenang|swimming', caseSensitive: false),
      name: 'Berenang',
      met: 6,
      stepOverlap: ActivityStepOverlap.low,
    ),
    _ActivityPreset(
      pattern: RegExp(
        r'angkat beban|gym|strength|fitness',
        caseSensitive: false,
      ),
      name: 'Latihan kekuatan',
      met: 5,
      stepOverlap: ActivityStepOverlap.low,
    ),
    _ActivityPreset(
      pattern: RegExp(r'jalan|berjalan|walking', caseSensitive: false),
      name: 'Berjalan',
      met: 3.8,
      stepOverlap: ActivityStepOverlap.high,
    ),
    _ActivityPreset(
      pattern: RegExp(r'yoga|pilates|stretching', caseSensitive: false),
      name: 'Yoga atau peregangan',
      met: 2.8,
      stepOverlap: ActivityStepOverlap.low,
    ),
  ];

  static int extractDurationMinutes(String text) {
    final hourMatch = RegExp(
      r'(\d+(?:[.,]\d+)?)\s*(?:jam|hour|hours)',
      caseSensitive: false,
    ).firstMatch(text);
    final minuteMatch = RegExp(
      r'(\d+(?:[.,]\d+)?)\s*(?:menit|min|minute|minutes)',
      caseSensitive: false,
    ).firstMatch(text);
    final hours = _parseDecimal(hourMatch?.group(1));
    final minutes = _parseDecimal(minuteMatch?.group(1));
    final total = ((hours * 60) + minutes).round();
    return (total == 0 ? 30 : total).clamp(1, 720);
  }

  static ParsedActivity parseLocally(String text) {
    final cleanText = text.replaceAll(RegExp(r'\s+'), ' ').trim();
    _ActivityPreset? matched;
    for (final preset in _presets) {
      if (preset.pattern.hasMatch(cleanText)) {
        matched = preset;
        break;
      }
    }

    final isFallback = matched == null;
    final preset =
        matched ??
        _ActivityPreset(
          pattern: RegExp(''),
          name: 'Aktivitas fisik',
          met: 4,
          stepOverlap: ActivityStepOverlap.medium,
        );
    final isGenericTreadmill = preset.name == 'Treadmill intensitas sedang';
    return ParsedActivity(
      name: preset.name,
      durationMinutes: extractDurationMinutes(cleanText),
      met: preset.met,
      stepOverlap: preset.stepOverlap,
      confidence: isFallback
          ? ActivityConfidence.low
          : ActivityConfidence.medium,
      notes: isFallback
          ? 'Jenis atau intensitas aktivitas belum cukup jelas.'
          : isGenericTreadmill
          ? 'Kecepatan treadmill tidak disebutkan, jadi digunakan intensitas sedang yang konservatif.'
          : 'Estimasi lokal berdasarkan jenis dan durasi aktivitas.',
      source: ActivitySource.local,
    );
  }

  /// Returns exercise calories above resting energy. Resting calories are
  /// excluded because BMR is already accrued throughout the day.
  static int calculateNetCalories({
    required double weightKg,
    required int durationMinutes,
    required double met,
  }) {
    final safeWeight = _finiteOr(weightKg, 70).clamp(30, 250);
    final safeDuration = durationMinutes.clamp(1, 720);
    final safeMet = _finiteOr(met, 1).clamp(1, 20);
    return (((safeMet - 1) * 3.5 * safeWeight * safeDuration) / 200)
        .clamp(0, 100000)
        .round();
  }

  static int calculateCreditedCalories({
    required int estimatedCalories,
    required ActivityStepOverlap stepOverlap,
    required int creditedStepCalories,
  }) {
    final estimate = estimatedCalories.clamp(0, 100000);
    final overlapFactor = switch (stepOverlap) {
      ActivityStepOverlap.high => 1.0,
      ActivityStepOverlap.medium => 0.5,
      ActivityStepOverlap.low => 0.0,
    };
    final actualOverlap =
        (creditedStepCalories.clamp(0, 100000) * overlapFactor).clamp(
          0,
          estimate,
        );
    return (estimate - actualOverlap).round();
  }

  /// Deducts the credited step pool only once, then distributes that overlap
  /// across the displayed activities so the rows and energy engine stay equal.
  static ActivityCreditAllocation allocateNarratedCalories({
    required Iterable<ActivityLog> activities,
    required int creditedStepCalories,
  }) {
    final source = activities.toList(growable: false);
    if (source.isEmpty) {
      return const ActivityCreditAllocation(
        totalCalories: 0,
        byActivityId: <String, int>{},
      );
    }

    var totalEstimated = 0;
    var overlapCapacity = 0.0;
    final capacities = <double>[];
    for (final activity in source) {
      final estimate = activity.estimatedCalories.clamp(0, 100000);
      totalEstimated += estimate;
      final factor = switch (activity.stepOverlap) {
        ActivityStepOverlap.high => 1.0,
        ActivityStepOverlap.medium => 0.5,
        ActivityStepOverlap.low => 0.0,
      };
      final capacity = estimate * factor;
      capacities.add(capacity);
      overlapCapacity += capacity;
    }

    final totalOverlap = creditedStepCalories
        .clamp(0, 100000)
        .clamp(0, overlapCapacity.round());
    final deductions = List<int>.filled(source.length, 0);

    if (totalOverlap > 0 && overlapCapacity > 0) {
      final remainders = <({int index, double fraction})>[];
      var distributed = 0;
      for (var index = 0; index < capacities.length; index++) {
        final exact = totalOverlap * capacities[index] / overlapCapacity;
        final whole = exact.floor();
        deductions[index] = whole;
        distributed += whole;
        remainders.add((index: index, fraction: exact - whole));
      }
      remainders.sort((left, right) {
        final fractionOrder = right.fraction.compareTo(left.fraction);
        return fractionOrder != 0
            ? fractionOrder
            : left.index.compareTo(right.index);
      });
      var remaining = totalOverlap - distributed;
      var cursor = 0;
      while (remaining > 0 && remainders.isNotEmpty) {
        deductions[remainders[cursor].index] += 1;
        remaining -= 1;
        cursor = (cursor + 1) % remainders.length;
      }
    }

    final credits = <String, int>{};
    for (var index = 0; index < source.length; index++) {
      final estimate = source[index].estimatedCalories.clamp(0, 100000);
      credits[source[index].id] = (estimate - deductions[index]).clamp(
        0,
        100000,
      );
    }
    return ActivityCreditAllocation(
      totalCalories: (totalEstimated - totalOverlap).clamp(0, 100000),
      byActivityId: Map<String, int>.unmodifiable(credits),
    );
  }

  static int calculateNarratedCalories({
    required Iterable<ActivityLog> activities,
    required int creditedStepCalories,
  }) {
    return allocateNarratedCalories(
      activities: activities,
      creditedStepCalories: creditedStepCalories,
    ).totalCalories;
  }

  static double _parseDecimal(String? text) {
    return double.tryParse((text ?? '').replaceAll(',', '.')) ?? 0;
  }

  static double _finiteOr(double value, double fallback) {
    return value.isFinite ? value : fallback;
  }
}
