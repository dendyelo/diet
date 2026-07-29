import 'dart:async';

import 'package:diet/platform/glass_motion_service.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channelName = 'app.habitdiet/glass-motion';
  const channel = MethodChannel(channelName);
  const codec = StandardMethodCodec();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  setUp(() {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
  });

  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
    messenger.setMockMethodCallHandler(channel, null);
  });

  test('sample exposes the normalized vector as an Offset', () {
    const sample = GlassMotionSample(x: 0.25, y: -0.5);

    expect(sample.offset.dx, 0.25);
    expect(sample.offset.dy, -0.5);
    expect(GlassMotionSample.neutral.offset, Offset.zero);
  });

  test('shares one native stream and clamps malformed native values', () async {
    var listenCalls = 0;
    var cancelCalls = 0;
    messenger.setMockMethodCallHandler(channel, (call) async {
      switch (call.method) {
        case 'listen':
          listenCalls += 1;
        case 'cancel':
          cancelCalls += 1;
      }
      return null;
    });

    final service = GlassMotionService();
    final firstValues = <GlassMotionSample>[];
    final secondValues = <GlassMotionSample>[];
    final first = service.samples.listen(firstValues.add);
    final second = service.samples.listen(secondValues.add);
    await _flushTasks();

    expect(listenCalls, 1);
    expect(firstValues, isNotEmpty);
    expect(firstValues.first, GlassMotionSample.neutral);

    await _sendEvent(messenger, codec, channelName, <String, Object?>{
      'x': 3.5,
      'y': double.nan,
    });
    await _flushTasks();

    expect(firstValues.last, const GlassMotionSample(x: 1, y: 0));
    expect(secondValues.last, const GlassMotionSample(x: 1, y: 0));

    await first.cancel();
    await _flushTasks();
    expect(cancelCalls, 0);

    await second.cancel();
    await _flushTasks();
    expect(cancelCalls, 1);
    await service.dispose();
  });

  test(
    'rapid unsubscribe and resubscribe keeps one valid native feed',
    () async {
      var listenCalls = 0;
      var cancelCalls = 0;
      messenger.setMockMethodCallHandler(channel, (call) async {
        if (call.method == 'listen') listenCalls += 1;
        if (call.method == 'cancel') cancelCalls += 1;
        return null;
      });

      final service = GlassMotionService();
      final first = service.samples.listen((_) {});
      await _flushTasks();
      await first.cancel();
      final values = <GlassMotionSample>[];
      final second = service.samples.listen(values.add);
      await _flushTasks();

      expect(listenCalls, inInclusiveRange(1, 2));
      expect(cancelCalls, lessThanOrEqualTo(1));

      await _sendEvent(messenger, codec, channelName, <String, Object?>{
        'x': -0.4,
        'y': 0.7,
      });
      await _flushTasks();
      expect(values.last, const GlassMotionSample(x: -0.4, y: 0.7));

      await second.cancel();
      await service.dispose();
    },
  );

  test(
    'non-iOS platforms receive a neutral fallback without a plugin',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      var platformCalls = 0;
      messenger.setMockMethodCallHandler(channel, (_) async {
        platformCalls += 1;
        return null;
      });

      final service = GlassMotionService();
      final sample = await service.samples.first;

      expect(sample, GlassMotionSample.neutral);
      expect(platformCalls, 0);
      await service.dispose();
    },
  );

  test('dispose is idempotent and cancels an active native stream', () async {
    var cancelCalls = 0;
    messenger.setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'cancel') cancelCalls += 1;
      return null;
    });

    final service = GlassMotionService();
    final subscription = service.samples.listen((_) {});
    await _flushTasks();

    await Future.wait<void>(<Future<void>>[
      service.dispose(),
      service.dispose(),
    ]);

    expect(cancelCalls, 1);
    await subscription.cancel();
  });
}

Future<void> _sendEvent(
  TestDefaultBinaryMessenger messenger,
  MethodCodec codec,
  String channelName,
  Object? event,
) async {
  final completer = Completer<void>();
  await messenger.handlePlatformMessage(
    channelName,
    codec.encodeSuccessEnvelope(event),
    (_) => completer.complete(),
  );
  await completer.future;
}

Future<void> _flushTasks() async {
  await Future<void>.delayed(Duration.zero);
  await Future<void>.delayed(Duration.zero);
}
