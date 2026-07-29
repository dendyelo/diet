import 'package:diet/data/ai/ai_provider.dart';
import 'package:diet/data/ai/ai_models.dart';
import 'package:diet/data/storage/key_value_store.dart';

final class FakeKeyValueStore implements KeyValueStore {
  FakeKeyValueStore([Map<String, String>? initial])
    : values = <String, String>{...?initial};

  final Map<String, String> values;
  bool failNextWrite = false;

  @override
  Future<Set<String>> getKeys() async => values.keys.toSet();

  @override
  Future<String?> getString(String key) async => values[key];

  @override
  Future<void> remove(String key) async {
    values.remove(key);
  }

  @override
  Future<void> setString(String key, String value) async {
    if (failNextWrite) {
      failNextWrite = false;
      throw StateError('simulated write failure');
    }
    values[key] = value;
  }
}

final class FakeSecureValueStore implements SecureValueStore {
  final Map<String, String> values = <String, String>{};
  bool throwOnRead = false;

  @override
  Future<void> delete(String key) async {
    values.remove(key);
  }

  @override
  Future<String?> read(String key) async {
    if (throwOnRead) throw StateError('simulated secure storage failure');
    return values[key];
  }

  @override
  Future<void> write(String key, String value) async {
    values[key] = value;
  }
}

typedef ProviderHandler =
    Future<AiTextResponse> Function({
      required AiProviderConfig config,
      required String model,
      required String apiKey,
      required AiGenerationRequest request,
      required Duration timeout,
    });

final class FakeAiProvider implements AiProvider {
  FakeAiProvider(this.handler);

  final ProviderHandler handler;
  final List<String> attemptedModels = <String>[];
  final List<Duration> receivedTimeouts = <Duration>[];

  @override
  Future<AiTextResponse> generate({
    required AiProviderConfig config,
    required String model,
    required String apiKey,
    required AiGenerationRequest request,
    required Duration timeout,
  }) {
    attemptedModels.add(model);
    receivedTimeouts.add(timeout);
    return handler(
      config: config,
      model: model,
      apiKey: apiKey,
      request: request,
      timeout: timeout,
    );
  }
}
