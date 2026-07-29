class WeightLog {
  const WeightLog({
    required this.id,
    required this.weightKg,
    required this.recordedAt,
    this.note,
  });

  final String id;
  final double weightKg;
  final DateTime recordedAt;
  final String? note;

  factory WeightLog.fromJson(Map<String, dynamic> json) {
    final rawWeight = json['weightKg'];
    final parsedWeight = rawWeight is num
        ? rawWeight.toDouble()
        : double.tryParse(rawWeight?.toString() ?? '') ?? 70;
    return WeightLog(
      id: json['id'] is String ? json['id'] as String : '',
      weightKg: parsedWeight.clamp(20, 300),
      recordedAt:
          DateTime.tryParse(json['recordedAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      note: json['note'] is String ? json['note'] as String : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'weightKg': weightKg,
    'recordedAt': recordedAt.toIso8601String(),
    if (note != null) 'note': note,
  };

  WeightLog copyWith({
    String? id,
    double? weightKg,
    DateTime? recordedAt,
    String? note,
    bool clearNote = false,
  }) {
    return WeightLog(
      id: id ?? this.id,
      weightKg: weightKg ?? this.weightKg,
      recordedAt: recordedAt ?? this.recordedAt,
      note: clearNote ? null : note ?? this.note,
    );
  }
}
