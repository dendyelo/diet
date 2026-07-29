import 'package:diet/core/theme/app_theme.dart';
import 'package:diet/data/data.dart';
import 'package:diet/domain/models/user_profile.dart';
import 'package:diet/presentation/screens/profile_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('provider OpenAI-compatible dapat ditambah tanpa API key', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    String? savedLabel;
    String? savedBaseUrl;
    List<String>? savedModels;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: ProfileScreen(
          profile: const UserProfile(),
          onSaveProfile: (_) {},
          onAddAiProvider:
              ({required label, required baseUrl, required models}) async {
                savedLabel = label;
                savedBaseUrl = baseUrl;
                savedModels = models;
                return 'custom-test-provider';
              },
          onSaveApiKey: (_, _) {},
          onTestAi: (_) async => AiConnectionStatus.notConfigured,
          onDeleteApiKey: (_) {},
        ),
      ),
    );

    final providerCard = find.text('Google AI Studio');
    await tester.scrollUntilVisible(
      providerCard,
      260,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(providerCard);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('add-ai-provider-button')));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const ValueKey('ai-provider-name-field')),
      'Provider Coba',
    );
    await tester.enterText(
      find.byKey(const ValueKey('ai-provider-url-field')),
      'https://api.example.com/v1',
    );
    await tester.enterText(
      find.byKey(const ValueKey('ai-provider-models-field')),
      'model-utama\nmodel-cadangan, model-utama',
    );
    await tester.tap(find.text('Tambahkan provider'));
    await tester.pumpAndSettle();

    expect(savedLabel, 'Provider Coba');
    expect(savedBaseUrl, 'https://api.example.com/v1');
    expect(savedModels, ['model-utama', 'model-cadangan']);
    expect(find.text('Provider Coba'), findsWidgets);
    expect(
      find.text('Provider Coba ditambahkan. Sekarang masukkan API key-nya.'),
      findsOneWidget,
    );
    expect(find.text('API key baru'), findsOneWidget);
  });
}
