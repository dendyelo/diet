import 'dart:convert';

import 'package:diet/data/data.dart';
import 'package:diet/domain/models/models.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes.dart';

void main() {
  group('AppStorage', () {
    test(
      'migrates and sanitizes legacy JSON without retaining API keys',
      () async {
        final day = DateTime(2026, 7, 28);
        final preferences = FakeKeyValueStore(<String, String>{
          '@habitdiet_user_profile': jsonEncode(<String, Object?>{
            'name': '  Dendy  ',
            'age': 999,
            'heightCm': 280,
            'weightKg': 12,
            'targetWeightKg': 400,
            'bodyType': 'easy_gain',
            'lastMealTimestamp': 'bukan-tanggal',
            'geminiApiKey': ' secret-key ',
          }),
          '@habitdiet_meal_logs': jsonEncode(<Object?>[
            <String, Object?>{
              'id': 'meal-1',
              'timestamp': day.add(const Duration(hours: 8)).toIso8601String(),
              'name': 'Nasi dan telur',
              'isSnack': false,
              'source': 'manual',
              'nutrition': <String, Object?>{'calories': 420},
            },
            <String, Object?>{
              'id': '',
              'timestamp': 'rusak',
              'name': '',
              'nutrition': <String, Object?>{'calories': -1},
            },
          ]),
          '@habitdiet_water_glasses_2026-07-28': '7',
          '@habitdiet_step_count_2026-07-28': '4567',
        });
        final secure = FakeSecureValueStore();

        final storage = await AppStorage.initialize(
          preferences: preferences,
          apiKeys: ApiKeyVault(store: secure),
        );
        final profile = await storage.loadProfile();
        final meals = await storage.loadMeals(day: day);

        expect(profile.name, 'Dendy');
        expect(profile.age, 100);
        expect(profile.heightCm, 230);
        expect(profile.weightKg, 30);
        expect(profile.targetWeightKg, 250);
        expect(profile.bodyResponse, BodyResponse.easyGain);
        expect(profile.lastMealAt, isNull);
        expect(await storage.apiKeys.read('google-ai-studio'), 'secret-key');
        expect(
          preferences.values['habitdiet.profile'],
          isNot(contains('secret-key')),
        );
        expect(preferences.values.values.join(), isNot(contains('secret-key')));
        expect(meals, hasLength(1));
        expect(await storage.loadWaterGlasses(day), 7);
        expect((await storage.loadSteps(day)).totalSteps, 4567);
        expect(await storage.loadWeights(), hasLength(1));
      },
    );

    test('corrupt persisted JSON falls back to safe values', () async {
      final preferences = FakeKeyValueStore(<String, String>{
        'habitdiet.schema': '${AppStorage.schemaVersion}',
        'habitdiet.profile': '{broken',
        'habitdiet.meals': '"not a list"',
        'habitdiet.day.steps.2026-07-28': '{broken',
      });
      final storage = await AppStorage.initialize(
        preferences: preferences,
        apiKeys: ApiKeyVault(store: FakeSecureValueStore()),
      );

      expect(await storage.loadProfile(), isA<UserProfile>());
      expect(await storage.loadMeals(), isEmpty);
      expect((await storage.loadSteps(DateTime(2026, 7, 28))).totalSteps, 0);
    });

    test('a failed write does not poison the next queued write', () async {
      final preferences = FakeKeyValueStore();
      final storage = await AppStorage.initialize(
        preferences: preferences,
        apiKeys: ApiKeyVault(store: FakeSecureValueStore()),
      );
      final day = DateTime(2026, 7, 28);
      preferences.failNextWrite = true;

      await expectLater(storage.saveWaterGlasses(day, 2), throwsStateError);
      await storage.saveWaterGlasses(day, 5);

      expect(await storage.loadWaterGlasses(day), 5);
    });

    test(
      'only valid provider metadata is persisted outside secure storage',
      () async {
        final preferences = FakeKeyValueStore();
        final storage = await AppStorage.initialize(
          preferences: preferences,
          apiKeys: ApiKeyVault(store: FakeSecureValueStore()),
        );

        await storage.saveAiProviderConfigs(const <AiProviderConfig>[
          defaultGoogleAiStudioConfig,
          AiProviderConfig(
            id: 'unsafe',
            label: 'Unsafe remote',
            kind: AiProviderKind.openAiCompatible,
            baseUrl: 'http://example.com/v1',
            models: <String>['model-a'],
          ),
          AiProviderConfig(
            id: 'local',
            label: 'Local provider',
            kind: AiProviderKind.openAiCompatible,
            baseUrl: 'http://localhost:11434/v1',
            models: <String>['local-model'],
          ),
        ]);

        final configs = await storage.loadAiProviderConfigs();
        expect(configs.map((item) => item.id), <String>[
          'google-ai-studio',
          'local',
        ]);
        expect(preferences.values.values.join(), isNot(contains('apiKey')));
      },
    );
  });
}
