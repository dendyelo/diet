import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/theme/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'domain/domain.dart';
import 'presentation/screens/hunger_check_screen.dart';
import 'presentation/screens/profile_screen.dart';
import 'presentation/screens/progress_screen.dart';
import 'presentation/screens/today_screen.dart';
import 'presentation/sheets/activity_entry_sheet.dart';
import 'presentation/sheets/coach_sheet.dart';
import 'presentation/sheets/meal_entry_sheet.dart';
import 'presentation/sheets/weight_entry_sheet.dart';
import 'presentation/widgets/glass_motion_scope.dart';
import 'presentation/widgets/glass_surface.dart';
import 'state/diet_app_controller.dart';

class DietApp extends StatelessWidget {
  const DietApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Diet',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.dark,
      builder: (context, child) {
        return MediaQuery.withClampedTextScaling(
          minScaleFactor: 0.9,
          maxScaleFactor: 1.35,
          child: child!,
        );
      },
      home: const _AppGate(),
    );
  }
}

class _AppGate extends StatelessWidget {
  const _AppGate();

  @override
  Widget build(BuildContext context) {
    return Consumer<DietAppController>(
      builder: (context, controller, _) {
        if (controller.initialized) return const DietHome();
        return _LoadingScreen(
          error: controller.initializationError,
          loading: controller.initializing,
          onRetry: controller.initialize,
        );
      },
    );
  }
}

class _LoadingScreen extends StatelessWidget {
  const _LoadingScreen({
    required this.error,
    required this.loading,
    required this.onRetry,
  });

  final Object? error;
  final bool loading;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [AppColors.diet, AppColors.protein],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.diet.withValues(alpha: 0.28),
                        blurRadius: 34,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  error == null
                      ? 'Menyiapkan harimu…'
                      : 'Belum dapat membuka data',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                if (error != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Data tetap aman. Coba buka kembali.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: loading ? null : onRetry,
                    child: const Text('Coba lagi'),
                  ),
                ] else ...[
                  const SizedBox(height: 20),
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class DietHome extends StatefulWidget {
  const DietHome({super.key});

  @override
  State<DietHome> createState() => _DietHomeState();
}

class _DietHomeState extends State<DietHome> with WidgetsBindingObserver {
  static const _checkInDelay = Duration(minutes: 30);

  int _selectedTab = 0;
  bool _showHungerCheck = true;
  DateTime? _backgroundedAt;

  DietAppController get _controller => context.read<DietAppController>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.hidden) {
      _backgroundedAt ??= DateTime.now();
      return;
    }
    if (state == AppLifecycleState.resumed) {
      unawaited(_controller.refreshCurrentDay());
      final backgroundedAt = _backgroundedAt;
      _backgroundedAt = null;
      if (backgroundedAt != null &&
          DateTime.now().difference(backgroundedAt) >= _checkInDelay) {
        setState(() => _showHungerCheck = true);
      }
    }
  }

  Future<void> _openMeal({bool isSnack = false, MealLog? editing}) {
    final controller = _controller;
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: false,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.72),
      builder: (context) => GlassSurface(
        radius: 32,
        padding: EdgeInsets.zero,
        reflective: true,
        reflectionStrength: 0.55,
        child: MealEntrySheet(
          initialMeal: editing,
          initialSnack: isSnack,
          recentMeals: controller.allMeals
              .where((meal) => meal.id != editing?.id)
              .take(8)
              .toList(growable: false),
          onAnalyze: controller.analyzeMeal,
          onSave: controller.saveMeal,
        ),
      ),
    );
  }

  Future<void> _openActivity() {
    final controller = _controller;
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: false,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.72),
      builder: (context) => GlassSurface(
        radius: 32,
        padding: EdgeInsets.zero,
        reflective: true,
        reflectionStrength: 0.55,
        child: ActivityEntrySheet(
          weightKg: controller.profile.weightKg,
          creditedStepCalories: controller.energy.creditedStepCalories,
          onAnalyze: controller.analyzeActivity,
          onSave: controller.saveActivity,
        ),
      ),
    );
  }

  Future<void> _openWeight([WeightLog? editing]) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: false,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.72),
      builder: (context) => GlassSurface(
        radius: 32,
        padding: EdgeInsets.zero,
        reflective: true,
        reflectionStrength: 0.55,
        child: WeightEntrySheet(
          initialWeight: editing,
          onSave: _controller.saveWeight,
        ),
      ),
    );
  }

  Future<void> _openCoach([String? prompt]) {
    final controller = _controller;
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: false,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.72),
      builder: (context) => GlassSurface(
        radius: 32,
        padding: EdgeInsets.zero,
        reflective: true,
        reflectionStrength: 0.55,
        tint: AppColors.hydration,
        child: CoachSheet(
          initialPrompt: prompt,
          activeModel: controller.activeAiModel,
          onAsk: (query, history) =>
              controller.askCoach(query, history: history),
        ),
      ),
    );
  }

  Future<void> _confirmDeleteMeal(MealLog meal) async {
    final confirmed = await _confirm(
      title: 'Hapus catatan makanan?',
      body: '${meal.name} akan dihapus dari jurnal.',
    );
    if (confirmed) await _controller.deleteMeal(meal);
  }

  Future<void> _confirmDeleteActivity(ActivityLog activity) async {
    final confirmed = await _confirm(
      title: 'Hapus aktivitas?',
      body: '${activity.name} tidak lagi masuk ke energi keluar.',
    );
    if (confirmed) await _controller.deleteActivity(activity);
  }

  Future<void> _confirmDeleteWeight(WeightLog weight) async {
    if (_controller.weights.length <= 1) {
      _message('Catatan berat pertama perlu tetap disimpan.');
      return;
    }
    final confirmed = await _confirm(
      title: 'Hapus catatan berat?',
      body: '${weight.weightKg.toStringAsFixed(1)} kg akan dihapus.',
    );
    if (confirmed) await _controller.deleteWeight(weight);
  }

  Future<bool> _confirm({required String title, required String body}) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(
              'Hapus',
              style: TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
    return result == true;
  }

  void _message(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _openQuickActions() async {
    final action = await showModalBottomSheet<_QuickAction>(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.68),
      builder: (context) => const GlassSurface(
        radius: 32,
        padding: EdgeInsets.zero,
        reflective: true,
        reflectionStrength: 0.48,
        child: _QuickActionsSheet(),
      ),
    );
    if (!mounted || action == null) return;
    switch (action) {
      case _QuickAction.meal:
        await _openMeal();
      case _QuickAction.activity:
        await _openActivity();
      case _QuickAction.water:
        await _controller.addWater();
        _message('Satu gelas air dicatat.');
      case _QuickAction.weight:
        await _openWeight();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<DietAppController>(
      builder: (context, controller, _) {
        final energy = controller.energy;
        final decision = controller.liveHungerDecision;
        final progressDays = List<ProgressDaySummary>.generate(7, (index) {
          final day = DateTime(
            controller.now.year,
            controller.now.month,
            controller.now.day,
          ).subtract(Duration(days: 6 - index));
          return ProgressDaySummary(
            date: day,
            caloriesIn: controller.caloriesForDay(day),
            dietLimit: energy.dietTargetCalories,
            proteinGrams: controller.proteinForDay(day),
            proteinTarget: controller.targetProtein,
            waterGlasses: controller.waterForDay(day),
            waterTarget: 8,
            steps: controller.stepsForDay(day),
            stepTarget: energy.stepGoal,
            mealGap: controller.averageMealGapForDay(day),
          );
        });

        final screens = <Widget>[
          TodayScreen(
            data: TodayScreenData(
              now: controller.now,
              caloriesIn: controller.totalCaloriesIn,
              caloriesOut: energy.totalCaloriesOut,
              dietLimit: energy.dietTargetCalories,
              projectedBurn: energy.projectedCaloriesOut,
              proteinGrams: controller.proteinGrams,
              proteinTarget: controller.targetProtein,
              waterGlasses: controller.waterGlasses,
              steps: controller.steps,
              stepGoal: energy.stepGoal,
              mealGap: controller.mealGap,
              guidanceLabel: decision?.status ?? 'CHECK-IN',
              guidanceHeadline: decision?.headline ?? 'Dengarkan rasa laparmu.',
              guidanceBody:
                  decision?.body ??
                  'Angka membantu memberi konteks. Tubuhmu tetap menentukan kapan perlu makan.',
              meals: controller.todayMeals,
              activities: controller.activities,
              aiHeadline: controller.dailyInsight?.headline,
              aiBody: controller.insightLoading
                  ? 'Membaca perubahan terbaru…'
                  : controller.dailyInsight?.body,
            ),
            onOpenCheckIn: () => setState(() => _showHungerCheck = true),
            onAddMeal: _openMeal,
            onAddActivity: _openActivity,
            onAddWater: () => unawaited(controller.addWater()),
            onAskCoach: _openCoach,
            onEditMeal: (meal) => _openMeal(editing: meal),
            onDeleteMeal: (meal) => unawaited(_confirmDeleteMeal(meal)),
            onDeleteActivity: (activity) =>
                unawaited(_confirmDeleteActivity(activity)),
          ),
          ProgressScreen(
            data: ProgressScreenData(
              now: controller.now,
              currentWeightKg: controller.profile.weightKg,
              targetWeightKg: controller.profile.targetWeightKg,
              weightLogs: controller.weights,
              dailySummaries: progressDays,
            ),
            onAddWeight: _openWeight,
            onEditWeight: _openWeight,
            onDeleteWeight: (weight) => unawaited(_confirmDeleteWeight(weight)),
          ),
          ProfileScreen(
            profile: controller.profile,
            aiProviders: controller.aiProviders,
            selectedAiProviderId: controller.selectedAiProviderId,
            configuredAiProviderIds: controller.configuredAiProviderIds,
            aiStatus: controller.aiStatus,
            activeAiModel: controller.activeAiModel,
            onSaveProfile: controller.saveProfile,
            onSelectAiProvider: controller.selectAiProvider,
            onAddAiProvider: controller.addOpenAiCompatibleProvider,
            onSaveApiKey: (providerId, key) async {
              await controller.selectAiProvider(providerId);
              await controller.saveApiKey(key);
            },
            onTestAi: (providerId) async {
              await controller.selectAiProvider(providerId);
              return controller.testAiConnection();
            },
            onDeleteApiKey: (providerId) async {
              await controller.selectAiProvider(providerId);
              await controller.deleteApiKey();
            },
          ),
        ];

        return GlassMotionScope(
          child: Scaffold(
            extendBody: true,
            body: Stack(
              children: [
                IndexedStack(index: _selectedTab, children: screens),
                if (!_showHungerCheck)
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: MediaQuery.paddingOf(context).bottom + 8,
                    child: _FloatingNavigation(
                      selected: _selectedTab,
                      onSelected: (index) =>
                          setState(() => _selectedTab = index),
                      onAdd: _openQuickActions,
                    ),
                  ),
                if (_showHungerCheck)
                  Positioned.fill(
                    child: HungerCheckScreen(
                      caloriesIn: controller.totalCaloriesIn,
                      caloriesOut: energy.totalCaloriesOut,
                      dietTarget: energy.dietTargetCalories,
                      projectedBurn: energy.projectedCaloriesOut,
                      waterGlasses: controller.waterGlasses,
                      snackCount: controller.snackCount,
                      mealGap: controller.mealGap,
                      onDismiss: (result) {
                        if (result != null) {
                          controller.recordHungerCheck(
                            answer: result.answer,
                            signal: result.signal,
                            intent: result.intent,
                            checkedAt: result.checkedAt,
                          );
                        }
                        setState(() => _showHungerCheck = false);
                      },
                      onAskCoach: _openCoach,
                      onAddWater: controller.addWater,
                      onAddMeal: (isSnack) =>
                          unawaited(_openMeal(isSnack: isSnack)),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _FloatingNavigation extends StatelessWidget {
  const _FloatingNavigation({
    required this.selected,
    required this.onSelected,
    required this.onAdd,
  });

  final int selected;
  final ValueChanged<int> onSelected;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    const items = <(IconData, String)>[
      (Icons.home_rounded, 'Hari ini'),
      (Icons.show_chart_rounded, 'Progres'),
      (Icons.person_outline_rounded, 'Saya'),
    ];

    return GlassSurface(
      radius: 28,
      padding: const EdgeInsets.all(7),
      reflective: true,
      reflectionStrength: 0.62,
      child: SizedBox(
        height: 58,
        child: Row(
          children: [
            for (var index = 0; index < items.length; index++)
              Expanded(
                child: _NavItem(
                  icon: items[index].$1,
                  label: items[index].$2,
                  selected: selected == index,
                  onTap: () => onSelected(index),
                ),
              ),
            const SizedBox(width: 5),
            SizedBox.square(
              dimension: 56,
              child: IconButton.filled(
                tooltip: 'Tambah catatan',
                onPressed: onAdd,
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.diet,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                icon: const Icon(Icons.add_rounded, size: 31),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            color: selected
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: selected
                    ? AppColors.textPrimary
                    : AppColors.textTertiary,
                size: 24,
              ),
              if (selected) ...[
                const SizedBox(width: 7),
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.fade,
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

enum _QuickAction { meal, activity, water, weight }

class _QuickActionsSheet extends StatelessWidget {
  const _QuickActionsSheet();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 4, 18, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tambah catatan',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 6),
            Text(
              'Pilih yang baru saja terjadi.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 18),
            _QuickActionRow(
              color: AppColors.diet,
              title: 'Makanan atau snack',
              subtitle: 'Analisis AI atau isi sendiri',
              onTap: () => Navigator.pop(context, _QuickAction.meal),
            ),
            _QuickActionRow(
              color: AppColors.activity,
              title: 'Aktivitas',
              subtitle: 'Ceritakan olahraga atau gerakanmu',
              onTap: () => Navigator.pop(context, _QuickAction.activity),
            ),
            _QuickActionRow(
              color: AppColors.hydration,
              title: 'Satu gelas air',
              subtitle: 'Langsung tambahkan ke hari ini',
              onTap: () => Navigator.pop(context, _QuickAction.water),
            ),
            _QuickActionRow(
              color: AppColors.protein,
              title: 'Berat badan',
              subtitle: 'Lihat perubahan sebagai tren',
              onTap: () => Navigator.pop(context, _QuickAction.weight),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickActionRow extends StatelessWidget {
  const _QuickActionRow({
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
      leading: Container(
        width: 12,
        height: 40,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(99),
          boxShadow: [
            BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 12),
          ],
        ),
      ),
      title: Text(title, style: Theme.of(context).textTheme.titleMedium),
      subtitle: Text(subtitle),
      trailing: const Icon(
        Icons.chevron_right_rounded,
        color: AppColors.textTertiary,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      onTap: onTap,
    );
  }
}
