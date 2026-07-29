enum ActivityStepOverlap { high, medium, low }

enum ActivitySource { ai, local }

class ActivityLog {
  const ActivityLog({
    required this.id,
    required this.timestamp,
    required this.name,
    required this.durationMinutes,
    required this.met,
    required this.estimatedCalories,
    required this.creditedCalories,
    required this.stepOverlap,
    this.source = ActivitySource.local,
    this.notes,
  });

  final String id;
  final DateTime timestamp;
  final String name;
  final int durationMinutes;
  final double met;
  final int estimatedCalories;
  final int creditedCalories;
  final ActivityStepOverlap stepOverlap;
  final ActivitySource source;
  final String? notes;

  factory ActivityLog.fromJson(Map<String, dynamic> json) {
    return ActivityLog(
      id: json['id'] is String ? json['id'] as String : '',
      timestamp:
          DateTime.tryParse(json['timestamp']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      name: json['name'] is String ? json['name'] as String : '',
      durationMinutes: _safeInt(
        json['durationMinutes'],
        minimum: 1,
        maximum: 720,
        fallback: 30,
      ),
      met: _safeDouble(json['met'], minimum: 1, maximum: 20, fallback: 4),
      estimatedCalories: _safeInt(
        json['estimatedCalories'],
        minimum: 0,
        maximum: 100000,
      ),
      creditedCalories: _safeInt(
        json['creditedCalories'],
        minimum: 0,
        maximum: 100000,
      ),
      stepOverlap: switch (json['stepOverlap']) {
        'high' => ActivityStepOverlap.high,
        'low' => ActivityStepOverlap.low,
        _ => ActivityStepOverlap.medium,
      },
      source: json['source'] == 'ai' ? ActivitySource.ai : ActivitySource.local,
      notes: json['notes'] is String ? json['notes'] as String : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'timestamp': timestamp.toIso8601String(),
    'name': name,
    'durationMinutes': durationMinutes,
    'met': met,
    'estimatedCalories': estimatedCalories,
    'creditedCalories': creditedCalories,
    'stepOverlap': stepOverlap.name,
    'source': source.name,
    if (notes != null) 'notes': notes,
  };

  ActivityLog copyWith({
    String? id,
    DateTime? timestamp,
    String? name,
    int? durationMinutes,
    double? met,
    int? estimatedCalories,
    int? creditedCalories,
    ActivityStepOverlap? stepOverlap,
    ActivitySource? source,
    String? notes,
    bool clearNotes = false,
  }) {
    return ActivityLog(
      id: id ?? this.id,
      timestamp: timestamp ?? this.timestamp,
      name: name ?? this.name,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      met: met ?? this.met,
      estimatedCalories: estimatedCalories ?? this.estimatedCalories,
      creditedCalories: creditedCalories ?? this.creditedCalories,
      stepOverlap: stepOverlap ?? this.stepOverlap,
      source: source ?? this.source,
      notes: clearNotes ? null : notes ?? this.notes,
    );
  }
}

class StepRecord {
  const StepRecord({this.sensorSteps = 0, this.manualSteps = 0});

  final int sensorSteps;
  final int manualSteps;

  int get totalSteps => sensorSteps + manualSteps;

  factory StepRecord.fromJson(Map<String, dynamic> json) {
    return StepRecord(
      sensorSteps: _safeInt(json['sensorSteps'], minimum: 0, maximum: 1000000),
      manualSteps: _safeInt(json['manualSteps'], minimum: 0, maximum: 1000000),
    );
  }

  Map<String, dynamic> toJson() => {
    'sensorSteps': sensorSteps,
    'manualSteps': manualSteps,
  };

  StepRecord copyWith({int? sensorSteps, int? manualSteps}) {
    return StepRecord(
      sensorSteps: sensorSteps ?? this.sensorSteps,
      manualSteps: manualSteps ?? this.manualSteps,
    );
  }
}

int _safeInt(
  Object? value, {
  required int minimum,
  required int maximum,
  int fallback = 0,
}) {
  final parsed = value is num ? value : num.tryParse(value?.toString() ?? '');
  if (parsed == null || !parsed.isFinite) return fallback;
  return parsed.round().clamp(minimum, maximum);
}

double _safeDouble(
  Object? value, {
  required double minimum,
  required double maximum,
  required double fallback,
}) {
  final parsed = value is num ? value : num.tryParse(value?.toString() ?? '');
  if (parsed == null || !parsed.isFinite) return fallback;
  return parsed.toDouble().clamp(minimum, maximum);
}
