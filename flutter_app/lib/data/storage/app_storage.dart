import 'dart:async';
import 'dart:convert';

import 'package:diet/domain/models/models.dart';

import '../ai/ai_models.dart';
import '../ai/json_sanitizer.dart';
import '../migration/legacy_ios_migration.dart';
import 'api_key_vault.dart';
import 'key_value_store.dart';

/// Versioned, sanitized persistence for all user-authored app data.
///
/// Every JSON value is wrapped in an envelope so future migrations can be
/// applied independently. API keys are deliberately handled by [ApiKeyVault].
final class AppStorage {
  AppStorage._(this._preferences, this.apiKeys);

  static const int schemaVersion = 7;

  final KeyValueStore _preferences;
  final ApiKeyVault apiKeys;
  Future<void> _writeTail = Future<void>.value();

  static const _schemaKey = LegacyIosMigration.schemaKey;
  static const _profileKey = 'habitdiet.profile';
  static const _mealsKey = 'habitdiet.meals';
  static const _weightsKey = 'habitdiet.weights';
  static const _aiProvidersKey = 'habitdiet.ai.providers';
  static const _dashboardOrderKey = 'habitdiet.dashboard.order';
  static const _waterPrefix = 'habitdiet.day.water.';
  static const _stepsPrefix = 'habitdiet.day.steps.';
  static const _activitiesPrefix = 'habitdiet.day.activities.';

  static const _legacyProfileKey = '@habitdiet_user_profile';
  static const _legacyMealsKey = '@habitdiet_meal_logs';
  static const _legacyWeightsKey = '@habitdiet_weight_logs';
  static const _legacyWaterPrefix = '@habitdiet_water_glasses_';
  static const _legacyStepsPrefix = '@habitdiet_step_record_';
  static const _legacyStepCountPrefix = '@habitdiet_step_count_';
  static const _legacyActivitiesPrefix = '@habitdiet_activity_logs_';

  static Future<AppStorage> initialize({
    KeyValueStore? preferences,
    ApiKeyVault? apiKeys,
    LegacyIosStorageReader? legacyIosReader,
  }) async {
    final preferenceStore = preferences ?? SharedPreferencesKeyValueStore();
    final keyVault = apiKeys ?? ApiKeyVault();
    final storage = AppStorage._(preferenceStore, keyVault);
    if (legacyIosReader != null || preferences == null) {
      await LegacyIosMigration(
        preferences: preferenceStore,
        apiKeys: keyVault,
        reader: legacyIosReader ?? const MethodChannelLegacyIosStorageReader(),
      ).seedIfFlutterSchemaAbsent();
    }
    await storage._migrate();
    return storage;
  }

  Future<UserProfile> loadProfile() async {
    final raw = await _preferences.getString(_profileKey);
    final map = _unwrapObject(raw, 'profile');
    if (map == null) return const UserProfile();
    return _sanitizeProfile(UserProfile.fromJson(map));
  }

  Future<UserProfile> loadUserProfile() => loadProfile();

  Future<void> saveProfile(UserProfile profile) {
    final clean = _sanitizeProfile(profile);
    return _enqueue(
      () => _preferences.setString(
        _profileKey,
        _objectEnvelope('profile', clean.toJson()),
      ),
    );
  }

  Future<void> saveUserProfile(UserProfile profile) => saveProfile(profile);

  Future<List<MealLog>> loadMeals({DateTime? day}) async {
    final raw = await _preferences.getString(_mealsKey);
    final clean =
        _unwrapList(raw, 'items')
            .take(5000)
            .whereType<Map>()
            .map((item) => MealLog.fromJson(Map<String, dynamic>.from(item)))
            .map(_sanitizeMeal)
            .whereType<MealLog>()
            .where((meal) => day == null || _sameLocalDay(meal.timestamp, day))
            .toList(growable: false)
          ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return clean;
  }

  Future<List<MealLog>> loadMealLogs({DateTime? day}) => loadMeals(day: day);

  Future<void> saveMeals(List<MealLog> meals) {
    final clean =
        meals.map(_sanitizeMeal).whereType<MealLog>().toList(growable: false)
          ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return _enqueue(
      () => _preferences.setString(
        _mealsKey,
        _listEnvelope(clean.map((item) => item.toJson())),
      ),
    );
  }

  Future<void> saveMealLogs(List<MealLog> meals) => saveMeals(meals);

  Future<List<ActivityLog>> loadActivities(DateTime day) async {
    final raw = await _preferences.getString(
      '$_activitiesPrefix${dateKey(day)}',
    );
    final clean =
        _unwrapList(raw, 'items')
            .take(500)
            .whereType<Map>()
            .map(
              (item) => ActivityLog.fromJson(Map<String, dynamic>.from(item)),
            )
            .map(_sanitizeActivity)
            .whereType<ActivityLog>()
            .where((activity) => _sameLocalDay(activity.timestamp, day))
            .toList(growable: false)
          ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return clean;
  }

  Future<List<ActivityLog>> loadActivityLogs(DateTime day) =>
      loadActivities(day);

  Future<void> saveActivities(DateTime day, List<ActivityLog> activities) {
    final clean =
        activities
            .map(_sanitizeActivity)
            .whereType<ActivityLog>()
            .where((activity) => _sameLocalDay(activity.timestamp, day))
            .toList(growable: false)
          ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return _enqueue(
      () => _preferences.setString(
        '$_activitiesPrefix${dateKey(day)}',
        _listEnvelope(clean.map((item) => item.toJson())),
      ),
    );
  }

  Future<void> saveActivityLogs(DateTime day, List<ActivityLog> activities) =>
      saveActivities(day, activities);

  Future<List<WeightLog>> loadWeights() async {
    final raw = await _preferences.getString(_weightsKey);
    final clean =
        _unwrapList(raw, 'items')
            .take(5000)
            .whereType<Map>()
            .map((item) => WeightLog.fromJson(Map<String, dynamic>.from(item)))
            .map(_sanitizeWeight)
            .whereType<WeightLog>()
            .toList(growable: false)
          ..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
    return clean;
  }

  Future<List<WeightLog>> loadWeightLogs() => loadWeights();

  Future<void> saveWeights(List<WeightLog> weights) {
    final clean =
        weights
            .map(_sanitizeWeight)
            .whereType<WeightLog>()
            .toList(growable: false)
          ..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
    return _enqueue(
      () => _preferences.setString(
        _weightsKey,
        _listEnvelope(clean.map((item) => item.toJson())),
      ),
    );
  }

  Future<void> saveWeightLogs(List<WeightLog> weights) => saveWeights(weights);

  Future<int> loadWaterGlasses(DateTime day) async {
    final raw = await _preferences.getString('$_waterPrefix${dateKey(day)}');
    final envelope = _unwrapObject(raw, 'value');
    return cleanInt(envelope?['count'] ?? raw, min: 0, max: 100);
  }

  Future<void> saveWaterGlasses(DateTime day, int count) {
    return _enqueue(
      () => _preferences.setString(
        '$_waterPrefix${dateKey(day)}',
        _objectEnvelope('value', <String, Object?>{
          'count': count.clamp(0, 100),
        }),
      ),
    );
  }

  Future<StepRecord> loadSteps(DateTime day) async {
    final raw = await _preferences.getString('$_stepsPrefix${dateKey(day)}');
    final map = _unwrapObject(raw, 'value');
    return map == null ? const StepRecord() : StepRecord.fromJson(map);
  }

  Future<StepRecord> loadStepRecord(DateTime day) => loadSteps(day);

  Future<void> saveSteps(DateTime day, StepRecord record) {
    final clean = StepRecord(
      sensorSteps: record.sensorSteps.clamp(0, 1000000),
      manualSteps: record.manualSteps.clamp(0, 1000000),
    );
    return _enqueue(
      () => _preferences.setString(
        '$_stepsPrefix${dateKey(day)}',
        _objectEnvelope('value', clean.toJson()),
      ),
    );
  }

  Future<void> saveStepRecord(DateTime day, StepRecord record) =>
      saveSteps(day, record);

  Future<List<AiProviderConfig>> loadAiProviderConfigs() async {
    final raw = await _preferences.getString(_aiProvidersKey);
    final configs = _unwrapList(raw, 'items')
        .map(AiProviderConfig.fromJson)
        .whereType<AiProviderConfig>()
        .toList(growable: false);
    return configs.isEmpty
        ? const <AiProviderConfig>[defaultGoogleAiStudioConfig]
        : configs;
  }

  Future<void> saveAiProviderConfigs(List<AiProviderConfig> configs) {
    final clean = configs
        .map((item) => AiProviderConfig.fromJson(item.toJson()))
        .whereType<AiProviderConfig>()
        .toList(growable: false);
    return _enqueue(
      () => _preferences.setString(
        _aiProvidersKey,
        _listEnvelope(clean.map((item) => item.toJson())),
      ),
    );
  }

  Future<List<String>> loadDashboardOrder() async {
    const defaults = <String>[
      'energy',
      'mealGap',
      'signals',
      'focus',
      'activity',
      'journal',
    ];
    final raw = await _preferences.getString(_dashboardOrderKey);
    if (raw == null) return defaults;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return defaults;
      final order = <String>[];
      for (final id in decoded.whereType<String>()) {
        if (defaults.contains(id) && !order.contains(id)) order.add(id);
      }
      for (final id in defaults) {
        if (!order.contains(id)) order.add(id);
      }
      return order.take(defaults.length).toList(growable: false);
    } on FormatException {
      return defaults;
    }
  }

  Future<void> saveDashboardOrder(List<String> order) {
    const allowed = <String>{
      'energy',
      'mealGap',
      'signals',
      'focus',
      'activity',
      'journal',
    };
    final clean = order.where(allowed.contains).toSet().toList();
    for (final id in allowed) {
      if (!clean.contains(id)) clean.add(id);
    }
    return _enqueue(
      () => _preferences.setString(_dashboardOrderKey, jsonEncode(clean)),
    );
  }

  static String dateKey(DateTime date) {
    final local = date.toLocal();
    return '${local.year.toString().padLeft(4, '0')}-'
        '${local.month.toString().padLeft(2, '0')}-'
        '${local.day.toString().padLeft(2, '0')}';
  }

  Future<void> _migrate() async {
    final rawSchema = await _preferences.getString(_schemaKey);
    final current = int.tryParse(rawSchema ?? '') ?? 0;
    if (current >= schemaVersion) return;

    await _migrateProfile();
    await _migrateList(_mealsKey, _legacyMealsKey, 'items');
    await _migrateList(_weightsKey, _legacyWeightsKey, 'items');
    await _migrateDatedValues();

    var weights = await loadWeights();
    if (weights.isEmpty) {
      final profile = await loadProfile();
      weights = <WeightLog>[
        WeightLog(
          id: 'weight-profile-seed-v7',
          weightKg: profile.weightKg,
          recordedAt: DateTime.now(),
          note: 'Berat awal dari profil',
        ),
      ];
      await saveWeights(weights);
    }

    await _preferences.setString(_schemaKey, '$schemaVersion');
  }

  Future<void> _migrateProfile() async {
    var raw = await _preferences.getString(_profileKey);
    raw ??= await _preferences.getString(_legacyProfileKey);
    final legacy = decodeStoredObject(raw);
    final map = _unwrapObject(raw, 'profile') ?? legacy;
    if (map == null) {
      await saveProfile(const UserProfile());
      return;
    }

    final key = cleanText(map['geminiApiKey'], maxLength: 500);
    if (key.isNotEmpty && await apiKeys.read('google-ai-studio') == '') {
      await apiKeys.write('google-ai-studio', key);
    }
    map.remove('geminiApiKey');
    await saveProfile(UserProfile.fromJson(map));
    await _preferences.remove(_legacyProfileKey);
  }

  Future<void> _migrateList(
    String targetKey,
    String legacyKey,
    String field,
  ) async {
    var raw = await _preferences.getString(targetKey);
    raw ??= await _preferences.getString(legacyKey);
    if (raw == null) return;
    final values = _unwrapList(raw, field);
    await _preferences.setString(targetKey, _listEnvelope(values));
    await _preferences.remove(legacyKey);
  }

  Future<void> _migrateDatedValues() async {
    final keys = await _preferences.getKeys();
    for (final key in keys) {
      if (key.startsWith(_legacyWaterPrefix)) {
        final day = key.substring(_legacyWaterPrefix.length);
        final count = cleanInt(
          await _preferences.getString(key),
          min: 0,
          max: 100,
        );
        await _preferences.setString(
          '$_waterPrefix$day',
          _objectEnvelope('value', <String, Object?>{'count': count}),
        );
        await _preferences.remove(key);
      } else if (key.startsWith(_legacyStepsPrefix)) {
        final day = key.substring(_legacyStepsPrefix.length);
        final old = decodeStoredObject(await _preferences.getString(key));
        if (old != null) {
          await _preferences.setString(
            '$_stepsPrefix$day',
            _objectEnvelope('value', StepRecord.fromJson(old).toJson()),
          );
        }
        await _preferences.remove(key);
      } else if (key.startsWith(_legacyStepCountPrefix)) {
        final day = key.substring(_legacyStepCountPrefix.length);
        final steps = cleanInt(
          await _preferences.getString(key),
          min: 0,
          max: 1000000,
        );
        await _preferences.setString(
          '$_stepsPrefix$day',
          _objectEnvelope('value', StepRecord(sensorSteps: steps).toJson()),
        );
        await _preferences.remove(key);
      } else if (key.startsWith(_legacyActivitiesPrefix)) {
        final day = key.substring(_legacyActivitiesPrefix.length);
        final raw = await _preferences.getString(key);
        await _preferences.setString(
          '$_activitiesPrefix$day',
          _listEnvelope(_unwrapList(raw, 'items')),
        );
        await _preferences.remove(key);
      }
    }
  }

  Future<void> _enqueue(Future<void> Function() task) {
    final completer = Completer<void>();
    _writeTail = _writeTail.then(
      (_) async {
        try {
          await task();
          completer.complete();
        } catch (error, stackTrace) {
          completer.completeError(error, stackTrace);
        }
      },
      onError: (_) async {
        // A failed write never poisons later writes.
        try {
          await task();
          completer.complete();
        } catch (error, stackTrace) {
          completer.completeError(error, stackTrace);
        }
      },
    );
    return completer.future;
  }

  static UserProfile _sanitizeProfile(UserProfile profile) {
    return profile.copyWith(
      name: cleanText(profile.name, fallback: 'Kamu', maxLength: 80),
      age: profile.age.clamp(10, 100),
      heightCm: profile.heightCm.clamp(100, 230),
      weightKg: profile.weightKg.clamp(30, 250),
      targetWeightKg: profile.targetWeightKg.clamp(30, 250),
      targetDeficitKcal: profile.targetDeficitKcal.clamp(0, 1000),
      bedtimeHour: profile.bedtimeHour.clamp(0, 23),
      lastMealAt: _plausibleDate(profile.lastMealAt),
      fastingStartedAt: _plausibleDate(profile.fastingStartedAt),
      clearLastMealAt:
          profile.lastMealAt != null &&
          _plausibleDate(profile.lastMealAt) == null,
      clearFastingStartedAt:
          profile.fastingStartedAt != null &&
          _plausibleDate(profile.fastingStartedAt) == null,
    );
  }

  static MealLog? _sanitizeMeal(MealLog meal) {
    final timestamp = _plausibleDate(meal.timestamp);
    final name = cleanText(meal.name, maxLength: 140);
    if (meal.id.trim().isEmpty || timestamp == null || name.isEmpty) {
      return null;
    }
    if (meal.nutrition.calories < 0 || meal.nutrition.calories > 20000) {
      return null;
    }
    return meal.copyWith(
      id: cleanText(meal.id, maxLength: 100),
      timestamp: timestamp,
      name: name,
      nutrition: meal.nutrition.copyWith(
        calories: meal.nutrition.calories.clamp(0, 20000),
        proteinGrams: meal.nutrition.proteinGrams.clamp(0, 1000),
        carbsGrams: meal.nutrition.carbsGrams.clamp(0, 2000),
        fatGrams: meal.nutrition.fatGrams.clamp(0, 1000),
        fiberGrams: meal.nutrition.fiberGrams.clamp(0, 500),
      ),
      itemsBreakdown: meal.itemsBreakdown
          .where((item) => item.name.trim().isNotEmpty)
          .take(30)
          .map(
            (item) => FoodItemBreakdown(
              name: cleanText(item.name, maxLength: 100),
              calories: item.calories.clamp(0, 20000),
            ),
          )
          .toList(growable: false),
      notes: meal.notes == null ? null : cleanText(meal.notes, maxLength: 500),
      clearNotes: meal.notes != null && meal.notes!.trim().isEmpty,
    );
  }

  static ActivityLog? _sanitizeActivity(ActivityLog activity) {
    final timestamp = _plausibleDate(activity.timestamp);
    final name = cleanText(activity.name, maxLength: 120);
    if (activity.id.trim().isEmpty || timestamp == null || name.isEmpty) {
      return null;
    }
    return activity.copyWith(
      id: cleanText(activity.id, maxLength: 100),
      timestamp: timestamp,
      name: name,
      durationMinutes: activity.durationMinutes.clamp(1, 720),
      met: activity.met.clamp(1, 20),
      estimatedCalories: activity.estimatedCalories.clamp(0, 10000),
      creditedCalories: activity.creditedCalories.clamp(0, 10000),
      notes: activity.notes == null
          ? null
          : cleanText(activity.notes, maxLength: 500),
      clearNotes: activity.notes != null && activity.notes!.trim().isEmpty,
    );
  }

  static WeightLog? _sanitizeWeight(WeightLog weight) {
    final date = _plausibleDate(weight.recordedAt);
    if (weight.id.trim().isEmpty || date == null) return null;
    return weight.copyWith(
      id: cleanText(weight.id, maxLength: 100),
      weightKg: weight.weightKg.clamp(20, 300),
      recordedAt: date,
      note: weight.note == null ? null : cleanText(weight.note, maxLength: 300),
      clearNote: weight.note != null && weight.note!.trim().isEmpty,
    );
  }

  static DateTime? _plausibleDate(DateTime? date) {
    if (date == null) return null;
    final local = date.toLocal();
    if (local.year < 2000 || local.year > 2200) return null;
    return local;
  }

  static bool _sameLocalDay(DateTime first, DateTime second) {
    final a = first.toLocal();
    final b = second.toLocal();
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  static String _objectEnvelope(String field, Map<String, Object?> value) =>
      jsonEncode(<String, Object?>{
        'schemaVersion': schemaVersion,
        field: value,
      });

  static String _listEnvelope(Iterable<Object?> values) =>
      jsonEncode(<String, Object?>{
        'schemaVersion': schemaVersion,
        'items': values.toList(growable: false),
      });

  static Map<String, dynamic>? _unwrapObject(String? raw, String field) {
    final envelope = decodeStoredObject(raw);
    if (envelope == null) return null;
    final value = envelope[field] ?? envelope;
    return value is Map ? Map<String, dynamic>.from(value) : null;
  }

  static List<Object?> _unwrapList(String? raw, String field) {
    final direct = decodeStoredList(raw);
    if (direct.isNotEmpty) return direct;
    final envelope = decodeStoredObject(raw);
    final value = envelope?[field];
    return value is List ? List<Object?>.from(value) : const <Object?>[];
  }
}
