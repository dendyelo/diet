import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../storage/api_key_vault.dart';
import '../storage/key_value_store.dart';

/// Read-only snapshot of data left by the Expo/React Native application.
///
/// [geminiApiKey] is intentionally kept separate from [values] so it can move
/// directly from the iOS Keychain to [ApiKeyVault].
final class LegacyIosStorageSnapshot {
  const LegacyIosStorageSnapshot({
    this.values = const <String, String>{},
    this.geminiApiKey,
  });

  final Map<String, String> values;
  final String? geminiApiKey;
}

abstract interface class LegacyIosStorageReader {
  Future<LegacyIosStorageSnapshot> read();
}

/// Bridges to the read-only importer implemented by the iOS runner.
///
/// Other platforms and development installs without the channel simply return
/// an empty snapshot.
final class MethodChannelLegacyIosStorageReader
    implements LegacyIosStorageReader {
  const MethodChannelLegacyIosStorageReader([
    this._channel = const MethodChannel('app.habitdiet/legacy-migration'),
  ]);

  final MethodChannel _channel;

  @override
  Future<LegacyIosStorageSnapshot> read() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) {
      return const LegacyIosStorageSnapshot();
    }
    try {
      final raw = await _channel.invokeMapMethod<Object?, Object?>(
        'readLegacyStorage',
      );
      if (raw == null) return const LegacyIosStorageSnapshot();

      final values = <String, String>{};
      final rawValues = raw['values'];
      if (rawValues is Map) {
        for (final entry in rawValues.entries) {
          final key = entry.key;
          final value = entry.value;
          if (key is String &&
              value is String &&
              key.startsWith(LegacyIosMigration.legacyPrefix)) {
            values[key] = value;
          }
        }
      }

      final secureValue = raw['geminiApiKey'];
      return LegacyIosStorageSnapshot(
        values: values,
        geminiApiKey: secureValue is String ? secureValue : null,
      );
    } on MissingPluginException {
      return const LegacyIosStorageSnapshot();
    } on PlatformException {
      return const LegacyIosStorageSnapshot();
    } on FlutterError catch (error) {
      if (error.toString().contains('Binding has not yet been initialized')) {
        return const LegacyIosStorageSnapshot();
      }
      rethrow;
    } on StateError catch (error) {
      if (error.message.toString().contains('ServicesBinding')) {
        return const LegacyIosStorageSnapshot();
      }
      rethrow;
    }
  }
}

/// Seeds the Flutter migration inputs exactly once, before [AppStorage]
/// converts them to its current schema.
///
/// Legacy native files are only read. They are never moved, changed, or
/// deleted, which keeps a rollback to the Expo build possible.
final class LegacyIosMigration {
  factory LegacyIosMigration({
    required KeyValueStore preferences,
    required ApiKeyVault apiKeys,
    required LegacyIosStorageReader reader,
  }) => LegacyIosMigration._(preferences, apiKeys, reader);

  LegacyIosMigration._(this._preferences, this._apiKeys, this._reader);

  static const schemaKey = 'habitdiet.schema';
  static const legacyPrefix = '@habitdiet_';
  static const legacyProfileKey = '@habitdiet_user_profile';

  final KeyValueStore _preferences;
  final ApiKeyVault _apiKeys;
  final LegacyIosStorageReader _reader;

  /// Returns whether a native snapshot was considered for import.
  Future<bool> seedIfFlutterSchemaAbsent() async {
    if (await _preferences.getString(schemaKey) != null) return false;

    final snapshot = await _reader.read();
    final values = Map<String, String>.fromEntries(
      snapshot.values.entries.where(
        (entry) => entry.key.startsWith(legacyPrefix),
      ),
    );

    final embeddedKey = _sanitizeLegacyProfile(values);
    final nativeKey = snapshot.geminiApiKey?.trim() ?? '';
    final candidateKey = nativeKey.isNotEmpty ? nativeKey : embeddedKey;

    if (candidateKey.isNotEmpty &&
        (await _apiKeys.read('google-ai-studio')).isEmpty) {
      await _apiKeys.write('google-ai-studio', candidateKey);
    }

    for (final entry in values.entries) {
      if (await _preferences.getString(entry.key) == null) {
        await _preferences.setString(entry.key, entry.value);
      }
    }
    return true;
  }

  /// Removes an old in-profile API key before the profile can touch
  /// SharedPreferences. A malformed profile is dropped because it cannot be
  /// safely proven secret-free and AppStorage would reject it anyway.
  static String _sanitizeLegacyProfile(Map<String, String> values) {
    final raw = values[legacyProfileKey];
    if (raw == null) return '';

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) {
        values.remove(legacyProfileKey);
        return '';
      }
      final profile = Map<String, dynamic>.from(decoded);
      final embeddedKey = profile.remove('geminiApiKey');
      values[legacyProfileKey] = jsonEncode(profile);
      return embeddedKey is String ? embeddedKey.trim() : '';
    } on FormatException {
      values.remove(legacyProfileKey);
      return '';
    }
  }
}
