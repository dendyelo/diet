import 'dart:convert';

import 'package:diet/data/ai/ai_models.dart';
import 'package:diet/data/ai/ai_provider.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  const request = AiGenerationRequest(
    systemPrompt: 'System',
    userPrompt: 'User',
    responseSchema: <String, Object?>{'type': 'OBJECT'},
  );

  test(
    'Google provider sends the secret in a header and parses text',
    () async {
      late http.Request captured;
      final provider = GoogleAiStudioProvider(
        MockClient((http.Request request) async {
          captured = request;
          return http.Response(
            jsonEncode(<String, Object?>{
              'candidates': <Object?>[
                <String, Object?>{
                  'content': <String, Object?>{
                    'parts': <Object?>[
                      <String, Object?>{'text': '{"ok":true}'},
                    ],
                  },
                },
              ],
            }),
            200,
          );
        }),
      );

      final response = await provider.generate(
        config: defaultGoogleAiStudioConfig,
        model: 'gemini-test',
        apiKey: 'top-secret',
        request: request,
        timeout: const Duration(seconds: 1),
      );

      expect(response.text, '{"ok":true}');
      expect(captured.url.host, 'generativelanguage.googleapis.com');
      expect(captured.headers['x-goog-api-key'], 'top-secret');
      expect(captured.url.query, isNot(contains('top-secret')));
      expect(captured.body, isNot(contains('top-secret')));
    },
  );

  test('Gemma receives system guidance inside the user prompt', () async {
    late Map<String, Object?> capturedBody;
    final provider = GoogleAiStudioProvider(
      MockClient((http.Request request) async {
        capturedBody = Map<String, Object?>.from(
          jsonDecode(request.body) as Map,
        );
        return http.Response(
          '{"candidates":[{"content":{"parts":[{"text":"OK"}]}}]}',
          200,
        );
      }),
    );

    await provider.generate(
      config: defaultGoogleAiStudioConfig,
      model: 'gemma-4-31b-it',
      apiKey: 'key',
      request: request,
      timeout: const Duration(seconds: 1),
    );

    expect(capturedBody, isNot(contains('systemInstruction')));
    expect(jsonEncode(capturedBody), contains('System'));
    expect(jsonEncode(capturedBody), contains('User'));
  });

  test('OpenAI-compatible provider uses the configured v1 endpoint', () async {
    late http.Request captured;
    final provider = OpenAiCompatibleProvider(
      MockClient((http.Request request) async {
        captured = request;
        return http.Response(
          '{"choices":[{"message":{"content":"{\\"ok\\":true}"}}]}',
          200,
        );
      }),
    );
    const config = AiProviderConfig(
      id: 'compatible',
      label: 'Compatible',
      kind: AiProviderKind.openAiCompatible,
      baseUrl: 'https://provider.example/v1',
      models: <String>['model'],
    );

    final response = await provider.generate(
      config: config,
      model: 'model',
      apiKey: 'secret',
      request: request,
      timeout: const Duration(seconds: 1),
    );

    expect(response.text, '{"ok":true}');
    expect(captured.url.path, '/v1/chat/completions');
    expect(captured.headers['authorization'], 'Bearer secret');
  });

  test('permission errors do not masquerade as invalid API keys', () async {
    final provider = GoogleAiStudioProvider(
      MockClient(
        (_) async => http.Response(
          '{"error":{"message":"model is not available for this project"}}',
          403,
        ),
      ),
    );

    await expectLater(
      provider.generate(
        config: defaultGoogleAiStudioConfig,
        model: 'unavailable',
        apiKey: 'key',
        request: request,
        timeout: const Duration(seconds: 1),
      ),
      throwsA(
        isA<AiProviderFailure>().having(
          (error) => error.kind,
          'kind',
          AiFailureKind.unavailable,
        ),
      ),
    );
  });
}
