import 'dart:async';

import 'package:flutter/services.dart';

enum StepAuthorizationStatus {
  unknown,
  notDetermined,
  restricted,
  denied,
  authorized,
  unsupported,
}

enum StepTrackingStatus {
  idle,
  loading,
  active,
  stopped,
  unsupported,
  denied,
  error,
}

final class StepTrackingSnapshot {
  const StepTrackingSnapshot({
    required this.steps,
    required this.status,
    required this.authorization,
    required this.updatedAt,
    this.message,
    this.isLive = false,
  });

  factory StepTrackingSnapshot.initial() => StepTrackingSnapshot(
    steps: 0,
    status: StepTrackingStatus.idle,
    authorization: StepAuthorizationStatus.unknown,
    updatedAt: DateTime.now(),
  );

  final int steps;
  final StepTrackingStatus status;
  final StepAuthorizationStatus authorization;
  final DateTime updatedAt;
  final String? message;
  final bool isLive;

  StepTrackingSnapshot copyWith({
    int? steps,
    StepTrackingStatus? status,
    StepAuthorizationStatus? authorization,
    DateTime? updatedAt,
    String? message,
    bool clearMessage = false,
    bool? isLive,
  }) {
    return StepTrackingSnapshot(
      steps: steps ?? this.steps,
      status: status ?? this.status,
      authorization: authorization ?? this.authorization,
      updatedAt: updatedAt ?? this.updatedAt,
      message: clearMessage ? null : (message ?? this.message),
      isLive: isLive ?? this.isLive,
    );
  }
}

/// Reads today's iPhone steps through the native Core Motion bridge.
///
/// Calling [start] can trigger iOS' Motion & Fitness permission prompt. The
/// service stays usable when the channel, sensor, or permission is unavailable:
/// callers receive a descriptive snapshot instead of a platform exception.
final class StepTrackingService {
  StepTrackingService() {
    _channel.setMethodCallHandler(_handleNativeCall);
  }

  static const _channelName = 'app.habitdiet/steps';

  final MethodChannel _channel = const MethodChannel(_channelName);
  final StreamController<StepTrackingSnapshot> _snapshots =
      StreamController<StepTrackingSnapshot>.broadcast(sync: true);

  StepTrackingSnapshot _current = StepTrackingSnapshot.initial();
  bool _disposed = false;

  StepTrackingSnapshot get current => _current;

  Stream<StepTrackingSnapshot> get snapshots => _snapshots.stream;

  Future<bool> isAvailable() async {
    try {
      return await _channel.invokeMethod<bool>('isStepCountingAvailable') ??
          false;
    } on MissingPluginException {
      return false;
    } on PlatformException {
      return false;
    }
  }

  Future<StepAuthorizationStatus> authorizationStatus() async {
    try {
      final value = await _channel.invokeMethod<String>(
        'getAuthorizationStatus',
      );
      return _parseAuthorization(value);
    } on MissingPluginException {
      return StepAuthorizationStatus.unsupported;
    } on PlatformException {
      return StepAuthorizationStatus.unknown;
    }
  }

  /// Fetches the cumulative step count from local midnight until now.
  ///
  /// Core Motion prompts for Motion & Fitness access on first use when needed.
  Future<StepTrackingSnapshot> refreshToday() async {
    if (_disposed) return _current;

    _emit(
      _current.copyWith(
        status: StepTrackingStatus.loading,
        updatedAt: DateTime.now(),
        clearMessage: true,
      ),
    );

    if (!await isAvailable()) {
      return _emitUnsupported();
    }

    try {
      final payload = await _channel.invokeMapMethod<String, Object?>(
        'getTodaySteps',
      );
      if (payload == null) {
        return _emitError('Data langkah belum tersedia.');
      }
      return _emitPayload(
        payload,
        status: _current.isLive
            ? StepTrackingStatus.active
            : StepTrackingStatus.stopped,
        isLive: _current.isLive,
      );
    } on MissingPluginException {
      return _emitUnsupported();
    } on PlatformException catch (error) {
      return _emitPlatformError(error);
    }
  }

  /// Starts live step updates while the app is running.
  ///
  /// The native update begins at local midnight, so every event remains the
  /// complete count for today rather than a delta since this method was called.
  Future<StepTrackingSnapshot> start() async {
    if (_disposed) return _current;

    final refreshed = await refreshToday();
    if (refreshed.status == StepTrackingStatus.unsupported ||
        refreshed.status == StepTrackingStatus.denied ||
        refreshed.status == StepTrackingStatus.error) {
      return refreshed;
    }

    try {
      final response = await _channel.invokeMapMethod<String, Object?>(
        'startStepUpdates',
      );
      final started = response?['started'] == true;
      final authorization = _parseAuthorization(
        response?['authorizationStatus']?.toString(),
      );

      if (!started) {
        if (authorization == StepAuthorizationStatus.denied ||
            authorization == StepAuthorizationStatus.restricted) {
          return _emitAccessDenied(authorization);
        }
        return _emitUnsupported();
      }

      return _emit(
        _current.copyWith(
          status: StepTrackingStatus.active,
          authorization: authorization,
          updatedAt: DateTime.now(),
          isLive: true,
          clearMessage: true,
        ),
      );
    } on MissingPluginException {
      return _emitUnsupported();
    } on PlatformException catch (error) {
      return _emitPlatformError(error);
    }
  }

  Future<StepTrackingSnapshot> stop() async {
    if (_disposed) return _current;

    try {
      await _channel.invokeMethod<void>('stopStepUpdates');
    } on MissingPluginException {
      // A missing bridge is already represented by the unsupported status.
    } on PlatformException {
      // Stopping is best-effort and should never interrupt app shutdown.
    }

    return _emit(
      _current.copyWith(
        status: StepTrackingStatus.stopped,
        updatedAt: DateTime.now(),
        isLive: false,
        clearMessage: true,
      ),
    );
  }

  Future<void> dispose() async {
    if (_disposed) return;
    await stop();
    _disposed = true;
    _channel.setMethodCallHandler(null);
    await _snapshots.close();
  }

  Future<void> _handleNativeCall(MethodCall call) async {
    if (_disposed) return;

    switch (call.method) {
      case 'stepsUpdated':
        final arguments = call.arguments;
        if (arguments is Map) {
          _emitPayload(
            arguments.cast<String, Object?>(),
            status: StepTrackingStatus.active,
            isLive: true,
          );
        }
        return;
      case 'stepTrackingError':
        final arguments = call.arguments;
        if (arguments is Map) {
          final payload = arguments.cast<Object?, Object?>();
          final code = payload['code']?.toString() ?? '';
          final message = payload['message']?.toString();
          _emitNativeError(code, message);
        } else {
          _emitError('Pembaruan langkah berhenti.');
        }
        return;
    }
  }

  StepTrackingSnapshot _emitPayload(
    Map<String, Object?> payload, {
    required StepTrackingStatus status,
    required bool isLive,
  }) {
    final authorization = _parseAuthorization(
      payload['authorizationStatus']?.toString(),
    );
    if (authorization == StepAuthorizationStatus.denied ||
        authorization == StepAuthorizationStatus.restricted) {
      return _emitAccessDenied(authorization);
    }

    final rawSteps = payload['steps'];
    final steps = rawSteps is num
        ? rawSteps.toInt().clamp(0, 1000000).toInt()
        : 0;
    final rawUpdatedAt = payload['endTime'];
    final updatedAt = rawUpdatedAt is num
        ? DateTime.fromMillisecondsSinceEpoch(rawUpdatedAt.toInt())
        : DateTime.now();

    return _emit(
      StepTrackingSnapshot(
        steps: steps,
        status: status,
        authorization: authorization,
        updatedAt: updatedAt,
        isLive: isLive,
      ),
    );
  }

  StepTrackingSnapshot _emitPlatformError(PlatformException error) {
    return _emitNativeError(error.code, error.message);
  }

  StepTrackingSnapshot _emitNativeError(String code, String? message) {
    if (code == 'STEPS_DENIED') {
      return _emitAccessDenied(StepAuthorizationStatus.denied);
    }
    if (code == 'STEPS_RESTRICTED') {
      return _emitAccessDenied(StepAuthorizationStatus.restricted);
    }
    if (code == 'STEPS_UNAVAILABLE') {
      return _emitUnsupported();
    }
    return _emitError(message ?? 'Langkah belum dapat dibaca.');
  }

  StepTrackingSnapshot _emitAccessDenied(
    StepAuthorizationStatus authorization,
  ) {
    return _emit(
      _current.copyWith(
        status: StepTrackingStatus.denied,
        authorization: authorization,
        updatedAt: DateTime.now(),
        message:
            'Izinkan akses Gerak & Kebugaran di Pengaturan untuk membaca langkah.',
        isLive: false,
      ),
    );
  }

  StepTrackingSnapshot _emitUnsupported() {
    return _emit(
      _current.copyWith(
        status: StepTrackingStatus.unsupported,
        authorization: StepAuthorizationStatus.unsupported,
        updatedAt: DateTime.now(),
        message: 'Penghitung langkah tidak tersedia di perangkat ini.',
        isLive: false,
      ),
    );
  }

  StepTrackingSnapshot _emitError(String message) {
    return _emit(
      _current.copyWith(
        status: StepTrackingStatus.error,
        updatedAt: DateTime.now(),
        message: message,
        isLive: false,
      ),
    );
  }

  StepTrackingSnapshot _emit(StepTrackingSnapshot snapshot) {
    if (_disposed) return _current;
    _current = snapshot;
    _snapshots.add(snapshot);
    return snapshot;
  }

  StepAuthorizationStatus _parseAuthorization(String? value) {
    return switch (value) {
      'notDetermined' => StepAuthorizationStatus.notDetermined,
      'restricted' => StepAuthorizationStatus.restricted,
      'denied' => StepAuthorizationStatus.denied,
      'authorized' => StepAuthorizationStatus.authorized,
      'unsupported' => StepAuthorizationStatus.unsupported,
      _ => StepAuthorizationStatus.unknown,
    };
  }
}
