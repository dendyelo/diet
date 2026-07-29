import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// A normalized device-tilt vector used to position a glass reflection.
///
/// Both axes are always finite and clamped to the inclusive range `-1...1`.
final class GlassMotionSample {
  const GlassMotionSample({required this.x, required this.y});

  static const neutral = GlassMotionSample(x: 0, y: 0);

  final double x;
  final double y;

  Offset get offset => Offset(x, y);

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is GlassMotionSample && other.x == x && other.y == y;
  }

  @override
  int get hashCode => Object.hash(x, y);

  @override
  String toString() => 'GlassMotionSample(x: $x, y: $y)';
}

/// Shares iPhone Core Motion tilt values with glass surfaces.
///
/// The stream is broadcast and lazy: native updates begin with the first
/// listener and stop after the last listener cancels. On unsupported platforms,
/// simulators, or when the native bridge is absent, listeners receive a neutral
/// sample so the glass UI can remain static without special error handling.
final class GlassMotionService {
  GlassMotionService() {
    _controller = StreamController<GlassMotionSample>.broadcast(
      sync: true,
      onListen: _handleListen,
      onCancel: _handleCancel,
    );
  }

  static const _channelName = 'app.habitdiet/glass-motion';
  static const _eventChannel = EventChannel(_channelName);

  late final StreamController<GlassMotionSample> _controller;
  StreamSubscription<Object?>? _nativeSubscription;
  Future<void> _nativeTransition = Future<void>.value();
  Future<void>? _disposeFuture;
  GlassMotionSample _latest = GlassMotionSample.neutral;
  bool _wantsNativeEvents = false;
  bool _disposed = false;
  int _stateRequest = 0;
  int _nativeGeneration = 0;

  Stream<GlassMotionSample> get samples => _controller.stream;

  Future<void> dispose() {
    final existing = _disposeFuture;
    if (existing != null) return existing;

    _disposed = true;
    _wantsNativeEvents = false;
    _scheduleNativeState();
    final future = () async {
      await _nativeTransition;
      await _controller.close();
    }();
    _disposeFuture = future;
    return future;
  }

  void _handleListen() {
    if (_disposed) return;
    _wantsNativeEvents = true;
    _scheduleNativeState();
  }

  void _handleCancel() {
    if (_disposed) return;
    _wantsNativeEvents = false;
    _scheduleNativeState();
  }

  void _scheduleNativeState() {
    final request = ++_stateRequest;
    _nativeTransition = _nativeTransition.then<void>((_) async {
      // A newer listen/cancel request supersedes this queued transition.
      if (request != _stateRequest) return;

      if (_wantsNativeEvents && !_disposed) {
        _emit(_latest);
        _attachNativeStream();
      } else {
        await _detachNativeStream();
      }
    });
  }

  void _attachNativeStream() {
    if (_nativeSubscription != null) return;

    // This bridge is intentionally iOS-only. Avoid asking for a plugin on
    // Android, desktop, and web, where a still reflection is the safe fallback.
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      _emit(GlassMotionSample.neutral);
      return;
    }

    final generation = ++_nativeGeneration;
    try {
      _nativeSubscription = _eventChannel.receiveBroadcastStream().listen(
        (event) => _handleNativeEvent(event, generation),
        onError: (Object _) {
          if (generation == _nativeGeneration) {
            _emit(GlassMotionSample.neutral);
          }
        },
      );
    } on MissingPluginException {
      _emit(GlassMotionSample.neutral);
    } on PlatformException {
      _emit(GlassMotionSample.neutral);
    }
  }

  Future<void> _detachNativeStream() async {
    ++_nativeGeneration;
    final subscription = _nativeSubscription;
    _nativeSubscription = null;
    if (subscription == null) return;

    try {
      await subscription.cancel();
    } on MissingPluginException {
      // Cancellation is best-effort when the native app is not installed.
    } on PlatformException {
      // A static reflection remains safe if native shutdown fails.
    }
  }

  void _handleNativeEvent(Object? event, int generation) {
    if (generation != _nativeGeneration || event is! Map) return;

    final x = _normalizedCoordinate(event['x']);
    final y = _normalizedCoordinate(event['y']);
    _emit(GlassMotionSample(x: x, y: y));
  }

  double _normalizedCoordinate(Object? value) {
    if (value is! num) return 0;
    final coordinate = value.toDouble();
    if (!coordinate.isFinite) return 0;
    return coordinate.clamp(-1.0, 1.0);
  }

  void _emit(GlassMotionSample sample) {
    if (_disposed) return;
    _latest = sample;
    _controller.add(sample);
  }
}
