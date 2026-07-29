enum TriggerType { bored, stressed, social, physicalHunger, nightHunger }

enum MealSource { ai, manual }

extension TriggerTypeWireName on TriggerType {
  String get wireName => switch (this) {
    TriggerType.bored => 'BOSAN',
    TriggerType.stressed => 'STRES',
    TriggerType.social => 'NONGKRONG',
    TriggerType.physicalHunger => 'LAPAR_ASLI',
    TriggerType.nightHunger => 'LAPAR_MALAM',
  };
}

TriggerType? triggerTypeFromWireName(Object? value) {
  return switch (value) {
    'BOSAN' => TriggerType.bored,
    'STRES' => TriggerType.stressed,
    'NONGKRONG' => TriggerType.social,
    'LAPAR_ASLI' => TriggerType.physicalHunger,
    'LAPAR_MALAM' => TriggerType.nightHunger,
    _ => null,
  };
}

class NutritionData {
  const NutritionData({
    required this.calories,
    this.proteinGrams = 0,
    this.carbsGrams = 0,
    this.fatGrams = 0,
    this.fiberGrams = 0,
  });

  const NutritionData.empty()
    : calories = 0,
      proteinGrams = 0,
      carbsGrams = 0,
      fatGrams = 0,
      fiberGrams = 0;

  final int calories;
  final double proteinGrams;
  final double carbsGrams;
  final double fatGrams;
  final double fiberGrams;

  factory NutritionData.fromJson(Map<String, dynamic> json) {
    return NutritionData(
      calories: _nonNegativeInt(json['calories']),
      proteinGrams: _nonNegativeDouble(json['proteinGrams']),
      carbsGrams: _nonNegativeDouble(json['carbsGrams']),
      fatGrams: _nonNegativeDouble(json['fatGrams']),
      fiberGrams: _nonNegativeDouble(json['fiberGrams']),
    );
  }

  Map<String, dynamic> toJson() => {
    'calories': calories,
    'proteinGrams': proteinGrams,
    'carbsGrams': carbsGrams,
    'fatGrams': fatGrams,
    'fiberGrams': fiberGrams,
  };

  NutritionData copyWith({
    int? calories,
    double? proteinGrams,
    double? carbsGrams,
    double? fatGrams,
    double? fiberGrams,
  }) {
    return NutritionData(
      calories: calories ?? this.calories,
      proteinGrams: proteinGrams ?? this.proteinGrams,
      carbsGrams: carbsGrams ?? this.carbsGrams,
      fatGrams: fatGrams ?? this.fatGrams,
      fiberGrams: fiberGrams ?? this.fiberGrams,
    );
  }
}

class FoodItemBreakdown {
  const FoodItemBreakdown({required this.name, required this.calories});

  final String name;
  final int calories;

  factory FoodItemBreakdown.fromJson(Map<String, dynamic> json) {
    return FoodItemBreakdown(
      name: json['name'] is String ? json['name'] as String : '',
      calories: _nonNegativeInt(json['calories']),
    );
  }

  Map<String, dynamic> toJson() => {'name': name, 'calories': calories};
}

class MealLog {
  const MealLog({
    required this.id,
    required this.timestamp,
    required this.name,
    required this.isSnack,
    required this.nutrition,
    this.source = MealSource.manual,
    this.trigger,
    this.itemsBreakdown = const [],
    this.notes,
  });

  final String id;
  final DateTime timestamp;
  final String name;
  final bool isSnack;
  final TriggerType? trigger;
  final NutritionData nutrition;
  final MealSource source;
  final List<FoodItemBreakdown> itemsBreakdown;
  final String? notes;

  factory MealLog.fromJson(Map<String, dynamic> json) {
    final rawItems = json['itemsBreakdown'];
    return MealLog(
      id: json['id'] is String ? json['id'] as String : '',
      timestamp:
          DateTime.tryParse(json['timestamp']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      name: json['name'] is String ? json['name'] as String : '',
      isSnack: json['isSnack'] == true,
      trigger: triggerTypeFromWireName(json['trigger']),
      nutrition: json['nutrition'] is Map
          ? NutritionData.fromJson(
              Map<String, dynamic>.from(json['nutrition'] as Map),
            )
          : const NutritionData.empty(),
      source: json['source'] == 'ai' ? MealSource.ai : MealSource.manual,
      itemsBreakdown: rawItems is List
          ? rawItems
                .whereType<Map>()
                .map(
                  (item) => FoodItemBreakdown.fromJson(
                    Map<String, dynamic>.from(item),
                  ),
                )
                .toList(growable: false)
          : const [],
      notes: json['notes'] is String ? json['notes'] as String : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'timestamp': timestamp.toIso8601String(),
    'name': name,
    'isSnack': isSnack,
    if (trigger != null) 'trigger': trigger!.wireName,
    'nutrition': nutrition.toJson(),
    'source': source.name,
    if (itemsBreakdown.isNotEmpty)
      'itemsBreakdown': itemsBreakdown.map((item) => item.toJson()).toList(),
    if (notes != null) 'notes': notes,
  };

  MealLog copyWith({
    String? id,
    DateTime? timestamp,
    String? name,
    bool? isSnack,
    TriggerType? trigger,
    NutritionData? nutrition,
    MealSource? source,
    List<FoodItemBreakdown>? itemsBreakdown,
    String? notes,
    bool clearTrigger = false,
    bool clearNotes = false,
  }) {
    return MealLog(
      id: id ?? this.id,
      timestamp: timestamp ?? this.timestamp,
      name: name ?? this.name,
      isSnack: isSnack ?? this.isSnack,
      trigger: clearTrigger ? null : trigger ?? this.trigger,
      nutrition: nutrition ?? this.nutrition,
      source: source ?? this.source,
      itemsBreakdown: itemsBreakdown ?? this.itemsBreakdown,
      notes: clearNotes ? null : notes ?? this.notes,
    );
  }
}

int _nonNegativeInt(Object? value) {
  final parsed = value is num ? value : num.tryParse(value?.toString() ?? '');
  if (parsed == null || !parsed.isFinite) return 0;
  return parsed.round().clamp(0, 1000000000);
}

double _nonNegativeDouble(Object? value) {
  final parsed = value is num ? value : num.tryParse(value?.toString() ?? '');
  if (parsed == null || !parsed.isFinite) return 0;
  return parsed.toDouble().clamp(0, 1000000000);
}
