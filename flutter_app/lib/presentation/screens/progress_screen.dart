import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/models.dart';
import '../widgets/ambient_background.dart';
import '../widgets/glass_surface.dart';

class ProgressDaySummary {
  const ProgressDaySummary({
    required this.date,
    required this.caloriesIn,
    required this.dietLimit,
    required this.proteinGrams,
    required this.proteinTarget,
    required this.waterGlasses,
    required this.waterTarget,
    required this.steps,
    required this.stepTarget,
    this.mealGap,
  });

  final DateTime date;
  final int caloriesIn;
  final int dietLimit;
  final double proteinGrams;
  final int proteinTarget;
  final int waterGlasses;
  final int waterTarget;
  final int steps;
  final int stepTarget;
  final Duration? mealGap;
}

class ProgressScreenData {
  const ProgressScreenData({
    required this.now,
    required this.currentWeightKg,
    required this.targetWeightKg,
    required this.weightLogs,
    required this.dailySummaries,
  });

  final DateTime now;
  final double currentWeightKg;
  final double targetWeightKg;
  final List<WeightLog> weightLogs;
  final List<ProgressDaySummary> dailySummaries;
}

class ProgressScreen extends StatefulWidget {
  const ProgressScreen({
    required this.data,
    required this.onAddWeight,
    required this.onEditWeight,
    required this.onDeleteWeight,
    super.key,
  });

  final ProgressScreenData data;
  final VoidCallback onAddWeight;
  final ValueChanged<WeightLog> onEditWeight;
  final ValueChanged<WeightLog> onDeleteWeight;

  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  _ChartRange _range = _ChartRange.days30;

  List<WeightLog> get _sortedWeightLogs {
    final logs = List<WeightLog>.of(widget.data.weightLogs);
    logs.sort((left, right) => left.recordedAt.compareTo(right.recordedAt));
    return logs;
  }

  List<WeightLog> get _visibleWeightLogs {
    final cutoff = DateTime(
      widget.data.now.year,
      widget.data.now.month,
      widget.data.now.day,
    ).subtract(Duration(days: _range.days - 1));
    return _sortedWeightLogs
        .where((log) => !log.recordedAt.isBefore(cutoff))
        .toList(growable: false);
  }

  List<ProgressDaySummary> get _lastSevenDays {
    final days = List<ProgressDaySummary>.of(widget.data.dailySummaries);
    days.sort((left, right) => left.date.compareTo(right.date));
    if (days.length <= 7) return days;
    return days.sublist(days.length - 7);
  }

  @override
  Widget build(BuildContext context) {
    final allWeightLogs = _sortedWeightLogs;
    final firstWeight = allWeightLogs.isEmpty
        ? widget.data.currentWeightKg
        : allWeightLogs.first.weightKg;
    final change = widget.data.currentWeightKg - firstWeight;

    return AmbientBackground(
      accent: AppColors.protein,
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverSafeArea(
            bottom: false,
            sliver: SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              sliver: SliverToBoxAdapter(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 720),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _Header(onAddWeight: widget.onAddWeight),
                        const SizedBox(height: 26),
                        _WeightHero(
                          currentWeightKg: widget.data.currentWeightKg,
                          targetWeightKg: widget.data.targetWeightKg,
                          startingWeightKg: firstWeight,
                          changeKg: change,
                        ),
                        const SizedBox(height: 14),
                        _WeightChartCard(
                          range: _range,
                          logs: _visibleWeightLogs,
                          targetWeightKg: widget.data.targetWeightKg,
                          onRangeChanged: (value) {
                            setState(() => _range = value);
                          },
                        ),
                        const SizedBox(height: 14),
                        _SevenDayPattern(days: _lastSevenDays),
                        const SizedBox(height: 14),
                        _WeightHistory(
                          logs: allWeightLogs.reversed.take(6).toList(),
                          onAdd: widget.onAddWeight,
                          onEdit: widget.onEditWeight,
                          onDelete: widget.onDeleteWeight,
                        ),
                        const SizedBox(height: 120),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onAddWeight});

  final VoidCallback onAddWeight;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'PERJALANANMU',
                style: Theme.of(context).textTheme.labelMedium,
              ),
              const SizedBox(height: 6),
              Text('Progres', style: Theme.of(context).textTheme.headlineLarge),
            ],
          ),
        ),
        FilledButton.tonal(
          onPressed: onAddWeight,
          style: FilledButton.styleFrom(
            minimumSize: const Size(0, 44),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            backgroundColor: AppColors.surfaceElevated,
            foregroundColor: AppColors.textPrimary,
          ),
          child: const Text('Catat berat'),
        ),
      ],
    );
  }
}

class _WeightHero extends StatelessWidget {
  const _WeightHero({
    required this.currentWeightKg,
    required this.targetWeightKg,
    required this.startingWeightKg,
    required this.changeKg,
  });

  final double currentWeightKg;
  final double targetWeightKg;
  final double startingWeightKg;
  final double changeKg;

  @override
  Widget build(BuildContext context) {
    final remaining = currentWeightKg - targetWeightKg;
    final reached = remaining <= 0;
    final trendText = changeKg.abs() < 0.05
        ? 'Belum ada perubahan'
        : '${changeKg < 0 ? 'Turun' : 'Naik'} '
              '${_decimal(changeKg.abs())} kg sejak catatan pertama';

    return GlassSurface(
      tint: AppColors.protein,
      reflective: true,
      reflectionStrength: 0.72,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final ringSize = constraints.maxWidth < 360 ? 100.0 : 116.0;
          return Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'BERAT TERKINI',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: AppColors.protein,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Flexible(
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Text(
                              _decimal(currentWeightKg),
                              style: Theme.of(context).textTheme.displayLarge,
                            ),
                          ),
                        ),
                        const SizedBox(width: 7),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            'kg',
                            style: Theme.of(context).textTheme.titleLarge
                                ?.copyWith(color: AppColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      trendText,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: changeKg <= 0
                            ? AppColors.activity
                            : AppColors.warning,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              SizedBox.square(
                dimension: ringSize,
                child: CustomPaint(
                  painter: _GoalRingPainter(
                    progress: _goalProgress(
                      startingWeightKg,
                      currentWeightKg,
                      targetWeightKg,
                    ),
                  ),
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            reached ? 'Tercapai' : _decimal(remaining),
                            maxLines: 1,
                            style: Theme.of(context).textTheme.titleLarge
                                ?.copyWith(fontSize: reached ? 16 : null),
                          ),
                          Text(
                            reached ? 'target' : 'kg lagi',
                            style: Theme.of(
                              context,
                            ).textTheme.bodyMedium?.copyWith(fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _WeightChartCard extends StatelessWidget {
  const _WeightChartCard({
    required this.range,
    required this.logs,
    required this.targetWeightKg,
    required this.onRangeChanged,
  });

  final _ChartRange range;
  final List<WeightLog> logs;
  final double targetWeightKg;
  final ValueChanged<_ChartRange> onRangeChanged;

  @override
  Widget build(BuildContext context) {
    final change = logs.length < 2
        ? null
        : logs.last.weightKg - logs.first.weightKg;

    return GlassSurface(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tren berat',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      change == null
                          ? 'Perlu dua catatan untuk melihat tren'
                          : '${change <= 0 ? 'Turun' : 'Naik'} '
                                '${_decimal(change.abs())} kg',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: change != null && change <= 0
                            ? AppColors.activity
                            : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              _RangePicker(value: range, onChanged: onRangeChanged),
            ],
          ),
          const SizedBox(height: 22),
          if (logs.isEmpty)
            const _EmptyChart()
          else ...[
            SizedBox(
              height: 180,
              child: CustomPaint(
                painter: _WeightChartPainter(
                  logs: logs,
                  targetWeightKg: targetWeightKg,
                ),
                child: const SizedBox.expand(),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  _shortDate(logs.first.recordedAt),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontSize: 12,
                    color: AppColors.textTertiary,
                  ),
                ),
                const Spacer(),
                Text(
                  _shortDate(logs.last.recordedAt),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontSize: 12,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _RangePicker extends StatelessWidget {
  const _RangePicker({required this.value, required this.onChanged});

  final _ChartRange value;
  final ValueChanged<_ChartRange> onChanged;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.backgroundSoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.outline),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: _ChartRange.values
            .map((range) {
              final selected = range == value;
              return Semantics(
                button: true,
                selected: selected,
                label: '${range.days} hari',
                child: InkWell(
                  borderRadius: BorderRadius.circular(11),
                  onTap: () => onChanged(range),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.protein.withValues(alpha: 0.24)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: Text(
                      '${range.days}',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontSize: 12,
                        color: selected
                            ? AppColors.textPrimary
                            : AppColors.textTertiary,
                      ),
                    ),
                  ),
                ),
              );
            })
            .toList(growable: false),
      ),
    );
  }
}

class _EmptyChart extends StatelessWidget {
  const _EmptyChart();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 180,
      child: Center(
        child: Text(
          'Belum ada catatan pada periode ini.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ),
    );
  }
}

class _SevenDayPattern extends StatelessWidget {
  const _SevenDayPattern({required this.days});

  final List<ProgressDaySummary> days;

  @override
  Widget build(BuildContext context) {
    if (days.isEmpty) {
      return GlassSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Pola 7 hari', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              'Catat asupan dan aktivitas untuk melihat pola harianmu.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      );
    }

    final validMealGaps = days
        .map((day) => day.mealGap)
        .whereType<Duration>()
        .toList(growable: false);
    final averageCalories = _average(days.map((day) => day.caloriesIn));
    final averageProtein = _average(days.map((day) => day.proteinGrams));
    final averageWater = _average(days.map((day) => day.waterGlasses));
    final averageSteps = _average(days.map((day) => day.steps));
    final averageMealGapMinutes = validMealGaps.isEmpty
        ? null
        : _average(validMealGaps.map((duration) => duration.inMinutes));

    return GlassSurface(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Pola 7 hari', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          Text(
            'Rata-rata harian dibandingkan dengan rencana tubuhmu saat ini.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 22),
          _PatternRow(
            label: 'Asupan',
            value: '${_number(averageCalories)} kkal / hari',
            color: AppColors.diet,
            values: days
                .map((day) => _ratio(day.caloriesIn, day.dietLimit))
                .toList(growable: false),
            overflowAtOne: true,
          ),
          const SizedBox(height: 18),
          _PatternRow(
            label: 'Protein',
            value: '${_number(averageProtein)} g / hari',
            color: AppColors.protein,
            values: days
                .map((day) => _ratio(day.proteinGrams, day.proteinTarget))
                .toList(growable: false),
          ),
          const SizedBox(height: 18),
          _PatternRow(
            label: 'Air',
            value: '${_number(averageWater)} gelas / hari',
            color: AppColors.hydration,
            values: days
                .map((day) => _ratio(day.waterGlasses, day.waterTarget))
                .toList(growable: false),
          ),
          const SizedBox(height: 18),
          _PatternRow(
            label: 'Langkah',
            value: '${_number(averageSteps)} / hari',
            color: AppColors.activity,
            values: days
                .map((day) => _ratio(day.steps, day.stepTarget))
                .toList(growable: false),
          ),
          const SizedBox(height: 18),
          _PatternRow(
            label: 'Jeda makan',
            value: averageMealGapMinutes == null
                ? 'Belum cukup data'
                : '${_durationMinutes(averageMealGapMinutes.round())} rata-rata',
            color: AppColors.warning,
            values: days
                .map((day) => (day.mealGap?.inMinutes ?? 0) / (8 * 60))
                .toList(growable: false),
          ),
          const SizedBox(height: 14),
          Text(
            'Jeda makan adalah selang yang tercatat, bukan target puasa.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontSize: 12,
              color: AppColors.textTertiary,
            ),
          ),
        ],
      ),
    );
  }
}

class _PatternRow extends StatelessWidget {
  const _PatternRow({
    required this.label,
    required this.value,
    required this.color,
    required this.values,
    this.overflowAtOne = false,
  });

  final String label;
  final String value;
  final Color color;
  final List<double> values;
  final bool overflowAtOne;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 118,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 2),
              Text(
                value,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: SizedBox(
            height: 42,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: values
                  .map((rawValue) {
                    final value = rawValue.isFinite ? rawValue : 0.0;
                    final normalized = value.clamp(0.06, 1.0);
                    final barColor = overflowAtOne && value > 1
                        ? AppColors.danger
                        : color;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: AnimatedFractionallySizedBox(
                          duration: const Duration(milliseconds: 280),
                          curve: Curves.easeOutCubic,
                          heightFactor: normalized,
                          alignment: Alignment.bottomCenter,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: barColor.withValues(alpha: 0.9),
                              borderRadius: BorderRadius.circular(4),
                              boxShadow: [
                                BoxShadow(
                                  color: barColor.withValues(alpha: 0.18),
                                  blurRadius: 8,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  })
                  .toList(growable: false),
            ),
          ),
        ),
      ],
    );
  }
}

class _WeightHistory extends StatelessWidget {
  const _WeightHistory({
    required this.logs,
    required this.onAdd,
    required this.onEdit,
    required this.onDelete,
  });

  final List<WeightLog> logs;
  final VoidCallback onAdd;
  final ValueChanged<WeightLog> onEdit;
  final ValueChanged<WeightLog> onDelete;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      padding: const EdgeInsets.fromLTRB(20, 20, 12, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Text(
              'Catatan berat',
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
          const SizedBox(height: 12),
          if (logs.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(0, 6, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Belum ada catatan berat.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                  TextButton(onPressed: onAdd, child: const Text('Catat')),
                ],
              ),
            )
          else
            for (var index = 0; index < logs.length; index++) ...[
              _WeightLogRow(
                log: logs[index],
                onEdit: () => onEdit(logs[index]),
                onDelete: () => onDelete(logs[index]),
              ),
              if (index != logs.length - 1) const Divider(),
            ],
        ],
      ),
    );
  }
}

class _WeightLogRow extends StatelessWidget {
  const _WeightLogRow({
    required this.log,
    required this.onEdit,
    required this.onDelete,
  });

  final WeightLog log;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Edit berat ${_decimal(log.weightKg)} kilogram',
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onEdit,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 13),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_decimal(log.weightKg)} kg',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _longDate(log.recordedAt),
                      style: Theme.of(
                        context,
                      ).textTheme.bodyMedium?.copyWith(fontSize: 13),
                    ),
                    if (log.note?.trim().isNotEmpty == true) ...[
                      const SizedBox(height: 3),
                      Text(
                        log.note!.trim(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontSize: 12,
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              PopupMenuButton<_WeightAction>(
                tooltip: 'Pilihan catatan',
                color: AppColors.surfaceElevated,
                onSelected: (action) {
                  switch (action) {
                    case _WeightAction.edit:
                      onEdit();
                    case _WeightAction.delete:
                      onDelete();
                  }
                },
                itemBuilder: (context) => const [
                  PopupMenuItem(value: _WeightAction.edit, child: Text('Edit')),
                  PopupMenuItem(
                    value: _WeightAction.delete,
                    child: Text(
                      'Hapus',
                      style: TextStyle(color: AppColors.danger),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GoalRingPainter extends CustomPainter {
  const _GoalRingPainter({required this.progress});

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final strokeWidth = math.max(8.0, size.shortestSide * 0.085);
    final rect = Offset.zero & size;
    final arcRect = rect.deflate(strokeWidth / 2);
    final startAngle = -math.pi / 2;
    final sweep = math.pi * 2 * progress.clamp(0.0, 1.0);

    canvas.drawArc(
      arcRect,
      startAngle,
      math.pi * 2,
      false,
      Paint()
        ..color = AppColors.surfaceStrong
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = strokeWidth,
    );
    canvas.drawArc(
      arcRect,
      startAngle,
      sweep,
      false,
      Paint()
        ..shader = const SweepGradient(
          colors: [AppColors.protein, AppColors.diet, AppColors.protein],
        ).createShader(rect)
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = strokeWidth,
    );
  }

  @override
  bool shouldRepaint(covariant _GoalRingPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

class _WeightChartPainter extends CustomPainter {
  const _WeightChartPainter({required this.logs, required this.targetWeightKg});

  final List<WeightLog> logs;
  final double targetWeightKg;

  @override
  void paint(Canvas canvas, Size size) {
    if (logs.isEmpty || size.isEmpty) return;

    const topPadding = 18.0;
    const bottomPadding = 12.0;
    final chartHeight = size.height - topPadding - bottomPadding;
    final weights = logs.map((log) => log.weightKg).toList(growable: false);
    var minimum = weights.reduce(math.min);
    var maximum = weights.reduce(math.max);
    if ((maximum - minimum).abs() < 0.5) {
      minimum -= 0.5;
      maximum += 0.5;
    } else {
      final padding = math.max(0.35, (maximum - minimum) * 0.18);
      minimum -= padding;
      maximum += padding;
    }

    final gridPaint = Paint()
      ..color = AppColors.divider
      ..strokeWidth = 1;
    for (var index = 0; index < 4; index++) {
      final y = topPadding + chartHeight * index / 3;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    if (targetWeightKg >= minimum && targetWeightKg <= maximum) {
      final targetY =
          topPadding +
          (maximum - targetWeightKg) / (maximum - minimum) * chartHeight;
      final targetPaint = Paint()
        ..color = AppColors.activity.withValues(alpha: 0.5)
        ..strokeWidth = 1.5;
      _drawDashedLine(canvas, targetY, size.width, targetPaint);
    }

    final points = <Offset>[];
    for (var index = 0; index < weights.length; index++) {
      final x = logs.length == 1
          ? size.width / 2
          : size.width * index / (logs.length - 1);
      final y =
          topPadding +
          (maximum - weights[index]) / (maximum - minimum) * chartHeight;
      points.add(Offset(x, y));
    }

    final path = _smoothPath(points);
    if (points.length > 1) {
      final fillPath = Path.from(path)
        ..lineTo(points.last.dx, size.height)
        ..lineTo(points.first.dx, size.height)
        ..close();
      canvas.drawPath(
        fillPath,
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppColors.protein.withValues(alpha: 0.30),
              AppColors.protein.withValues(alpha: 0),
            ],
          ).createShader(Offset.zero & size),
      );
    }

    canvas.drawPath(
      path,
      Paint()
        ..shader = const LinearGradient(
          colors: [AppColors.protein, AppColors.diet],
        ).createShader(Offset.zero & size)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );

    for (var index = 0; index < points.length; index++) {
      final isLast = index == points.length - 1;
      canvas.drawCircle(
        points[index],
        isLast ? 6 : 3,
        Paint()..color = isLast ? AppColors.textPrimary : AppColors.protein,
      );
      if (isLast) {
        canvas.drawCircle(
          points[index],
          10,
          Paint()
            ..color = AppColors.protein.withValues(alpha: 0.22)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 4,
        );
      }
    }
  }

  Path _smoothPath(List<Offset> points) {
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    if (points.length == 1) return path;
    for (var index = 1; index < points.length; index++) {
      final previous = points[index - 1];
      final current = points[index];
      final midpoint = Offset(
        (previous.dx + current.dx) / 2,
        (previous.dy + current.dy) / 2,
      );
      path.quadraticBezierTo(
        previous.dx,
        previous.dy,
        midpoint.dx,
        midpoint.dy,
      );
    }
    path.lineTo(points.last.dx, points.last.dy);
    return path;
  }

  void _drawDashedLine(Canvas canvas, double y, double width, Paint paint) {
    const dashWidth = 6.0;
    const gap = 5.0;
    var x = 0.0;
    while (x < width) {
      canvas.drawLine(
        Offset(x, y),
        Offset(math.min(x + dashWidth, width), y),
        paint,
      );
      x += dashWidth + gap;
    }
  }

  @override
  bool shouldRepaint(covariant _WeightChartPainter oldDelegate) {
    return oldDelegate.logs != logs ||
        oldDelegate.targetWeightKg != targetWeightKg;
  }
}

enum _ChartRange {
  days7(7),
  days30(30),
  days90(90);

  const _ChartRange(this.days);

  final int days;
}

enum _WeightAction { edit, delete }

double _goalProgress(
  double startingWeightKg,
  double currentWeightKg,
  double targetWeightKg,
) {
  final distance = startingWeightKg - targetWeightKg;
  if (distance.abs() < 0.05) {
    return currentWeightKg <= targetWeightKg ? 1 : 0;
  }
  return ((startingWeightKg - currentWeightKg) / distance).clamp(0, 1);
}

double _ratio(num value, num target) {
  if (target <= 0) return 0;
  return value / target;
}

double _average(Iterable<num> values) {
  var count = 0;
  var total = 0.0;
  for (final value in values) {
    total += value.toDouble();
    count++;
  }
  return count == 0 ? 0 : total / count;
}

String _decimal(double value) {
  final rounded = value.toStringAsFixed(1);
  return rounded.endsWith('.0')
      ? rounded.substring(0, rounded.length - 2)
      : rounded;
}

String _number(num value) {
  final rounded = value.round();
  final digits = rounded.abs().toString();
  final result = StringBuffer();
  for (var index = 0; index < digits.length; index++) {
    if (index > 0 && (digits.length - index) % 3 == 0) result.write('.');
    result.write(digits[index]);
  }
  return '${rounded < 0 ? '-' : ''}$result';
}

String _durationMinutes(int totalMinutes) {
  final hours = totalMinutes ~/ 60;
  final minutes = totalMinutes.remainder(60);
  if (hours == 0) return '$minutes menit';
  if (minutes == 0) return '$hours jam';
  return '${hours}j ${minutes.toString().padLeft(2, '0')}m';
}

String _shortDate(DateTime date) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  return '${date.day} ${months[date.month - 1]}';
}

String _longDate(DateTime date) {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  return '${days[date.weekday - 1]}, ${_shortDate(date)}';
}
