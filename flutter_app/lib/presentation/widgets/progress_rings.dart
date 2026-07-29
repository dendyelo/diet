import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

class RingProgress {
  const RingProgress({required this.value, required this.color});

  final double value;
  final Color color;
}

class ProgressRings extends StatelessWidget {
  const ProgressRings({
    required this.rings,
    this.size = 106,
    this.strokeWidth = 9,
    this.center,
    this.semanticsLabel = 'Progres harian',
    super.key,
  });

  final List<RingProgress> rings;
  final double size;
  final double strokeWidth;
  final Widget? center;
  final String semanticsLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      image: true,
      label: semanticsLabel,
      child: SizedBox.square(
        dimension: size,
        child: _AnimatedRings(
          rings: rings,
          strokeWidth: strokeWidth,
          center: center,
        ),
      ),
    );
  }
}

class _AnimatedRings extends StatelessWidget {
  const _AnimatedRings({
    required this.rings,
    required this.strokeWidth,
    required this.center,
  });

  final List<RingProgress> rings;
  final double strokeWidth;
  final Widget? center;

  @override
  Widget build(BuildContext context) {
    final reduceMotion =
        MediaQuery.disableAnimationsOf(context) ||
        MediaQuery.accessibleNavigationOf(context);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: reduceMotion
          ? Duration.zero
          : const Duration(milliseconds: 800),
      curve: Curves.easeOutCubic,
      builder: (context, animation, _) {
        return CustomPaint(
          painter: _RingsPainter(
            rings: rings,
            animation: animation,
            strokeWidth: strokeWidth,
          ),
          child: Center(child: center),
        );
      },
    );
  }
}

class _RingsPainter extends CustomPainter {
  const _RingsPainter({
    required this.rings,
    required this.animation,
    required this.strokeWidth,
  });

  final List<RingProgress> rings;
  final double animation;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final baseRadius = math.min(size.width, size.height) / 2 - strokeWidth / 2;

    for (var index = 0; index < rings.length; index++) {
      final ring = rings[index];
      final radius = baseRadius - index * (strokeWidth + 4);
      if (radius <= 0) break;

      final trackPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round
        ..color = AppColors.surfaceStrong;
      final valuePaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round
        ..shader = SweepGradient(
          startAngle: -math.pi / 2,
          endAngle: math.pi * 3 / 2,
          colors: [ring.color.withValues(alpha: 0.68), ring.color],
        ).createShader(Rect.fromCircle(center: center, radius: radius));

      canvas.drawCircle(center, radius, trackPaint);
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2,
        math.pi * 2 * ring.value.clamp(0, 1) * animation,
        false,
        valuePaint,
      );

      final overflow = (ring.value - 1).clamp(0, 0.25).toDouble();
      if (overflow > 0) {
        final overflowPaint = Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = strokeWidth
          ..strokeCap = StrokeCap.round
          ..color = AppColors.warning;
        canvas.drawArc(
          Rect.fromCircle(center: center, radius: radius),
          -math.pi / 2,
          math.pi * 2 * (overflow / 0.25) * animation,
          false,
          overflowPaint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _RingsPainter oldDelegate) {
    return oldDelegate.rings != rings ||
        oldDelegate.animation != animation ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}
