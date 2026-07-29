import 'package:diet/core/theme/app_theme.dart';
import 'package:diet/presentation/screens/today_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('ringkasan hari ini jelas dan aman pada layar iPhone kecil', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: TodayScreen(
          data: TodayScreenData(
            now: DateTime(2026, 7, 28, 10, 30),
            caloriesIn: 550,
            caloriesOut: 766,
            dietLimit: 1705,
            projectedBurn: 2205,
            proteinGrams: 42,
            proteinTarget: 117,
            waterGlasses: 4,
            steps: 3650,
            stepGoal: 8000,
            mealGap: const Duration(hours: 3, minutes: 18),
            guidanceLabel: 'Fokus',
            guidanceHeadline: 'Ikuti rasa lapar tubuhmu.',
            guidanceBody: 'Catat makanan saat kamu benar-benar makan.',
            meals: const [],
            activities: const [],
          ),
          onOpenCheckIn: () {},
          onAddMeal: () {},
          onAddActivity: () {},
          onAddWater: () {},
          onAskCoach: () {},
          onEditMeal: (_) {},
          onDeleteMeal: (_) {},
          onDeleteActivity: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('DEFISIT SAAT INI'), findsOneWidget);
    expect(find.text('216'), findsOneWidget);
    expect(find.text('550 kkal'), findsOneWidget);
    expect(find.text('766 kkal'), findsOneWidget);
    expect(find.text('1.705 kkal'), findsOneWidget);
    expect(find.text('3 jam 18 menit'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
