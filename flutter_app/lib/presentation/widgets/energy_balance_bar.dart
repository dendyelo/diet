import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

class EnergyBalanceBar extends StatelessWidget {
  const EnergyBalanceBar({
    required this.caloriesIn,
    required this.caloriesOut,
    required this.dietLimit,
    required this.projectedBurn,
    super.key,
  });

  final int caloriesIn;
  final int caloriesOut;
  final int dietLimit;
  final int projectedBurn;

  String _number(int value) {
    final digits = value.abs().toString();
    final buffer = StringBuffer();
    for (var index = 0; index < digits.length; index++) {
      if (index > 0 && (digits.length - index) % 3 == 0) buffer.write('.');
      buffer.write(digits[index]);
    }
    return '${value < 0 ? '-' : ''}$buffer';
  }

  @override
  Widget build(BuildContext context) {
    final maxValue = math.max(
      1,
      math.max(
        projectedBurn,
        math.max(dietLimit, math.max(caloriesIn, caloriesOut)),
      ),
    );
    final chartMax = math.max(1, (maxValue * 1.12).round());
    final balance = caloriesOut - caloriesIn;
    final balanceLabel = balance >= 0
        ? 'defisit sementara'
        : 'surplus sementara';
    final balanceColor = balance >= 0 ? AppColors.activity : AppColors.warning;

    return Semantics(
      label:
          'Energi masuk ${_number(caloriesIn)} kilokalori, keluar ${_number(caloriesOut)} kilokalori, batas diet ${_number(dietLimit)} kilokalori.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _number(balance.abs()),
                style: Theme.of(
                  context,
                ).textTheme.displayMedium?.copyWith(color: balanceColor),
              ),
              const SizedBox(width: 9),
              Padding(
                padding: const EdgeInsets.only(bottom: 5),
                child: Text(
                  'kkal $balanceLabel',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              'Masuk ${_number(caloriesIn)}  •  keluar ${_number(caloriesOut)}  •  batas ${_number(dietLimit)} kkal',
              maxLines: 1,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(fontSize: 13.5),
            ),
          ),
          const SizedBox(height: 22),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth;
              final inPosition = caloriesIn / chartMax * width;
              final limitPosition = dietLimit / chartMax * width;
              final outPosition = caloriesOut / chartMax * width;
              final withinPlanWidth = math
                  .min(inPosition, limitPosition)
                  .clamp(0, width)
                  .toDouble();
              final abovePlanWidth = (inPosition - limitPosition)
                  .clamp(0, width - limitPosition)
                  .toDouble();

              return SizedBox(
                height: 66,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned(
                      left: 0,
                      right: 0,
                      top: 29,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(99),
                        child: SizedBox(
                          height: 10,
                          child: Stack(
                            children: [
                              const Positioned.fill(
                                child: ColoredBox(
                                  color: AppColors.surfaceStrong,
                                ),
                              ),
                              AnimatedContainer(
                                duration: const Duration(milliseconds: 500),
                                curve: Curves.easeOutCubic,
                                width: withinPlanWidth,
                                color: AppColors.diet,
                              ),
                              if (abovePlanWidth > 0)
                                Positioned(
                                  left: limitPosition,
                                  width: abovePlanWidth,
                                  top: 0,
                                  bottom: 0,
                                  child: ColoredBox(
                                    color: caloriesIn > projectedBurn
                                        ? AppColors.danger
                                        : AppColors.warning,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    _Marker(
                      x: limitPosition,
                      width: width,
                      value: _number(dietLimit),
                      color: AppColors.diet,
                      top: 0,
                    ),
                    _Marker(
                      x: outPosition,
                      width: width,
                      value: _number(caloriesOut),
                      color: AppColors.activity,
                      top: 38,
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _Marker extends StatelessWidget {
  const _Marker({
    required this.x,
    required this.width,
    required this.value,
    required this.color,
    required this.top,
  });

  final double x;
  final double width;
  final String value;
  final Color color;
  final double top;

  @override
  Widget build(BuildContext context) {
    const labelWidth = 58.0;
    final left = (x - labelWidth / 2)
        .clamp(0, math.max(0, width - labelWidth))
        .toDouble();

    return AnimatedPositioned(
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeOutCubic,
      left: left,
      top: top,
      width: labelWidth,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (top > 0)
            Container(width: 2, height: 9, color: color)
          else
            Text(
              value,
              maxLines: 1,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          if (top == 0) Container(width: 2, height: 15, color: color),
          if (top > 0)
            Text(
              value,
              maxLines: 1,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
        ],
      ),
    );
  }
}
