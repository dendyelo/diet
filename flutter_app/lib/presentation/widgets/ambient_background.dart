import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

class AmbientBackground extends StatelessWidget {
  const AmbientBackground({
    required this.child,
    this.accent = AppColors.diet,
    super.key,
  });

  final Widget child;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return BackdropGroup(
      child: ColoredBox(
        color: AppColors.background,
        child: Stack(
          fit: StackFit.expand,
          children: [
            const Positioned.fill(
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0xFF0B0D10),
                        AppColors.background,
                        Color(0xFF090A0C),
                      ],
                      stops: [0, 0.42, 1],
                    ),
                  ),
                ),
              ),
            ),
            child,
          ],
        ),
      ),
    );
  }
}
