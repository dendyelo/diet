import 'package:diet/data/data.dart';
import 'package:diet/domain/domain.dart';
import 'package:diet/state/diet_app_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import '../data/fakes.dart';

void main() {
  test(
    'pergantian hari memuat ulang data harian dan menghapus check-in lama',
    () async {
      var now = DateTime(2026, 7, 28, 23, 59);
      final storage = await AppStorage.initialize(
        preferences: FakeKeyValueStore(),
        apiKeys: ApiKeyVault(store: FakeSecureValueStore()),
      );
      final nextDay = DateTime(2026, 7, 29, 0, 1);
      final nextActivity = ActivityLog(
        id: 'activity-next-day',
        timestamp: nextDay,
        name: 'Jalan pagi',
        durationMinutes: 30,
        met: 3.5,
        estimatedCalories: 130,
        creditedCalories: 100,
        stepOverlap: ActivityStepOverlap.high,
      );
      await storage.saveWaterGlasses(nextDay, 2);
      await storage.saveSteps(
        nextDay,
        const StepRecord(sensorSteps: 120, manualSteps: 30),
      );
      await storage.saveActivities(nextDay, [nextActivity]);

      final controller = DietAppController(
        storage,
        clock: () => now,
        enableStepTracking: false,
      );
      await controller.initialize();
      await controller.addWater();
      await controller.setManualSteps(900);
      controller.recordHungerCheck(
        answer: HungerCheckAnswer.hungry,
        signal: HungerSignal.physical,
        intent: EatingIntent.meal,
      );

      now = nextDay;
      await controller.refreshCurrentDay();

      expect(controller.now, nextDay);
      expect(controller.waterGlasses, 2);
      expect(controller.steps, 150);
      expect(controller.activities.map((item) => item.id), [
        'activity-next-day',
      ]);
      expect(controller.lastHungerCheck, isNull);
      expect(controller.dailyInsight, isNull);

      controller.dispose();
    },
  );

  test('provider terpilih menjadi urutan pertama dan tersimpan', () async {
    final storage = await AppStorage.initialize(
      preferences: FakeKeyValueStore(),
      apiKeys: ApiKeyVault(store: FakeSecureValueStore()),
    );
    const custom = AiProviderConfig(
      id: 'custom-test',
      label: 'Provider Test',
      kind: AiProviderKind.openAiCompatible,
      baseUrl: 'https://api.example.com/v1',
      models: ['model-primary', 'model-backup'],
    );
    await storage.saveAiProviderConfigs(const [
      defaultGoogleAiStudioConfig,
      custom,
    ]);
    final controller = DietAppController(storage, enableStepTracking: false);
    await controller.initialize();

    await controller.selectAiProvider(custom.id);

    expect(controller.selectedAiProviderId, custom.id);
    expect(controller.aiProviders.first.id, custom.id);
    expect((await storage.loadAiProviderConfigs()).first.id, custom.id);

    controller.dispose();
  });

  test('check-in kedaluwarsa setelah makan atau setelah 30 menit', () async {
    var now = DateTime(2026, 7, 28, 12);
    final storage = await AppStorage.initialize(
      preferences: FakeKeyValueStore(),
      apiKeys: ApiKeyVault(store: FakeSecureValueStore()),
    );
    final controller = DietAppController(
      storage,
      clock: () => now,
      enableStepTracking: false,
    );
    await controller.initialize();

    controller.recordHungerCheck(
      answer: HungerCheckAnswer.hungry,
      signal: HungerSignal.physical,
      intent: EatingIntent.meal,
    );
    expect(controller.liveHungerDecision, isNotNull);

    await controller.saveMeal(
      MealLog(
        id: 'lunch',
        timestamp: now.add(const Duration(minutes: 1)),
        name: 'Makan siang',
        isSnack: false,
        nutrition: const NutritionData(calories: 500),
      ),
    );
    expect(controller.liveHungerDecision, isNull);

    now = now.add(const Duration(hours: 1));
    controller.recordHungerCheck(
      answer: HungerCheckAnswer.unsure,
      signal: null,
      intent: null,
    );
    expect(controller.liveHungerDecision, isNotNull);
    now = now.add(const Duration(minutes: 31));
    await controller.refreshCurrentDay();
    expect(controller.liveHungerDecision, isNull);

    controller.dispose();
  });

  test(
    'aktivitas yang tampil memakai alokasi overlap yang sama dengan engine',
    () async {
      final now = DateTime(2026, 7, 28, 18);
      final storage = await AppStorage.initialize(
        preferences: FakeKeyValueStore(),
        apiKeys: ApiKeyVault(store: FakeSecureValueStore()),
      );
      await storage.saveSteps(now, const StepRecord(sensorSteps: 20000));
      await storage.saveActivities(now, [
        ActivityLog(
          id: 'run',
          timestamp: now,
          name: 'Jogging',
          durationMinutes: 40,
          met: 7,
          estimatedCalories: 400,
          creditedCalories: 400,
          stepOverlap: ActivityStepOverlap.high,
        ),
        ActivityLog(
          id: 'football',
          timestamp: now.subtract(const Duration(hours: 2)),
          name: 'Sepak bola',
          durationMinutes: 30,
          met: 7,
          estimatedCalories: 300,
          creditedCalories: 300,
          stepOverlap: ActivityStepOverlap.high,
        ),
      ]);
      final controller = DietAppController(
        storage,
        clock: () => now,
        enableStepTracking: false,
      );
      await controller.initialize();

      final displayedTotal = controller.activities.fold<int>(
        0,
        (total, activity) => total + activity.creditedCalories,
      );
      expect(displayedTotal, controller.narratedActivityCalories);
      expect(displayedTotal, lessThan(700));

      controller.dispose();
    },
  );
}
