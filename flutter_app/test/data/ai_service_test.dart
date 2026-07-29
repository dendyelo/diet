import 'package:diet/data/data.dart';
import 'package:diet/domain/calculators/activity_calculator.dart';
import 'package:diet/domain/models/models.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes.dart';

void main() {
  group('AiService', () {
    test(
      'falls through configured models and reports the working model',
      () async {
        final secure = FakeSecureValueStore();
        final vault = ApiKeyVault(store: secure);
        await vault.write('provider', 'test-key');
        final provider = FakeAiProvider(({
          required config,
          required model,
          required apiKey,
          required request,
          required timeout,
        }) async {
          if (model == 'limited') {
            throw const AiProviderFailure(AiFailureKind.rateLimited);
          }
          return AiTextResponse(
            text:
                '{"name":"Nasi ayam","calories":500,"proteinGrams":25,'
                '"carbsGrams":60,"fatGrams":16,"fiberGrams":4,'
                '"confidence":"high","itemsBreakdown":'
                '[{"name":"Nasi ayam","calories":500}],"notes":"Porsi sedang"}',
            model: model,
            providerId: config.id,
          );
        });
        final service = AiService(
          apiKeys: vault,
          configs: const <AiProviderConfig>[
            AiProviderConfig(
              id: 'provider',
              label: 'Test',
              kind: AiProviderKind.googleAiStudio,
              models: <String>['limited', 'working'],
            ),
          ],
          googleProvider: provider,
        );

        final result = await service.parseMeal('nasi ayam satu porsi');

        expect(result.isOnlineAi, isTrue);
        expect(result.calories, 500);
        expect(provider.attemptedModels, <String>['limited', 'working']);
        expect(service.status, AiConnectionStatus.connected);
        expect(service.activeModel, 'working');
      },
    );

    test('uses one global deadline for the whole fallback chain', () async {
      final vault = ApiKeyVault(store: FakeSecureValueStore());
      await vault.write('provider', 'test-key');
      final provider = FakeAiProvider(({
        required config,
        required model,
        required apiKey,
        required request,
        required timeout,
      }) async {
        await Future<void>.delayed(const Duration(milliseconds: 18));
        throw const AiProviderFailure(AiFailureKind.unavailable);
      });
      final service = AiService(
        apiKeys: vault,
        configs: const <AiProviderConfig>[
          AiProviderConfig(
            id: 'provider',
            label: 'Test',
            kind: AiProviderKind.googleAiStudio,
            models: <String>['a', 'b', 'c', 'd'],
          ),
        ],
        googleProvider: provider,
        globalDeadline: const Duration(milliseconds: 30),
      );

      final stopwatch = Stopwatch()..start();
      final result = await service.parseMeal('nasi satu porsi');
      stopwatch.stop();

      expect(result.isOnlineAi, isFalse);
      expect(stopwatch.elapsed, lessThan(const Duration(milliseconds: 100)));
      expect(provider.attemptedModels.length, lessThan(4));
      expect(service.status, AiConnectionStatus.offline);
    });

    test('local meal and activity parsing work without any API key', () async {
      final service = AiService(
        apiKeys: ApiKeyVault(store: FakeSecureValueStore()),
      );

      final meal = await service.parseMeal('nasi, ayam bakar, dan lalapan');
      final activity = await service.parseActivity('jogging 30 menit');

      expect(meal.isOnlineAi, isFalse);
      expect(meal.calories, greaterThan(0));
      expect(activity.source, ActivitySource.local);
      expect(activity.durationMinutes, 30);
      expect(activity.confidence, ActivityConfidence.medium);
      expect(service.status, AiConnectionStatus.notConfigured);
    });

    test('secure storage failure still permits local estimation', () async {
      final secure = FakeSecureValueStore()..throwOnRead = true;
      final service = AiService(apiKeys: ApiKeyVault(store: secure));

      final result = await service.parseMeal('nasi dan telur');

      expect(result.isOnlineAi, isFalse);
      expect(result.calories, greaterThan(0));
      expect(service.status, AiConnectionStatus.offline);
    });

    test('online activity response maps to the domain contract', () async {
      final vault = ApiKeyVault(store: FakeSecureValueStore());
      await vault.write('provider', 'test-key');
      final provider = FakeAiProvider(
        ({
          required config,
          required model,
          required apiKey,
          required request,
          required timeout,
        }) async => AiTextResponse(
          text:
              '{"name":"Sepak bola","durationMinutes":60,"met":7,'
              '"stepOverlap":"medium","confidence":"high",'
              '"notes":"Intensitas sedang"}',
          model: model,
          providerId: config.id,
        ),
      );
      final service = AiService(
        apiKeys: vault,
        configs: const <AiProviderConfig>[
          AiProviderConfig(
            id: 'provider',
            label: 'Test',
            kind: AiProviderKind.googleAiStudio,
            models: <String>['model'],
          ),
        ],
        googleProvider: provider,
      );

      final result = await service.parseActivity('sepak bola 1 jam');

      expect(result.source, ActivitySource.ai);
      expect(result.durationMinutes, 60);
      expect(result.stepOverlap, ActivityStepOverlap.medium);
    });

    test(
      'coach has a deterministic local guardrail when AI is unavailable',
      () async {
        final service = AiService(
          apiKeys: ApiKeyVault(store: FakeSecureValueStore()),
        );

        final result = await service.askCoach(
          query: 'Apakah saya boleh makan?',
          context: const <String, Object?>{
            'caloriesIn': 500,
            'dietLimit': 1700,
            'waterGlasses': 2,
          },
        );

        expect(result.recommendedAction, AiSuggestedAction.checkin);
        expect(result.message, contains('check-in'));
      },
    );
  });
}
