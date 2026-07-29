enum Gender { male, female }

enum ActivityLevel { sedentary, light, moderate, active, veryActive }

enum BodyResponse { easyGain, normal, hardGain }

extension GenderWireName on Gender {
  String get wireName => name;
}

extension ActivityLevelWireName on ActivityLevel {
  String get wireName => switch (this) {
    ActivityLevel.veryActive => 'very_active',
    _ => name,
  };
}

extension BodyResponseWireName on BodyResponse {
  String get wireName => switch (this) {
    BodyResponse.easyGain => 'easy_gain',
    BodyResponse.hardGain => 'hard_gain',
    BodyResponse.normal => 'normal',
  };
}

Gender genderFromWireName(Object? value) {
  return value == 'female' ? Gender.female : Gender.male;
}

ActivityLevel activityLevelFromWireName(Object? value) {
  return switch (value) {
    'sedentary' => ActivityLevel.sedentary,
    'moderate' => ActivityLevel.moderate,
    'active' => ActivityLevel.active,
    'very_active' || 'veryActive' => ActivityLevel.veryActive,
    _ => ActivityLevel.light,
  };
}

BodyResponse bodyResponseFromWireName(Object? value) {
  return switch (value) {
    'easy_gain' || 'easyGain' => BodyResponse.easyGain,
    'hard_gain' || 'hardGain' => BodyResponse.hardGain,
    _ => BodyResponse.normal,
  };
}

class UserProfile {
  const UserProfile({
    this.name = 'Kamu',
    this.age = 26,
    this.gender = Gender.male,
    this.heightCm = 170,
    this.weightKg = 70,
    this.targetWeightKg = 65,
    this.activityLevel = ActivityLevel.light,
    this.bodyResponse = BodyResponse.normal,
    this.targetDeficitKcal = 500,
    this.bedtimeHour = 23,
    this.lastMealAt,
    this.fastingStartedAt,
    this.isCheatDay = false,
  });

  final String name;
  final int age;
  final Gender gender;
  final double heightCm;
  final double weightKg;
  final double targetWeightKg;
  final ActivityLevel activityLevel;
  final BodyResponse bodyResponse;
  final int targetDeficitKcal;
  final int bedtimeHour;
  final DateTime? lastMealAt;
  final DateTime? fastingStartedAt;
  final bool isCheatDay;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      name: _stringValue(json['name'], 'Kamu'),
      age: _intValue(json['age'], 26),
      gender: genderFromWireName(json['gender']),
      heightCm: _doubleValue(json['heightCm'], 170),
      weightKg: _doubleValue(json['weightKg'], 70),
      targetWeightKg: _doubleValue(json['targetWeightKg'], 65),
      activityLevel: activityLevelFromWireName(json['activityLevel']),
      bodyResponse: bodyResponseFromWireName(
        json['bodyResponse'] ?? json['bodyType'],
      ),
      targetDeficitKcal: _intValue(json['targetDeficitKcal'], 500),
      bedtimeHour: _intValue(json['bedtimeHour'], 23),
      lastMealAt: _dateValue(json['lastMealAt'] ?? json['lastMealTimestamp']),
      fastingStartedAt: _dateValue(json['fastingStartedAt']),
      isCheatDay: json['isCheatDay'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'age': age,
    'gender': gender.wireName,
    'heightCm': heightCm,
    'weightKg': weightKg,
    'targetWeightKg': targetWeightKg,
    'activityLevel': activityLevel.wireName,
    'bodyResponse': bodyResponse.wireName,
    'targetDeficitKcal': targetDeficitKcal,
    'bedtimeHour': bedtimeHour,
    'lastMealAt': lastMealAt?.toIso8601String(),
    'fastingStartedAt': fastingStartedAt?.toIso8601String(),
    'isCheatDay': isCheatDay,
  };

  UserProfile copyWith({
    String? name,
    int? age,
    Gender? gender,
    double? heightCm,
    double? weightKg,
    double? targetWeightKg,
    ActivityLevel? activityLevel,
    BodyResponse? bodyResponse,
    int? targetDeficitKcal,
    int? bedtimeHour,
    DateTime? lastMealAt,
    DateTime? fastingStartedAt,
    bool? isCheatDay,
    bool clearLastMealAt = false,
    bool clearFastingStartedAt = false,
  }) {
    return UserProfile(
      name: name ?? this.name,
      age: age ?? this.age,
      gender: gender ?? this.gender,
      heightCm: heightCm ?? this.heightCm,
      weightKg: weightKg ?? this.weightKg,
      targetWeightKg: targetWeightKg ?? this.targetWeightKg,
      activityLevel: activityLevel ?? this.activityLevel,
      bodyResponse: bodyResponse ?? this.bodyResponse,
      targetDeficitKcal: targetDeficitKcal ?? this.targetDeficitKcal,
      bedtimeHour: bedtimeHour ?? this.bedtimeHour,
      lastMealAt: clearLastMealAt ? null : lastMealAt ?? this.lastMealAt,
      fastingStartedAt: clearFastingStartedAt
          ? null
          : fastingStartedAt ?? this.fastingStartedAt,
      isCheatDay: isCheatDay ?? this.isCheatDay,
    );
  }
}

String _stringValue(Object? value, String fallback) {
  final text = value is String ? value.trim() : '';
  return text.isEmpty ? fallback : text;
}

int _intValue(Object? value, int fallback) {
  if (value is num && value.isFinite) return value.round();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

double _doubleValue(Object? value, double fallback) {
  if (value is num && value.isFinite) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}

DateTime? _dateValue(Object? value) {
  if (value is DateTime) return value;
  if (value is! String || value.trim().isEmpty) return null;
  return DateTime.tryParse(value);
}
