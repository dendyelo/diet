import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/models.dart';
import '../widgets/ambient_background.dart';
import '../widgets/glass_surface.dart';
import '../widgets/progress_rings.dart';

class TodayScreenData {
  const TodayScreenData({
    required this.now,
    required this.caloriesIn,
    required this.caloriesOut,
    required this.dietLimit,
    required this.projectedBurn,
    required this.proteinGrams,
    required this.proteinTarget,
    required this.waterGlasses,
    required this.steps,
    required this.stepGoal,
    required this.mealGap,
    required this.guidanceLabel,
    required this.guidanceHeadline,
    required this.guidanceBody,
    required this.meals,
    required this.activities,
    required this.cardOrder,
    this.aiHeadline,
    this.aiBody,
  });

  final DateTime now;
  final int caloriesIn;
  final int caloriesOut;
  final int dietLimit;
  final int projectedBurn;
  final double proteinGrams;
  final int proteinTarget;
  final int waterGlasses;
  final int steps;
  final int stepGoal;
  final Duration? mealGap;
  final String guidanceLabel;
  final String guidanceHeadline;
  final String guidanceBody;
  final List<MealLog> meals;
  final List<ActivityLog> activities;
  final List<String> cardOrder;
  final String? aiHeadline;
  final String? aiBody;
}

class TodayScreen extends StatefulWidget {
  const TodayScreen({
    required this.data,
    required this.onOpenCheckIn,
    required this.onAddMeal,
    required this.onAddActivity,
    required this.onAddWater,
    required this.onAskCoach,
    required this.onEditMeal,
    required this.onDeleteMeal,
    required this.onDeleteActivity,
    required this.onCardOrderChanged,
    super.key,
  });

  final TodayScreenData data;
  final VoidCallback onOpenCheckIn;
  final VoidCallback onAddMeal;
  final VoidCallback onAddActivity;
  final VoidCallback onAddWater;
  final VoidCallback onAskCoach;
  final ValueChanged<MealLog> onEditMeal;
  final ValueChanged<MealLog> onDeleteMeal;
  final ValueChanged<ActivityLog> onDeleteActivity;
  final ValueChanged<List<String>> onCardOrderChanged;

  @override
  State<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends State<TodayScreen> {
  final Set<String> _expandedMeals = <String>{};

  String _number(num value) {
    final rounded = value.round();
    final digits = rounded.abs().toString();
    final buffer = StringBuffer();
    for (var index = 0; index < digits.length; index++) {
      if (index > 0 && (digits.length - index) % 3 == 0) buffer.write('.');
      buffer.write(digits[index]);
    }
    return '${rounded < 0 ? '-' : ''}$buffer';
  }

  String _dateLabel(DateTime date) {
    const days = <String>[
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu',
      'Minggu',
    ];
    const months = <String>[
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return '${days[date.weekday - 1]}, ${date.day} ${months[date.month - 1]}';
  }

  String _clock(DateTime value) {
    return '${value.hour.toString().padLeft(2, '0')}:'
        '${value.minute.toString().padLeft(2, '0')}';
  }

  String _duration(Duration? duration) {
    if (duration == null) return 'Belum ada makanan hari ini';
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    if (hours == 0) return '$minutes menit';
    return '$hours jam $minutes menit';
  }

  @override
  Widget build(BuildContext context) {
    final data = widget.data;
    final proteinProgress =
        data.proteinGrams / data.proteinTarget.clamp(1, 10000);
    final waterProgress = data.waterGlasses / 8;
    final stepProgress = data.steps / data.stepGoal.clamp(1, 100000);
    final balance = data.caloriesOut - data.caloriesIn;
    final balanceColor = balance >= 0 ? AppColors.activity : AppColors.warning;
    final focusHeadline = data.aiHeadline ?? data.guidanceHeadline;
    final focusBody = data.aiBody ?? data.guidanceBody;
    final dashboardCards = <String, Widget>{
      'energy': _SpatialEnergyCard(
        balance: balance,
        balanceColor: balanceColor,
        caloriesIn: data.caloriesIn,
        caloriesOut: data.caloriesOut,
        dietLimit: data.dietLimit,
        projectedBurn: data.projectedBurn,
        caloriesInLabel: _number(data.caloriesIn),
        caloriesOutLabel: _number(data.caloriesOut),
        dietLimitLabel: _number(data.dietLimit),
      ),
      'mealGap': _MealGapCard(label: _duration(data.mealGap)),
      'signals': _DailySignalsCard(
        proteinLabel: '${_number(data.proteinGrams)} / ${data.proteinTarget}g',
        proteinProgress: proteinProgress,
        waterLabel: '${data.waterGlasses} / 8 gelas',
        waterProgress: waterProgress,
        stepsLabel: _number(data.steps),
        stepProgress: stepProgress,
        onAddWater: widget.onAddWater,
      ),
      'focus': GlassSurface(
        tint: AppColors.hydration,
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              data.aiHeadline == null && data.aiBody == null
                  ? data.guidanceLabel.toUpperCase()
                  : 'AI · FOKUS SEKARANG',
              style: Theme.of(
                context,
              ).textTheme.labelMedium?.copyWith(color: AppColors.hydration),
            ),
            const SizedBox(height: 9),
            Text(focusHeadline, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 6),
            Text(focusBody, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 14),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                FilledButton.tonal(
                  onPressed: widget.onOpenCheckIn,
                  child: const Text('Check-in lagi'),
                ),
                TextButton(
                  onPressed: widget.onAskCoach,
                  child: const Text('Tanya coach'),
                ),
              ],
            ),
          ],
        ),
      ),
      'activity': GlassSurface(
        padding: EdgeInsets.zero,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 8, 8, 4),
              child: _SectionHeader(
                title: 'Aktivitas',
                action: 'Ceritakan',
                onAction: widget.onAddActivity,
              ),
            ),
            const Divider(),
            _ActivitySummary(
              steps: _number(data.steps),
              activityCalories: data.activities.fold<int>(
                0,
                (sum, item) => sum + item.creditedCalories,
              ),
            ),
            if (data.activities.isNotEmpty)
              const Divider(indent: 18, endIndent: 18),
            for (final activity in data.activities)
              _ActivityRow(
                activity: activity,
                onDelete: () => widget.onDeleteActivity(activity),
              ),
          ],
        ),
      ),
      'journal': GlassSurface(
        padding: EdgeInsets.zero,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 8, 8, 4),
              child: _SectionHeader(
                title: 'Jurnal makan',
                action: 'Tambah',
                onAction: widget.onAddMeal,
              ),
            ),
            const Divider(),
            if (data.meals.isEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Belum ada asupan',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Catat saat kamu makan. Batas diet adalah panduan, bukan angka yang harus dihabiskan.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              )
            else
              for (var index = 0; index < data.meals.length; index++) ...[
                if (index > 0) const Divider(indent: 18, endIndent: 18),
                _MealJournalCard(
                  meal: data.meals[index],
                  expanded: _expandedMeals.contains(data.meals[index].id),
                  clock: _clock(data.meals[index].timestamp),
                  onToggle: () {
                    final meal = data.meals[index];
                    setState(() {
                      if (!_expandedMeals.add(meal.id)) {
                        _expandedMeals.remove(meal.id);
                      }
                    });
                  },
                  onEdit: () => widget.onEditMeal(data.meals[index]),
                  onDelete: () => widget.onDeleteMeal(data.meals[index]),
                ),
              ],
          ],
        ),
      ),
    };
    final orderedCardIds = data.cardOrder
        .where(dashboardCards.containsKey)
        .toList(growable: false);

    return AmbientBackground(
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverSafeArea(
            bottom: false,
            sliver: SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              sliver: SliverList.list(
                children: [
                  _Header(
                    date: _dateLabel(data.now),
                    onCheckIn: widget.onOpenCheckIn,
                  ),
                  const SizedBox(height: 22),
                  ReorderableListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    buildDefaultDragHandles: true,
                    itemCount: orderedCardIds.length,
                    proxyDecorator: (child, index, animation) {
                      return AnimatedBuilder(
                        animation: animation,
                        child: child,
                        builder: (context, child) {
                          return Transform.scale(
                            scale: 1 + animation.value * 0.018,
                            child: Material(
                              color: Colors.transparent,
                              child: child,
                            ),
                          );
                        },
                      );
                    },
                    onReorderItem: (oldIndex, newIndex) {
                      final next = List<String>.from(orderedCardIds);
                      final moved = next.removeAt(oldIndex);
                      next.insert(newIndex, moved);
                      widget.onCardOrderChanged(next);
                    },
                    itemBuilder: (context, index) {
                      final id = orderedCardIds[index];
                      return Padding(
                        key: ValueKey('dashboard-card-$id'),
                        padding: const EdgeInsets.only(bottom: 14),
                        child: dashboardCards[id]!,
                      );
                    },
                  ),
                  const SizedBox(height: 140),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SpatialEnergyCard extends StatelessWidget {
  const _SpatialEnergyCard({
    required this.balance,
    required this.balanceColor,
    required this.caloriesIn,
    required this.caloriesOut,
    required this.dietLimit,
    required this.projectedBurn,
    required this.caloriesInLabel,
    required this.caloriesOutLabel,
    required this.dietLimitLabel,
  });

  final int balance;
  final Color balanceColor;
  final int caloriesIn;
  final int caloriesOut;
  final int dietLimit;
  final int projectedBurn;
  final String caloriesInLabel;
  final String caloriesOutLabel;
  final String dietLimitLabel;

  @override
  Widget build(BuildContext context) {
    final isDeficit = balance >= 0;
    final displayBalance = balance.abs().toString();
    final intakeProgress = caloriesIn / dietLimit.clamp(1, 100000);
    final outputProgress = caloriesOut / projectedBurn.clamp(1, 100000);

    return GlassSurface(
      tint: balanceColor,
      reflective: true,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isDeficit ? 'DEFISIT SAAT INI' : 'SURPLUS SAAT INI',
            style: Theme.of(
              context,
            ).textTheme.labelMedium?.copyWith(color: balanceColor),
          ),
          const SizedBox(height: 5),
          Text(
            isDeficit
                ? 'Energi keluar lebih besar daripada asupan.'
                : 'Asupan lebih besar daripada energi keluar.',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontSize: 13),
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 330;
              final ringSize = compact ? 126.0 : 142.0;
              return Row(
                children: [
                  ProgressRings(
                    size: ringSize,
                    strokeWidth: compact ? 8 : 9,
                    rings: [
                      RingProgress(
                        value: outputProgress,
                        color: AppColors.diet,
                      ),
                      RingProgress(
                        value: intakeProgress,
                        color: AppColors.activity,
                      ),
                    ],
                    semanticsLabel:
                        '$displayBalance kkal ${isDeficit ? 'defisit' : 'surplus'} saat ini',
                    center: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            displayBalance,
                            style: Theme.of(context).textTheme.headlineMedium
                                ?.copyWith(
                                  color: balanceColor,
                                  letterSpacing: -1,
                                ),
                          ),
                        ),
                        Text(
                          isDeficit ? 'kkal defisit' : 'kkal surplus',
                          style: Theme.of(
                            context,
                          ).textTheme.bodyMedium?.copyWith(fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(width: compact ? 14 : 20),
                  Expanded(
                    child: Column(
                      children: [
                        _EnergyStat(
                          label: 'Masuk',
                          value: '$caloriesInLabel kkal',
                          color: AppColors.activity,
                        ),
                        const SizedBox(height: 12),
                        _EnergyStat(
                          label: 'Keluar',
                          value: '$caloriesOutLabel kkal',
                          color: AppColors.diet,
                        ),
                        const SizedBox(height: 12),
                        _EnergyStat(
                          label: 'Batas diet',
                          value: '$dietLimitLabel kkal',
                          color: AppColors.textSecondary,
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _EnergyStat extends StatelessWidget {
  const _EnergyStat({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 28,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(99),
          ),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  value,
                  maxLines: 1,
                  style: Theme.of(
                    context,
                  ).textTheme.titleMedium?.copyWith(color: color),
                ),
              ),
              Text(
                label,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(fontSize: 11),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MealGapCard extends StatelessWidget {
  const _MealGapCard({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      tint: AppColors.hydration,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'JEDA SEJAK MAKAN',
                  style: Theme.of(
                    context,
                  ).textTheme.labelMedium?.copyWith(color: AppColors.hydration),
                ),
                const SizedBox(height: 5),
                Text(label, style: Theme.of(context).textTheme.titleLarge),
              ],
            ),
          ),
          const SizedBox(width: 12),
          DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(99),
              color: Colors.white.withValues(alpha: 0.07),
              border: Border.all(color: AppColors.outline),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              child: Text(
                'OTOMATIS',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: 10,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DailySignalsCard extends StatelessWidget {
  const _DailySignalsCard({
    required this.proteinLabel,
    required this.proteinProgress,
    required this.waterLabel,
    required this.waterProgress,
    required this.stepsLabel,
    required this.stepProgress,
    required this.onAddWater,
  });

  final String proteinLabel;
  final double proteinProgress;
  final String waterLabel;
  final double waterProgress;
  final String stepsLabel;
  final double stepProgress;
  final VoidCallback onAddWater;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'SINYAL HARI INI',
            style: Theme.of(context).textTheme.labelMedium,
          ),
          const SizedBox(height: 16),
          _SignalBar(
            label: 'Protein',
            value: proteinLabel,
            progress: proteinProgress,
            color: AppColors.protein,
          ),
          const SizedBox(height: 14),
          _SignalBar(
            label: 'Air',
            value: waterLabel,
            progress: waterProgress,
            color: AppColors.hydration,
            onTap: onAddWater,
          ),
          const SizedBox(height: 14),
          _SignalBar(
            label: 'Langkah',
            value: stepsLabel,
            progress: stepProgress,
            color: AppColors.activity,
          ),
        ],
      ),
    );
  }
}

class _SignalBar extends StatelessWidget {
  const _SignalBar({
    required this.label,
    required this.value,
    required this.progress,
    required this.color,
    this.onTap,
  });

  final String label;
  final String value;
  final double progress;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final safeProgress = progress.isFinite ? progress : 0.0;
    final content = Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontSize: 14),
              ),
            ),
            Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.labelLarge?.copyWith(color: color, fontSize: 13),
            ),
          ],
        ),
        const SizedBox(height: 7),
        LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final mainWidth = width * safeProgress.clamp(0, 1);
            final excessWidth = safeProgress <= 1
                ? 0.0
                : width *
                      ((safeProgress - 1) / 0.5).clamp(0.08, 0.32).toDouble();
            return SizedBox(
              height: 6,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: AppColors.surfaceStrong,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 450),
                    curve: Curves.easeOutCubic,
                    width: mainWidth,
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                  if (excessWidth > 0)
                    Positioned(
                      right: 0,
                      width: excessWidth,
                      top: 0,
                      bottom: 0,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: AppColors.warning,
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ],
    );
    if (onTap == null) return content;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: content,
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.date, required this.onCheckIn});

  final String date;
  final VoidCallback onCheckIn;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(date, style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 5),
              Text(
                'Hari ini',
                style: Theme.of(context).textTheme.headlineLarge,
              ),
            ],
          ),
        ),
        GlassSurface(
          onTap: onCheckIn,
          radius: 18,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const _PulseDot(color: AppColors.activity),
              const SizedBox(width: 8),
              Text('Check-in', style: Theme.of(context).textTheme.labelLarge),
            ],
          ),
        ),
      ],
    );
  }
}

class _PulseDot extends StatelessWidget {
  const _PulseDot({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.action,
    required this.onAction,
  });

  final String title;
  final String action;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        TextButton(onPressed: onAction, child: Text(action)),
      ],
    );
  }
}

class _ActivitySummary extends StatelessWidget {
  const _ActivitySummary({required this.steps, required this.activityCalories});

  final String steps;
  final int activityCalories;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Expanded(
            child: _CompactValue(value: steps, label: 'langkah'),
          ),
          Container(width: 1, height: 42, color: AppColors.divider),
          Expanded(
            child: _CompactValue(
              value: '$activityCalories',
              label: 'kkal aktivitas',
            ),
          ),
        ],
      ),
    );
  }
}

class _CompactValue extends StatelessWidget {
  const _CompactValue({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 2),
        Text(label, style: Theme.of(context).textTheme.bodyMedium),
      ],
    );
  }
}

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({required this.activity, required this.onDelete});

  final ActivityLog activity;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 12, 10, 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activity.name,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 3),
                Text(
                  '${activity.durationMinutes} menit · ${activity.creditedCalories} kkal',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Hapus aktivitas',
            onPressed: onDelete,
            icon: const Icon(Icons.close_rounded, size: 18),
          ),
        ],
      ),
    );
  }
}

class _MealJournalCard extends StatelessWidget {
  const _MealJournalCard({
    required this.meal,
    required this.expanded,
    required this.clock,
    required this.onToggle,
    required this.onEdit,
    required this.onDelete,
  });

  final MealLog meal;
  final bool expanded;
  final String clock;
  final VoidCallback onToggle;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final visibleItems = expanded
        ? meal.itemsBreakdown
        : meal.itemsBreakdown.take(1).toList();
    final hiddenCount = meal.itemsBreakdown.length - visibleItems.length;

    return Material(
      color: Colors.transparent,
      child: Column(
        children: [
          InkWell(
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 10, 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          meal.isSnack ? 'SNACK · $clock' : 'MAKAN · $clock',
                          style: Theme.of(context).textTheme.labelMedium
                              ?.copyWith(
                                color: meal.isSnack
                                    ? AppColors.warning
                                    : AppColors.diet,
                              ),
                        ),
                        const SizedBox(height: 7),
                        Text(
                          meal.name,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${meal.nutrition.calories} kkal · '
                          '${meal.nutrition.proteinGrams.round()}g protein',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  PopupMenuButton<String>(
                    tooltip: 'Pilihan jurnal',
                    onSelected: (value) {
                      if (value == 'edit') onEdit();
                      if (value == 'delete') onDelete();
                    },
                    itemBuilder: (context) => const [
                      PopupMenuItem(value: 'edit', child: Text('Edit')),
                      PopupMenuItem(value: 'delete', child: Text('Hapus')),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (meal.itemsBreakdown.isNotEmpty) ...[
            const Divider(),
            InkWell(
              onTap: onToggle,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 15),
                child: Column(
                  children: [
                    for (final item in visibleItems)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                item.name,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ),
                            Text(
                              '${item.calories} kkal',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                    if (hiddenCount > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 7),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            '+$hiddenCount item lain',
                            style: Theme.of(context).textTheme.labelLarge
                                ?.copyWith(color: AppColors.diet),
                          ),
                        ),
                      ),
                    if (expanded && meal.itemsBreakdown.length > 1)
                      Padding(
                        padding: const EdgeInsets.only(top: 7),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'Sembunyikan rincian',
                            style: Theme.of(context).textTheme.labelLarge
                                ?.copyWith(color: AppColors.textTertiary),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
