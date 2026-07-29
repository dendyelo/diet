import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/calculators/hunger_decision.dart';
import '../widgets/ambient_background.dart';
import '../widgets/glass_surface.dart';
import '../widgets/progress_rings.dart';

class HungerCheckResult {
  const HungerCheckResult({
    required this.answer,
    required this.signal,
    required this.intent,
    required this.decision,
    required this.checkedAt,
  });

  final HungerCheckAnswer answer;
  final HungerSignal? signal;
  final EatingIntent? intent;
  final HungerDecision decision;
  final DateTime checkedAt;
}

class HungerCheckScreen extends StatefulWidget {
  const HungerCheckScreen({
    required this.caloriesIn,
    required this.caloriesOut,
    required this.dietTarget,
    required this.projectedBurn,
    required this.waterGlasses,
    required this.snackCount,
    required this.mealGap,
    required this.onDismiss,
    required this.onAskCoach,
    required this.onAddWater,
    required this.onAddMeal,
    super.key,
  });

  final int caloriesIn;
  final int caloriesOut;
  final int dietTarget;
  final int projectedBurn;
  final int waterGlasses;
  final int snackCount;
  final Duration? mealGap;
  final ValueChanged<HungerCheckResult?> onDismiss;
  final VoidCallback onAskCoach;
  final Future<void> Function() onAddWater;
  final void Function(bool isSnack) onAddMeal;

  @override
  State<HungerCheckScreen> createState() => _HungerCheckScreenState();
}

enum _Step { answer, signal, intent, result }

class _HungerCheckScreenState extends State<HungerCheckScreen>
    with SingleTickerProviderStateMixin {
  _Step _step = _Step.answer;
  HungerCheckAnswer? _answer;
  HungerSignal? _signal;
  EatingIntent? _intent;
  HungerDecision? _decision;
  double _dragY = 0;
  bool _waterAdded = false;
  bool _reduceMotion = false;
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2600),
    )..repeat(reverse: true);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduceMotion =
        MediaQuery.disableAnimationsOf(context) ||
        MediaQuery.accessibleNavigationOf(context);
    if (reduceMotion == _reduceMotion) return;
    _reduceMotion = reduceMotion;
    if (reduceMotion) {
      _pulse
        ..stop()
        ..value = 0.5;
    } else {
      _pulse.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  String _number(int value) {
    final digits = value.abs().toString();
    final result = StringBuffer();
    for (var index = 0; index < digits.length; index++) {
      if (index > 0 && (digits.length - index) % 3 == 0) result.write('.');
      result.write(digits[index]);
    }
    return '${value < 0 ? '-' : ''}$result';
  }

  String _mealGapLabel() {
    final gap = widget.mealGap;
    if (gap == null) return 'Belum ada catatan makan hari ini';
    final hours = gap.inHours;
    final minutes = gap.inMinutes.remainder(60);
    return '${hours}j ${minutes.toString().padLeft(2, '0')}m sejak makan';
  }

  HungerCheckResult? get _result {
    final answer = _answer;
    final decision = _decision;
    if (answer == null || decision == null) return null;
    return HungerCheckResult(
      answer: answer,
      signal: _signal,
      intent: _intent,
      decision: decision,
      checkedAt: DateTime.now(),
    );
  }

  void _buildDecision({
    required HungerCheckAnswer answer,
    HungerSignal? signal,
    EatingIntent? intent,
  }) {
    final gap = widget.mealGap;
    final gapHours = gap == null
        ? 0.0
        : (gap.inSeconds <= 0 ? 1 : gap.inSeconds) / Duration.secondsPerHour;
    setState(() {
      _answer = answer;
      _signal = signal;
      _intent = intent;
      _decision = decideHunger(
        HungerDecisionInput(
          answer: answer,
          signal: signal,
          intent: intent,
          caloriesIn: widget.caloriesIn,
          targetCalories: widget.dietTarget,
          maintenanceCalories: widget.projectedBurn,
          waterGlasses: widget.waterGlasses,
          snackCount: widget.snackCount,
          hoursSinceLastMeal: gapHours,
        ),
      );
      _step = _Step.result;
    });
  }

  void _selectAnswer(HungerCheckAnswer answer) {
    setState(() => _answer = answer);
    if (answer == HungerCheckAnswer.hungry) {
      setState(() => _step = _Step.signal);
    } else {
      _buildDecision(answer: answer);
    }
  }

  void _selectSignal(HungerSignal signal) {
    setState(() => _signal = signal);
    if (signal == HungerSignal.physical) {
      setState(() => _step = _Step.intent);
    } else {
      _buildDecision(
        answer: HungerCheckAnswer.hungry,
        signal: signal,
        intent: EatingIntent.snack,
      );
    }
  }

  void _selectIntent(EatingIntent intent) {
    _buildDecision(
      answer: HungerCheckAnswer.hungry,
      signal: HungerSignal.physical,
      intent: intent,
    );
  }

  void _reset() {
    setState(() {
      _step = _Step.answer;
      _answer = null;
      _signal = null;
      _intent = null;
      _decision = null;
      _waterAdded = false;
    });
  }

  void _finish() => widget.onDismiss(_result);

  void _onVerticalDragUpdate(DragUpdateDetails details) {
    if (details.delta.dy >= 0 && _dragY >= 0) return;
    setState(() => _dragY = math.min(0, _dragY + details.delta.dy));
  }

  void _onVerticalDragEnd(DragEndDetails details) {
    if (_dragY < -72 ||
        details.primaryVelocity != null && details.primaryVelocity! < -650) {
      _finish();
      return;
    }
    setState(() => _dragY = 0);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onVerticalDragUpdate: _onVerticalDragUpdate,
      onVerticalDragEnd: _onVerticalDragEnd,
      child: AnimatedSlide(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        offset: Offset(0, _dragY / MediaQuery.sizeOf(context).height),
        child: AmbientBackground(
          accent: _step == _Step.result
              ? _decisionColor(_decision?.kind)
              : AppColors.diet,
          child: SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(22, 16, 22, 20),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: math.max(0, constraints.maxHeight - 36),
                    ),
                    child: Column(
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'CHECK-IN · ${_clock(DateTime.now())}',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.labelMedium,
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Dengarkan tubuhmu',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.headlineMedium,
                                  ),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: _finish,
                              child: const Text('Lewati'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _ContextStrip(
                          mealGap: _mealGapLabel(),
                          caloriesIn: _number(widget.caloriesIn),
                          caloriesOut: _number(widget.caloriesOut),
                        ),
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: GlassSurface(
                            tint: _step == _Step.result
                                ? _decisionColor(_decision?.kind)
                                : AppColors.diet,
                            reflective: true,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 11,
                            ),
                            child: Row(
                              children: [
                                AnimatedBuilder(
                                  animation: _pulse,
                                  builder: (context, child) {
                                    final scale = 0.97 + (_pulse.value * 0.035);
                                    return Transform.scale(
                                      scale: scale,
                                      child: child,
                                    );
                                  },
                                  child: _BodySignalRings(
                                    color: _step == _Step.result
                                        ? _decisionColor(_decision?.kind)
                                        : AppColors.diet,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Rasakan 10 detik',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.titleLarge,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Perut · energi\nkeinginan makan',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodyMedium,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 15),
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 280),
                          switchInCurve: Curves.easeOutCubic,
                          switchOutCurve: Curves.easeInCubic,
                          transitionBuilder: (child, animation) {
                            return FadeTransition(
                              opacity: animation,
                              child: SlideTransition(
                                position: Tween<Offset>(
                                  begin: const Offset(0.05, 0),
                                  end: Offset.zero,
                                ).animate(animation),
                                child: child,
                              ),
                            );
                          },
                          child: _stepContent(context),
                        ),
                        if (_step == _Step.answer) ...[
                          const SizedBox(height: 10),
                          _CoachPrompt(onTap: widget.onAskCoach),
                        ],
                        const SizedBox(height: 10),
                        TextButton.icon(
                          onPressed: _finish,
                          icon: const Icon(Icons.keyboard_arrow_up_rounded),
                          label: const Text('Buka halaman hari ini'),
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _stepContent(BuildContext context) {
    return switch (_step) {
      _Step.answer => _QuestionBlock(
        key: const ValueKey('answer'),
        eyebrow: 'DENGARKAN TUBUHMU',
        title: 'Apakah kamu lapar?',
        body: 'Tidak ada jawaban benar atau salah. Rasakan dulu.',
        children: [
          _ChoiceRow(
            choices: [
              _Choice('Ya, lapar', () {
                _selectAnswer(HungerCheckAnswer.hungry);
              }),
              _Choice('Ragu', () {
                _selectAnswer(HungerCheckAnswer.unsure);
              }),
              _Choice('Tidak', () {
                _selectAnswer(HungerCheckAnswer.notHungry);
              }),
            ],
          ),
        ],
      ),
      _Step.signal => _QuestionBlock(
        key: const ValueKey('signal'),
        eyebrow: 'KENALI SINYALNYA',
        title: 'Lapar seperti apa?',
        body: 'Pilih yang paling dekat dengan yang kamu rasakan.',
        children: [
          _StackedChoice(
            title: 'Lapar fisik',
            subtitle:
                'Perut kosong, energi turun, atau sudah lama tidak makan.',
            onTap: () => _selectSignal(HungerSignal.physical),
          ),
          const SizedBox(height: 9),
          _StackedChoice(
            title: 'Ingin makanan tertentu',
            subtitle: 'Hanya ingin rasa atau makanan yang sangat spesifik.',
            onTap: () => _selectSignal(HungerSignal.specificCraving),
          ),
          const SizedBox(height: 9),
          _StackedChoice(
            title: 'Karena emosi atau bosan',
            subtitle: 'Muncul saat stres, bosan, atau ingin pengalihan.',
            onTap: () => _selectSignal(HungerSignal.emotion),
          ),
        ],
      ),
      _Step.intent => _QuestionBlock(
        key: const ValueKey('intent'),
        eyebrow: 'PILIH KEBUTUHAN',
        title: 'Mau makan atau ngemil?',
        body: 'Pilihan ini membantu menentukan saran porsi.',
        children: [
          _ChoiceRow(
            choices: [
              _Choice('Makan', () => _selectIntent(EatingIntent.meal)),
              _Choice('Snack', () => _selectIntent(EatingIntent.snack)),
            ],
          ),
        ],
      ),
      _Step.result => _ResultBlock(
        key: const ValueKey('result'),
        decision: _decision!,
        waterAdded: _waterAdded,
        onAddWater: () async {
          if (_waterAdded) return;
          await widget.onAddWater();
          if (mounted) setState(() => _waterAdded = true);
        },
        onAddMeal: (isSnack) {
          widget.onAddMeal(isSnack);
          widget.onDismiss(_result);
        },
        onAskCoach: widget.onAskCoach,
        onReset: _reset,
      ),
    };
  }

  String _clock(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:'
        '${time.minute.toString().padLeft(2, '0')}';
  }

  Color _decisionColor(HungerRecommendationKind? kind) {
    return switch (kind) {
      HungerRecommendationKind.meal => AppColors.activity,
      HungerRecommendationKind.smallMeal => AppColors.warning,
      HungerRecommendationKind.snack => AppColors.warning,
      HungerRecommendationKind.water => AppColors.hydration,
      HungerRecommendationKind.none => AppColors.protein,
      null => AppColors.diet,
    };
  }
}

class _ContextStrip extends StatelessWidget {
  const _ContextStrip({
    required this.mealGap,
    required this.caloriesIn,
    required this.caloriesOut,
  });

  final String mealGap;
  final String caloriesIn;
  final String caloriesOut;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      radius: 20,
      child: Row(
        children: [
          Expanded(
            flex: 5,
            child: _ContextValue(
              label: 'JEDA MAKAN',
              value: mealGap.replaceFirst(' sejak makan', ''),
              color: AppColors.warning,
            ),
          ),
          const _ContextDivider(),
          Expanded(
            flex: 3,
            child: _ContextValue(
              label: 'MASUK',
              value: '$caloriesIn kkal',
              color: AppColors.diet,
            ),
          ),
          const _ContextDivider(),
          Expanded(
            flex: 3,
            child: _ContextValue(
              label: 'KELUAR',
              value: '$caloriesOut kkal',
              color: AppColors.activity,
            ),
          ),
        ],
      ),
    );
  }
}

class _ContextDivider extends StatelessWidget {
  const _ContextDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 34,
      margin: const EdgeInsets.symmetric(horizontal: 8),
      color: AppColors.outline,
    );
  }
}

class _ContextValue extends StatelessWidget {
  const _ContextValue({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          maxLines: 1,
          style: Theme.of(
            context,
          ).textTheme.labelMedium?.copyWith(fontSize: 9, color: color),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(fontSize: 12),
        ),
      ],
    );
  }
}

class _CoachPrompt extends StatelessWidget {
  const _CoachPrompt({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      onTap: onTap,
      tint: AppColors.hydration,
      radius: 20,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI · KONTEKS TERBARU',
                  style: Theme.of(
                    context,
                  ).textTheme.labelMedium?.copyWith(color: AppColors.hydration),
                ),
                const SizedBox(height: 4),
                Text(
                  'Bingung membedakan lapar fisik?',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'Tanya coach',
            style: Theme.of(
              context,
            ).textTheme.labelLarge?.copyWith(color: AppColors.hydration),
          ),
        ],
      ),
    );
  }
}

class _BodySignalRings extends StatelessWidget {
  const _BodySignalRings({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return ProgressRings(
      size: 88,
      strokeWidth: 6,
      rings: [
        RingProgress(value: 0.78, color: color),
        const RingProgress(value: 0.58, color: AppColors.hydration),
        const RingProgress(value: 0.38, color: AppColors.protein),
      ],
      center: Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              Colors.white.withValues(alpha: 0.9),
              color.withValues(alpha: 0.72),
              Colors.transparent,
            ],
          ),
          boxShadow: [
            BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 18),
          ],
        ),
      ),
    );
  }
}

class _QuestionBlock extends StatelessWidget {
  const _QuestionBlock({
    required this.eyebrow,
    required this.title,
    required this.body,
    required this.children,
    super.key,
  });

  final String eyebrow;
  final String title;
  final String body;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          eyebrow,
          textAlign: TextAlign.center,
          style: Theme.of(
            context,
          ).textTheme.labelMedium?.copyWith(color: AppColors.diet),
        ),
        const SizedBox(height: 10),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        const SizedBox(height: 8),
        Text(
          body,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        ...children,
      ],
    );
  }
}

class _Choice {
  const _Choice(this.label, this.onTap);

  final String label;
  final VoidCallback onTap;
}

class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({required this.choices});

  final List<_Choice> choices;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var index = 0; index < choices.length; index++) ...[
          if (index > 0) const SizedBox(width: 8),
          Expanded(
            child: OutlinedButton(
              onPressed: choices[index].onTap,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 54),
                foregroundColor: AppColors.textPrimary,
                side: const BorderSide(color: AppColors.outline),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
              child: Text(choices[index].label),
            ),
          ),
        ],
      ],
    );
  }
}

class _StackedChoice extends StatelessWidget {
  const _StackedChoice({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      padding: const EdgeInsets.symmetric(horizontal: 17, vertical: 14),
      radius: 18,
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(fontSize: 13),
                ),
              ],
            ),
          ),
          const Icon(
            Icons.arrow_forward_ios_rounded,
            size: 15,
            color: AppColors.textTertiary,
          ),
        ],
      ),
    );
  }
}

class _ResultBlock extends StatelessWidget {
  const _ResultBlock({
    required this.decision,
    required this.waterAdded,
    required this.onAddWater,
    required this.onAddMeal,
    required this.onAskCoach,
    required this.onReset,
    super.key,
  });

  final HungerDecision decision;
  final bool waterAdded;
  final Future<void> Function() onAddWater;
  final ValueChanged<bool> onAddMeal;
  final VoidCallback onAskCoach;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final canEat =
        decision.kind == HungerRecommendationKind.meal ||
        decision.kind == HungerRecommendationKind.smallMeal ||
        decision.kind == HungerRecommendationKind.snack;
    final isSnack = decision.kind == HungerRecommendationKind.snack;

    return GlassSurface(
      reflective: true,
      tint: switch (decision.kind) {
        HungerRecommendationKind.water => AppColors.hydration,
        HungerRecommendationKind.meal => AppColors.activity,
        HungerRecommendationKind.smallMeal ||
        HungerRecommendationKind.snack => AppColors.warning,
        HungerRecommendationKind.none => AppColors.protein,
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(decision.status, style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 10),
          Text(
            decision.headline,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text(
            decision.body,
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (decision.kind == HungerRecommendationKind.water)
                FilledButton.tonal(
                  onPressed: waterAdded ? null : onAddWater,
                  child: Text(waterAdded ? 'Air dicatat' : '+ 1 gelas air'),
                ),
              if (canEat)
                FilledButton(
                  onPressed: () => onAddMeal(isSnack),
                  child: Text(isSnack ? 'Catat snack' : 'Catat makanan'),
                ),
              TextButton(
                onPressed: onAskCoach,
                child: const Text('Tanya coach'),
              ),
            ],
          ),
          const Divider(height: 30),
          TextButton(onPressed: onReset, child: const Text('Ulangi check-in')),
        ],
      ),
    );
  }
}
