import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import 'glass_motion_scope.dart';

class GlassSurface extends StatefulWidget {
  const GlassSurface({
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.radius = 26,
    this.tint,
    this.onTap,
    this.reflective = true,
    this.reflectionStrength = 1,
    super.key,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color? tint;
  final VoidCallback? onTap;

  /// Enables the brighter, motion-responsive edge reflection.
  ///
  /// Enabled by default so every glass card shares one consistent material.
  /// Set this to false only for a surface that must remain completely static.
  final bool reflective;
  final double reflectionStrength;

  @override
  State<GlassSurface> createState() => _GlassSurfaceState();
}

class _GlassSurfaceState extends State<GlassSurface> {
  final GlobalKey _surfaceKey = GlobalKey();
  final ValueNotifier<Offset?> _touchMotion = ValueNotifier(null);

  void _updateTouch(PointerEvent event) {
    final renderObject = _surfaceKey.currentContext?.findRenderObject();
    if (!widget.reflective ||
        GlassMotionScope.reduceMotionOf(context) ||
        renderObject is! RenderBox) {
      return;
    }
    final box = renderObject;
    final point = box.globalToLocal(event.position);
    final width = math.max(1.0, box.size.width);
    final height = math.max(1.0, box.size.height);
    _touchMotion.value = Offset(
      ((point.dx / width) * 2 - 1).clamp(-1, 1).toDouble(),
      ((point.dy / height) * 2 - 1).clamp(-1, 1).toDouble(),
    );
  }

  void _clearTouch(PointerEvent _) {
    _touchMotion.value = null;
  }

  @override
  void dispose() {
    _touchMotion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final borderRadius = BorderRadius.circular(widget.radius);
    final motion = GlassMotionScope.motionOf(context);
    final reduceMotion = GlassMotionScope.reduceMotionOf(context);
    Widget content = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        boxShadow: [
          BoxShadow(
            color: AppColors.glassShadow.withValues(alpha: 0.72),
            blurRadius: 30,
            spreadRadius: -9,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: BackdropFilter.grouped(
          filter: ImageFilter.blur(sigmaX: 28, sigmaY: 28),
          child: Stack(
            children: [
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: borderRadius,
                    border: Border.all(color: AppColors.glassBorder),
                    color: AppColors.glassFill,
                  ),
                ),
              ),
              Positioned(
                left: 16,
                right: 16,
                top: 0,
                height: 1,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.transparent,
                        Colors.white.withValues(
                          alpha: widget.reflective ? 0.045 : 0.06,
                        ),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
              Padding(padding: widget.padding, child: widget.child),
              if (widget.reflective)
                Positioned.fill(
                  child: IgnorePointer(
                    child: ValueListenableBuilder<Offset?>(
                      valueListenable: _touchMotion,
                      builder: (context, touchMotion, _) {
                        return ValueListenableBuilder<Offset>(
                          valueListenable: motion,
                          builder: (context, deviceMotion, _) {
                            final effectiveMotion = reduceMotion
                                ? Offset.zero
                                : (touchMotion ?? deviceMotion);
                            return RepaintBoundary(
                              child: CustomPaint(
                                painter: _GlassReflectionPainter(
                                  radius: widget.radius,
                                  motion: effectiveMotion,
                                  tint: widget.tint,
                                  strength:
                                      (0.82 +
                                          widget.reflectionStrength * 0.22) *
                                      (reduceMotion ? 0.58 : 1),
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );

    content = Listener(
      key: _surfaceKey,
      behavior: HitTestBehavior.translucent,
      onPointerDown: _updateTouch,
      onPointerMove: _updateTouch,
      onPointerHover: _updateTouch,
      onPointerUp: _clearTouch,
      onPointerCancel: _clearTouch,
      child: content,
    );

    if (widget.onTap == null) return content;

    return Semantics(
      button: true,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: borderRadius,
          onTap: widget.onTap,
          child: content,
        ),
      ),
    );
  }
}

class _GlassReflectionPainter extends CustomPainter {
  const _GlassReflectionPainter({
    required this.radius,
    required this.motion,
    required this.tint,
    required this.strength,
  });

  final double radius;
  final Offset motion;
  final Color? tint;
  final double strength;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final rect = Offset.zero & size;
    final rrect = RRect.fromRectAndRadius(
      rect.deflate(0.75),
      Radius.circular(radius),
    );
    final normalized = Offset(
      motion.dx.clamp(-1, 1).toDouble(),
      motion.dy.clamp(-1, 1).toDouble(),
    );
    final intensity = strength.clamp(0.0, 1.0);

    // iOS-style neutral lighting starts at the top-right corner. Device tilt
    // moves that light around the rim, with a second reflection opposite it.
    // The fixed diagonal also prevents atan2 from jumping near a zero vector.
    final lightVector = Offset(
      0.82 + normalized.dx * 0.82,
      -0.82 + normalized.dy * 0.62,
    );
    final angle = math.atan2(lightVector.dy, lightVector.dx);
    final rimShader = SweepGradient(
      transform: GradientRotation(angle - math.pi / 2),
      colors: [
        Colors.transparent,
        Colors.white.withValues(alpha: 0.035 * intensity),
        Colors.white.withValues(alpha: 0.72 * intensity),
        Colors.white.withValues(alpha: 0.04 * intensity),
        Colors.transparent,
        Colors.white.withValues(alpha: 0.03 * intensity),
        Colors.white.withValues(alpha: 0.5 * intensity),
        Colors.white.withValues(alpha: 0.035 * intensity),
        Colors.transparent,
      ],
      stops: const [0, 0.12, 0.24, 0.36, 0.5, 0.62, 0.74, 0.86, 1],
    ).createShader(rect);

    final edgeGlow = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1.5)
      ..shader = rimShader;
    canvas.drawRRect(rrect.deflate(0.5), edgeGlow);

    final edgePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..shader = rimShader;
    canvas.drawRRect(rrect, edgePaint);

    final innerRim = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..color = Colors.black.withValues(alpha: 0.52);
    canvas.drawRRect(rrect.deflate(1.6), innerRim);
  }

  @override
  bool shouldRepaint(_GlassReflectionPainter oldDelegate) {
    return radius != oldDelegate.radius ||
        motion != oldDelegate.motion ||
        tint != oldDelegate.tint ||
        strength != oldDelegate.strength;
  }
}
