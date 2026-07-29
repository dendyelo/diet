import 'package:diet/core/theme/app_theme.dart';
import 'package:diet/presentation/widgets/glass_motion_scope.dart';
import 'package:diet/presentation/widgets/glass_surface.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('frosted surface renders and remains tappable', (tester) async {
    var taps = 0;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: Scaffold(
          body: GlassSurface(
            reflective: true,
            onTap: () => taps++,
            child: const Text('Keseimbangan energi'),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(BackdropFilter), findsOneWidget);
    expect(find.text('Keseimbangan energi'), findsOneWidget);
    await tester.tap(find.byType(GlassSurface));
    await tester.pump();
    expect(taps, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('reduce motion keeps reflective glass static and usable', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: const GlassMotionScope(
            child: Scaffold(
              body: GlassSurface(reflective: true, child: Text('Kaca tenang')),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Kaca tenang'), findsOneWidget);
    expect(find.byType(CustomPaint), findsWidgets);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  });
}
