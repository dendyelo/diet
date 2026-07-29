import 'key_value_store.dart';

/// API secrets never enter SharedPreferences or JSON exports.
final class ApiKeyVault {
  ApiKeyVault({SecureValueStore? store})
    : _store = store ?? const PlatformSecureValueStore();

  final SecureValueStore _store;

  static const _prefix = 'habitdiet.ai.key.';

  Future<String> read(String providerId) async {
    final value = await _store.read(_key(providerId));
    return value?.trim() ?? '';
  }

  Future<void> write(String providerId, String apiKey) async {
    final clean = apiKey.trim();
    if (clean.isEmpty) {
      await delete(providerId);
      return;
    }
    await _store.write(_key(providerId), clean);
  }

  Future<void> delete(String providerId) => _store.delete(_key(providerId));

  String _key(String providerId) {
    final clean = providerId.trim().toLowerCase().replaceAll(
      RegExp('[^a-z0-9._-]'),
      '_',
    );
    if (clean.isEmpty) {
      throw ArgumentError.value(providerId, 'providerId', 'Tidak valid');
    }
    final end = clean.length.clamp(0, 80);
    return '$_prefix${clean.substring(0, end)}';
  }
}
