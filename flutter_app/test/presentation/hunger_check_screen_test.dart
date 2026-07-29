import 'package:diet/app.dart';
import 'package:diet/core/theme/app_theme.dart';
import 'package:diet/data/data.dart';
import 'package:diet/presentation/screens/hunger_check_screen.dart';
import 'package:diet/state/diet_app_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import '../data/fakes.dart';

void main() {
  testWidgets('check-in awal tampil utuh pada layar iPhone kecil', (
    tester,
  ) async {
    var dismissed = false;
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: HungerCheckScreen(
          caloriesIn: 550,
          caloriesOut: 766,
          dietTarget: 1705,
          projectedBurn: 2205,
          waterGlasses: 4,
          snackCount: 1,
          mealGap: const Duration(hours: 3, minutes: 18),
          onDismiss: (_) => dismissed = true,
          onAskCoach: () {},
          onAddWater: () async {},
          onAddMeal: (_) {},
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Apakah kamu lapar?'), findsOneWidget);
    expect(find.text('Ya, lapar'), findsOneWidget);
    expect(find.text('Ragu'), findsOneWidget);
    expect(find.text('Tidak'), findsOneWidget);
    expect(find.text('Tanya coach'), findsOneWidget);
    expect(find.text('JEDA MAKAN'), findsOneWidget);
    expect(find.text('3j 18m'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('Buka halaman hari ini'));
    await tester.pump();
    expect(dismissed, isTrue);
  });

  testWidgets('DietHome membuka check-in sebelum halaman Hari ini', (
    tester,
  ) async {
    final storage = await AppStorage.initialize(
      preferences: FakeKeyValueStore(),
      apiKeys: ApiKeyVault(store: FakeSecureValueStore()),
    );
    final controller = DietAppController(storage, enableStepTracking: false);
    await controller.initialize();

    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: controller,
        child: MaterialApp(theme: AppTheme.dark, home: const DietHome()),
      ),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(find.text('Apakah kamu lapar?'), findsOneWidget);
    expect(find.text('Hari ini').hitTestable(), findsNothing);

    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
    await tester.pump();
  });
}
