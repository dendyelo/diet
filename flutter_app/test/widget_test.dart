import 'package:diet/core/theme/app_theme.dart';
import 'package:diet/presentation/widgets/energy_balance_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('energy bar explains masuk, keluar, and fixed diet limit', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: const Scaffold(
          body: Padding(
            padding: EdgeInsets.all(20),
            child: EnergyBalanceBar(
              caloriesIn: 550,
              caloriesOut: 766,
              dietLimit: 1705,
              projectedBurn: 2205,
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.textContaining('defisit sementara'), findsOneWidget);
    expect(
      find.text('Masuk 550  •  keluar 766  •  batas 1.705 kkal'),
      findsOneWidget,
    );
  });
}
