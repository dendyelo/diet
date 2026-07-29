import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../data/data.dart';
import '../domain/domain.dart';
import '../platform/step_tracking_service.dart';

class LastHungerCheck {
  const LastHungerCheck({
    required this.answer,
    required this.signal,
    required this.intent,
    required this.checkedAt,
  });

  final HungerCheckAnswer answer;
  final HungerSignal? signal;
  final EatingIntent? intent;
  final DateTime checkedAt;
}

class DietAppController extends ChangeNotifier {
  DietAppController(
    this._storage, {
    StepTrackingService? stepTracking,
    DateTime Function()? clock,
    this.enableStepTracking = true,
  }) : _stepTracking =
           stepTracking ?? (enableStepTracking ? StepTrackingService() : null),
       _clock = clock ?? DateTime.now,
       _now = (clock ?? DateTime.now)();

  final AppStorage _storage;
  final StepTrackingService? _stepTracking;
  final DateTime Function() _clock;
  final bool enableStepTracking;

  UserProfile _profile = const UserProfile();
  List<MealLog> _meals = <MealLog>[];
  List<ActivityLog> _activities = <ActivityLog>[];
  List<WeightLog> _weights = <WeightLog>[];
  StepRecord _steps = const StepRecord();
  int _waterGlasses = 0;
  DateTime _now;
  LastHungerCheck? _lastHungerCheck;
  DailyInsight? _dailyInsight;
  late AiService _ai;
  List<AiProviderConfig> _aiProviders = const <AiProviderConfig>[
    defaultGoogleAiStudioConfig,
  ];
  String _selectedAiProviderId = defaultGoogleAiStudioConfig.id;
  final Set<String> _configuredAiProviderIds = <String>{};
  final Map<String, int> _waterHistory = <String, int>{};
  final Map<String, int> _stepHistory = <String, int>{};
  bool _hasApiKey = false;
  bool _initialized = false;
  bool _initializing = false;
  bool _insightLoading = false;
  bool _rollingDay = false;
  Object? _initializationError;
  Timer? _clockTimer;
  Timer? _insightDebounce;
  StreamSubscription<StepTrackingSnapshot>? _stepSubscription;
  String? _lastInsightContextKey;

  bool get initialized => _initialized;
  bool get initializing => _initializing;
  Object? get initializationError => _initializationError;
  UserProfile get profile => _profile;
  List<MealLog> get allMeals => List.unmodifiable(_meals);
  List<ActivityLog> get activities {
    final credits = activityCreditAllocation.byActivityId;
    return List<ActivityLog>.unmodifiable(
      _activities.map(
        (activity) => activity.copyWith(
          creditedCalories: credits[activity.id] ?? activity.estimatedCalories,
        ),
      ),
    );
  }

  List<WeightLog> get weights => List.unmodifiable(_weights);
  int get waterGlasses => _waterGlasses;
  int get steps => _steps.totalSteps;
  int get manualSteps => _steps.manualSteps;
  DateTime get now => _now;
  LastHungerCheck? get lastHungerCheck => _lastHungerCheck;
  DailyInsight? get dailyInsight => _dailyInsight;
  bool get insightLoading => _insightLoading;
  AiConnectionStatus get aiStatus => _ai.status;
  String? get activeAiModel => _ai.activeModel;
  String? get activeAiProviderId => _ai.activeProviderId;
  List<AiProviderConfig> get aiProviders => List.unmodifiable(_aiProviders);
  String get selectedAiProviderId => _selectedAiProviderId;
  bool get hasApiKey => _hasApiKey;
  Set<String> get configuredAiProviderIds =>
      Set.unmodifiable(_configuredAiProviderIds);
  StepTrackingSnapshot get stepTracking =>
      _stepTracking?.current ?? StepTrackingSnapshot.initial();

  List<MealLog> get todayMeals {
    final result =
        _meals.where((meal) => _sameDay(meal.timestamp, _now)).toList()
          ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return result;
  }

  int get totalCaloriesIn =>
      todayMeals.fold<int>(0, (total, meal) => total + meal.nutrition.calories);

  double get proteinGrams => todayMeals.fold<double>(
    0,
    (total, meal) => total + meal.nutrition.proteinGrams,
  );

  int get snackCount => todayMeals.where((meal) => meal.isSnack).length;

  int get targetProtein => CalorieCalculator.calculateTargetProtein(_profile);

  ActivityCreditAllocation get activityCreditAllocation {
    final stepSummary = CalorieCalculator.calculateActivitySummary(
      _profile,
      steps,
    );
    return ActivityCalculator.allocateNarratedCalories(
      activities: _activities,
      creditedStepCalories: stepSummary.creditedStepCalories,
    );
  }

  int get narratedActivityCalories => activityCreditAllocation.totalCalories;

  EnergyBalance get energy => CalorieCalculator.calculateEnergyBalance(
    profile: _profile,
    totalCaloriesIn: totalCaloriesIn,
    steps: steps,
    at: _now,
    narratedActivityCalories: narratedActivityCalories,
  );

  Duration? get mealGap {
    final lastMeal = _profile.lastMealAt;
    if (lastMeal == null) return null;
    return FastingCalculator.mealGap(lastMealAt: lastMeal, now: _now);
  }

  HungerDecision? get liveHungerDecision {
    final check = _lastHungerCheck;
    if (check == null) return null;
    if (_now.difference(check.checkedAt) > const Duration(minutes: 30)) {
      return null;
    }
    final mealsAfterCheck = todayMeals.any(
      (meal) => meal.timestamp.isAfter(check.checkedAt),
    );
    if (mealsAfterCheck) return null;
    final gap = mealGap;
    final gapHours = gap == null
        ? 0.0
        : (gap.inSeconds <= 0 ? 1 : gap.inSeconds) / Duration.secondsPerHour;
    return decideHunger(
      HungerDecisionInput(
        answer: check.answer,
        signal: check.signal,
        intent: check.intent,
        caloriesIn: totalCaloriesIn,
        targetCalories: energy.dietTargetCalories,
        maintenanceCalories: energy.projectedCaloriesOut,
        waterGlasses: _waterGlasses,
        snackCount: snackCount,
        hoursSinceLastMeal: gapHours,
      ),
    );
  }

  Future<void> initialize() async {
    if (_initialized || _initializing) return;
    _initializing = true;
    _initializationError = null;
    _now = _clock();
    notifyListeners();

    try {
      final results = await Future.wait<Object>([
        _storage.loadProfile(),
        _storage.loadMeals(),
        _storage.loadActivities(_now),
        _storage.loadWeights(),
        _storage.loadWaterGlasses(_now),
        _storage.loadSteps(_now),
        _storage.loadAiProviderConfigs(),
      ]);
      _profile = results[0] as UserProfile;
      _meals = List<MealLog>.from(results[1] as List<MealLog>);
      _activities = List<ActivityLog>.from(results[2] as List<ActivityLog>);
      _weights = List<WeightLog>.from(results[3] as List<WeightLog>);
      _waterGlasses = results[4] as int;
      _steps = results[5] as StepRecord;
      _aiProviders = List<AiProviderConfig>.from(
        results[6] as List<AiProviderConfig>,
      );
      _selectedAiProviderId = _aiProviders
          .firstWhere(
            (provider) => provider.enabled,
            orElse: () => _aiProviders.first,
          )
          .id;
      _ai = AiService(apiKeys: _storage.apiKeys, configs: _aiProviders);
      for (final provider in _aiProviders) {
        if ((await _storage.apiKeys.read(provider.id)).isNotEmpty) {
          _configuredAiProviderIds.add(provider.id);
        }
      }
      _hasApiKey = _configuredAiProviderIds.contains(_selectedAiProviderId);
      await _loadSevenDayHistory();
      await _synchronizeLastMeal(save: true);

      _clockTimer = Timer.periodic(
        const Duration(seconds: 30),
        (_) => unawaited(refreshCurrentDay()),
      );
      if (enableStepTracking) {
        _stepSubscription = _stepTracking!.snapshots.listen(_onStepSnapshot);
        unawaited(_stepTracking.start());
      }
      _initialized = true;
    } catch (error) {
      _initializationError = error;
    } finally {
      _initializing = false;
      notifyListeners();
    }
  }

  void recordHungerCheck({
    required HungerCheckAnswer answer,
    required HungerSignal? signal,
    required EatingIntent? intent,
    DateTime? checkedAt,
  }) {
    _lastHungerCheck = LastHungerCheck(
      answer: answer,
      signal: signal,
      intent: intent,
      checkedAt: checkedAt ?? _clock(),
    );
    notifyListeners();
    _scheduleDailyInsight(force: true);
  }

  Future<void> addWater() async {
    _waterGlasses = (_waterGlasses + 1).clamp(0, 100);
    _waterHistory[_dayKey(_now)] = _waterGlasses;
    notifyListeners();
    await _storage.saveWaterGlasses(_now, _waterGlasses);
    _scheduleDailyInsight();
  }

  Future<void> saveMeal(MealLog meal) async {
    final index = _meals.indexWhere((item) => item.id == meal.id);
    if (index >= 0) {
      _meals[index] = meal;
    } else {
      _meals.add(meal);
    }
    _meals.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    await _synchronizeLastMeal(save: false);
    notifyListeners();
    await Future.wait([
      _storage.saveMeals(_meals),
      _storage.saveProfile(_profile),
    ]);
    _scheduleDailyInsight();
  }

  Future<void> deleteMeal(MealLog meal) async {
    _meals.removeWhere((item) => item.id == meal.id);
    await _synchronizeLastMeal(save: false);
    notifyListeners();
    await Future.wait([
      _storage.saveMeals(_meals),
      _storage.saveProfile(_profile),
    ]);
    _scheduleDailyInsight();
  }

  Future<void> saveActivity(ActivityLog activity) async {
    final index = _activities.indexWhere((item) => item.id == activity.id);
    if (index >= 0) {
      _activities[index] = activity;
    } else {
      _activities.add(activity);
    }
    _activities.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    notifyListeners();
    await _storage.saveActivities(_now, _activities);
    _scheduleDailyInsight();
  }

  Future<void> deleteActivity(ActivityLog activity) async {
    _activities.removeWhere((item) => item.id == activity.id);
    notifyListeners();
    await _storage.saveActivities(_now, _activities);
    _scheduleDailyInsight();
  }

  Future<void> saveWeight(WeightLog weight) async {
    final index = _weights.indexWhere((item) => item.id == weight.id);
    if (index >= 0) {
      _weights[index] = weight;
    } else {
      _weights.add(weight);
    }
    _weights.sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
    if (_weights.isNotEmpty) {
      _profile = _profile.copyWith(weightKg: _weights.first.weightKg);
    }
    notifyListeners();
    await Future.wait([
      _storage.saveWeights(_weights),
      _storage.saveProfile(_profile),
    ]);
    _scheduleDailyInsight();
  }

  Future<void> deleteWeight(WeightLog weight) async {
    if (_weights.length <= 1) return;
    _weights.removeWhere((item) => item.id == weight.id);
    _weights.sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
    _profile = _profile.copyWith(weightKg: _weights.first.weightKg);
    notifyListeners();
    await Future.wait([
      _storage.saveWeights(_weights),
      _storage.saveProfile(_profile),
    ]);
  }

  Future<void> saveProfile(UserProfile profile) async {
    _profile = profile;
    notifyListeners();
    await _storage.saveProfile(_profile);
    _scheduleDailyInsight(force: true);
  }

  Future<void> setManualSteps(int value) async {
    _steps = _steps.copyWith(manualSteps: value.clamp(0, 1000000));
    notifyListeners();
    await _storage.saveSteps(_now, _steps);
  }

  Future<MealAnalysis> analyzeMeal(String description) {
    return _ai.parseMeal(description);
  }

  Future<ParsedActivity> analyzeActivity(String description) {
    return _ai.parseActivity(description);
  }

  Future<CoachMessage> askCoach(
    String query, {
    List<Map<String, String>> history = const [],
  }) async {
    final result = await _ai.askCoach(
      query: query,
      context: _aiContext(),
      history: history,
    );
    notifyListeners();
    return result;
  }

  Future<void> selectAiProvider(String providerId) async {
    final selected = _aiProviders.where((item) => item.id == providerId);
    if (selected.isEmpty) return;
    _aiProviders = <AiProviderConfig>[
      selected.first,
      ..._aiProviders.where((item) => item.id != providerId),
    ];
    _selectedAiProviderId = providerId;
    _hasApiKey = _configuredAiProviderIds.contains(providerId);
    _configureAiForSelection();
    notifyListeners();
    await _storage.saveAiProviderConfigs(_aiProviders);
  }

  Future<void> saveApiKey(String apiKey) async {
    await _storage.apiKeys.write(_selectedAiProviderId, apiKey);
    _hasApiKey = apiKey.trim().isNotEmpty;
    if (_hasApiKey) {
      _configuredAiProviderIds.add(_selectedAiProviderId);
    } else {
      _configuredAiProviderIds.remove(_selectedAiProviderId);
    }
    _configureAiForSelection();
    notifyListeners();
  }

  Future<AiConnectionStatus> testAiConnection() async {
    _configureAiForSelection();
    notifyListeners();
    final status = await _ai.testConnection();
    notifyListeners();
    return status;
  }

  Future<void> deleteApiKey() async {
    await _storage.apiKeys.delete(_selectedAiProviderId);
    _hasApiKey = false;
    _configuredAiProviderIds.remove(_selectedAiProviderId);
    _configureAiForSelection();
    notifyListeners();
  }

  Future<String> addOpenAiCompatibleProvider({
    required String label,
    required String baseUrl,
    required List<String> models,
  }) async {
    final id = 'custom-${DateTime.now().millisecondsSinceEpoch}';
    final candidate = AiProviderConfig.fromJson({
      'id': id,
      'label': label,
      'kind': AiProviderKind.openAiCompatible.name,
      'baseUrl': baseUrl,
      'models': models,
      'enabled': true,
    });
    if (candidate == null) {
      throw const FormatException('Konfigurasi provider tidak valid.');
    }
    _aiProviders = [
      candidate,
      ..._aiProviders.where((item) => item.id != candidate.id),
    ];
    await _storage.saveAiProviderConfigs(_aiProviders);
    _selectedAiProviderId = id;
    _hasApiKey = false;
    _configureAiForSelection();
    notifyListeners();
    return id;
  }

  Future<void> refreshDailyInsight() async {
    if (_lastHungerCheck == null || _insightLoading) return;
    _insightLoading = true;
    notifyListeners();
    try {
      final context = _aiContext();
      _dailyInsight = await _ai.dailyInsight(context);
      _lastInsightContextKey = _dailyInsightKey(context);
    } finally {
      _insightLoading = false;
      notifyListeners();
    }
  }

  void _scheduleDailyInsight({bool force = false}) {
    if (!_initialized || _lastHungerCheck == null) return;
    final contextKey = _dailyInsightKey(_aiContext());
    if (!force && contextKey == _lastInsightContextKey) return;
    _insightDebounce?.cancel();
    _insightDebounce = Timer(const Duration(milliseconds: 700), () {
      unawaited(refreshDailyInsight());
    });
  }

  Map<String, Object?> _aiContext() {
    final decision = liveHungerDecision;
    final activeCheck = decision == null ? null : _lastHungerCheck;
    return <String, Object?>{
      'name': _profile.name,
      'caloriesIn': totalCaloriesIn,
      'caloriesOutSoFar': energy.totalCaloriesOut,
      'projectedCaloriesOut': energy.projectedCaloriesOut,
      'fixedDietTarget': energy.dietTargetCalories,
      'remainingToDietTarget': energy.remainingToDietTarget,
      'proteinGrams': proteinGrams.round(),
      'proteinTargetGrams': targetProtein,
      'waterGlasses': _waterGlasses,
      'steps': steps,
      'narratedActivityCalories': narratedActivityCalories,
      'mealGapMinutes': mealGap?.inMinutes ?? 0,
      'snackCount': snackCount,
      'hungerAnswer': activeCheck?.answer.name ?? '',
      'recommendedAction': _aiAction(decision?.kind).name,
      'recentMeals': todayMeals
          .take(4)
          .map((meal) {
            return <String, Object?>{
              'name': meal.name,
              'calories': meal.nutrition.calories,
              'isSnack': meal.isSnack,
            };
          })
          .toList(growable: false),
    };
  }

  AiSuggestedAction _aiAction(HungerRecommendationKind? kind) {
    return switch (kind) {
      HungerRecommendationKind.meal ||
      HungerRecommendationKind.smallMeal => AiSuggestedAction.meal,
      HungerRecommendationKind.snack => AiSuggestedAction.snack,
      HungerRecommendationKind.water => AiSuggestedAction.water,
      HungerRecommendationKind.none => AiSuggestedAction.none,
      null => AiSuggestedAction.checkin,
    };
  }

  void _configureAiForSelection() {
    final selected = _aiProviders.where(
      (item) => item.id == _selectedAiProviderId,
    );
    if (selected.isEmpty) {
      _ai.configure(_aiProviders);
      return;
    }
    _ai.configure(<AiProviderConfig>[
      selected.first,
      ..._aiProviders.where((item) => item.id != _selectedAiProviderId),
    ]);
  }

  String _dailyInsightKey(Map<String, Object?> context) {
    final rawSteps = context['steps'];
    final rawGap = context['mealGapMinutes'];
    return jsonEncode(<String, Object?>{
      'caloriesIn': context['caloriesIn'],
      'fixedDietTarget': context['fixedDietTarget'],
      'proteinGrams': context['proteinGrams'],
      'proteinTargetGrams': context['proteinTargetGrams'],
      'waterGlasses': context['waterGlasses'],
      'stepBand': rawSteps is num ? rawSteps ~/ 500 : 0,
      'activityCalories': context['narratedActivityCalories'],
      'mealGapHour': rawGap is num ? rawGap ~/ 60 : 0,
      'snackCount': context['snackCount'],
      'hungerAnswer': context['hungerAnswer'],
      'recommendedAction': context['recommendedAction'],
      'recentMeals': context['recentMeals'],
    });
  }

  Future<void> refreshCurrentDay() async {
    final next = _clock();
    if (_sameDay(_now, next)) {
      _now = next;
      notifyListeners();
      _scheduleDailyInsight();
      return;
    }
    if (_rollingDay) return;
    _rollingDay = true;

    final previous = _now;
    try {
      if (enableStepTracking) await _stepTracking!.stop();
      _waterHistory[_dayKey(previous)] = _waterGlasses;
      _stepHistory[_dayKey(previous)] = _steps.totalSteps;

      final values = await Future.wait<Object>([
        _loadOr(_storage.loadActivities(next), <ActivityLog>[]),
        _loadOr(_storage.loadWaterGlasses(next), 0),
        _loadOr(_storage.loadSteps(next), const StepRecord()),
      ]);
      _now = next;
      _activities = List<ActivityLog>.from(values[0] as List<ActivityLog>);
      _waterGlasses = values[1] as int;
      _steps = values[2] as StepRecord;
      _waterHistory[_dayKey(next)] = _waterGlasses;
      _stepHistory[_dayKey(next)] = _steps.totalSteps;
      _lastHungerCheck = null;
      _dailyInsight = null;
      _lastInsightContextKey = null;
      _insightDebounce?.cancel();
      notifyListeners();
      if (enableStepTracking) unawaited(_stepTracking!.start());
    } catch (_) {
      _now = next;
      _activities = <ActivityLog>[];
      _waterGlasses = 0;
      _steps = const StepRecord();
      _lastHungerCheck = null;
      _dailyInsight = null;
      _lastInsightContextKey = null;
      notifyListeners();
      if (enableStepTracking) unawaited(_stepTracking!.start());
    } finally {
      _rollingDay = false;
    }
  }

  Future<void> _synchronizeLastMeal({required bool save}) async {
    DateTime? latest;
    for (final meal in _meals) {
      if (latest == null || meal.timestamp.isAfter(latest)) {
        latest = meal.timestamp;
      }
    }
    if (latest == null) {
      _profile = _profile.copyWith(clearLastMealAt: true);
    } else {
      _profile = _profile.copyWith(lastMealAt: latest);
    }
    if (save) await _storage.saveProfile(_profile);
  }

  Future<T> _loadOr<T>(Future<T> operation, T fallback) async {
    try {
      return await operation;
    } catch (_) {
      return fallback;
    }
  }

  void _onStepSnapshot(StepTrackingSnapshot snapshot) {
    if (!_sameDay(snapshot.updatedAt, _now)) return;
    if (snapshot.steps == _steps.sensorSteps) {
      notifyListeners();
      return;
    }
    _steps = _steps.copyWith(sensorSteps: snapshot.steps);
    _stepHistory[_dayKey(_now)] = _steps.totalSteps;
    notifyListeners();
    unawaited(_storage.saveSteps(_now, _steps));
    _scheduleDailyInsight();
  }

  bool _sameDay(DateTime first, DateTime second) {
    final a = first.toLocal();
    final b = second.toLocal();
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  int caloriesForDay(DateTime day) {
    return _meals
        .where((meal) => _sameDay(meal.timestamp, day))
        .fold(0, (total, meal) => total + meal.nutrition.calories);
  }

  double proteinForDay(DateTime day) {
    return _meals
        .where((meal) => _sameDay(meal.timestamp, day))
        .fold(0, (total, meal) => total + meal.nutrition.proteinGrams);
  }

  int waterForDay(DateTime day) => _waterHistory[_dayKey(day)] ?? 0;

  int stepsForDay(DateTime day) => _stepHistory[_dayKey(day)] ?? 0;

  Duration? averageMealGapForDay(DateTime day) {
    final dayMeals =
        _meals
            .where((meal) => _sameDay(meal.timestamp, day))
            .map((meal) => meal.timestamp)
            .toList()
          ..sort();
    if (dayMeals.length < 2) return null;
    var totalMinutes = 0;
    for (var index = 1; index < dayMeals.length; index++) {
      totalMinutes += dayMeals[index].difference(dayMeals[index - 1]).inMinutes;
    }
    return Duration(minutes: (totalMinutes / (dayMeals.length - 1)).round());
  }

  Future<void> _loadSevenDayHistory() async {
    final days = List<DateTime>.generate(7, (index) {
      return DateTime(
        _now.year,
        _now.month,
        _now.day,
      ).subtract(Duration(days: 6 - index));
    });
    await Future.wait(
      days.map((day) async {
        final values = await Future.wait<Object>([
          _storage.loadWaterGlasses(day),
          _storage.loadSteps(day),
        ]);
        _waterHistory[_dayKey(day)] = values[0] as int;
        _stepHistory[_dayKey(day)] = (values[1] as StepRecord).totalSteps;
      }),
    );
  }

  String _dayKey(DateTime day) => AppStorage.dateKey(day);

  @override
  void dispose() {
    _clockTimer?.cancel();
    _insightDebounce?.cancel();
    unawaited(_stepSubscription?.cancel());
    if (_stepTracking != null) unawaited(_stepTracking.dispose());
    super.dispose();
  }
}
