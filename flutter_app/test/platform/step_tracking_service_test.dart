import 'package:diet/platform/step_tracking_service.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('app.habitdiet/steps');
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  tearDown(() {
    messenger.setMockMethodCallHandler(channel, null);
  });

  test('refreshToday returns cumulative iPhone steps for today', () async {
    messenger.setMockMethodCallHandler(channel, (call) async {
      return switch (call.method) {
        'isStepCountingAvailable' => true,
        'getTodaySteps' => <String, Object?>{
          'steps': 4321,
          'startTime': 1722128400000,
          'endTime': 1722142800000,
          'authorizationStatus': 'authorized',
        },
        'stopStepUpdates' => null,
        _ => throw MissingPluginException(),
      };
    });
    final service = StepTrackingService();

    final snapshot = await service.refreshToday();

    expect(snapshot.steps, 4321);
    expect(snapshot.status, StepTrackingStatus.stopped);
    expect(snapshot.authorization, StepAuthorizationStatus.authorized);
    expect(snapshot.isLive, isFalse);
    await service.dispose();
  });

  test('start marks service active after the initial query', () async {
    messenger.setMockMethodCallHandler(channel, (call) async {
      return switch (call.method) {
        'isStepCountingAvailable' => true,
        'getTodaySteps' => <String, Object?>{
          'steps': 1200,
          'endTime': 1722142800000,
          'authorizationStatus': 'authorized',
        },
        'startStepUpdates' => <String, Object?>{
          'started': true,
          'authorizationStatus': 'authorized',
        },
        'stopStepUpdates' => null,
        _ => throw MissingPluginException(),
      };
    });
    final service = StepTrackingService();

    final snapshot = await service.start();

    expect(snapshot.steps, 1200);
    expect(snapshot.status, StepTrackingStatus.active);
    expect(snapshot.isLive, isTrue);
    await service.dispose();
  });

  test(
    'unsupported devices return a usable state instead of throwing',
    () async {
      messenger.setMockMethodCallHandler(channel, (call) async {
        if (call.method == 'isStepCountingAvailable') return false;
        if (call.method == 'stopStepUpdates') return null;
        throw MissingPluginException();
      });
      final service = StepTrackingService();

      final snapshot = await service.refreshToday();

      expect(snapshot.steps, 0);
      expect(snapshot.status, StepTrackingStatus.unsupported);
      expect(snapshot.authorization, StepAuthorizationStatus.unsupported);
      expect(snapshot.message, isNotEmpty);
      await service.dispose();
    },
  );

  test('denied Motion permission becomes a clear denied state', () async {
    messenger.setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'isStepCountingAvailable') return true;
      if (call.method == 'getTodaySteps') {
        throw PlatformException(
          code: 'STEPS_DENIED',
          message: 'Akses Gerak & Kebugaran ditolak.',
        );
      }
      if (call.method == 'stopStepUpdates') return null;
      throw MissingPluginException();
    });
    final service = StepTrackingService();

    final snapshot = await service.refreshToday();

    expect(snapshot.status, StepTrackingStatus.denied);
    expect(snapshot.authorization, StepAuthorizationStatus.denied);
    expect(snapshot.message, contains('Pengaturan'));
    await service.dispose();
  });
}
