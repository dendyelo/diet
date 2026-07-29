import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'ai_models.dart';

enum AiFailureKind {
  invalidKey,
  rateLimited,
  unavailable,
  timeout,
  malformedResponse,
}

final class AiProviderFailure implements Exception {
  const AiProviderFailure(this.kind, [this.message = '']);

  final AiFailureKind kind;
  final String message;

  @override
  String toString() => 'AiProviderFailure(${kind.name}, $message)';
}

final class AiGenerationRequest {
  const AiGenerationRequest({
    required this.systemPrompt,
    required this.userPrompt,
    this.responseSchema,
    this.maxOutputTokens = 700,
  });

  final String systemPrompt;
  final String userPrompt;
  final Map<String, Object?>? responseSchema;
  final int maxOutputTokens;
}

final class AiTextResponse {
  const AiTextResponse({
    required this.text,
    required this.model,
    required this.providerId,
  });

  final String text;
  final String model;
  final String providerId;
}

abstract interface class AiProvider {
  Future<AiTextResponse> generate({
    required AiProviderConfig config,
    required String model,
    required String apiKey,
    required AiGenerationRequest request,
    required Duration timeout,
  });
}

final class GoogleAiStudioProvider implements AiProvider {
  GoogleAiStudioProvider([http.Client? client])
    : _client = client ?? http.Client();

  final http.Client _client;

  @override
  Future<AiTextResponse> generate({
    required AiProviderConfig config,
    required String model,
    required String apiKey,
    required AiGenerationRequest request,
    required Duration timeout,
  }) async {
    final uri = Uri.https(
      'generativelanguage.googleapis.com',
      '/v1beta/models/${Uri.encodeComponent(model)}:generateContent',
    );
    final generationConfig = <String, Object?>{
      'maxOutputTokens': request.maxOutputTokens.clamp(1, 4096),
      if (model.startsWith('gemini-3'))
        'thinkingConfig': <String, Object?>{'thinkingLevel': 'minimal'}
      else if (model.startsWith('gemini-'))
        'thinkingConfig': <String, Object?>{'thinkingBudget': 0},
      if (request.responseSchema != null && !model.startsWith('gemma-')) ...{
        'responseMimeType': 'application/json',
        'responseSchema': request.responseSchema,
      },
    };
    final isGemma = model.startsWith('gemma-');
    final body = <String, Object?>{
      if (!isGemma)
        'systemInstruction': <String, Object?>{
          'parts': <Object?>[
            <String, Object?>{'text': request.systemPrompt},
          ],
        },
      'contents': <Object?>[
        <String, Object?>{
          'role': 'user',
          'parts': <Object?>[
            <String, Object?>{
              'text': isGemma
                  ? '${request.systemPrompt}\n\n${request.userPrompt}'
                  : request.userPrompt,
            },
          ],
        },
      ],
      'generationConfig': generationConfig,
    };

    final response = await _post(
      _client,
      uri,
      headers: <String, String>{
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: jsonEncode(body),
      timeout: timeout,
    );
    _throwForStatus(response);

    Object? decoded;
    try {
      decoded = jsonDecode(response.body);
    } on FormatException {
      throw const AiProviderFailure(
        AiFailureKind.malformedResponse,
        'Respons Google bukan JSON.',
      );
    }
    final text = _extractGoogleText(decoded);
    if (text.isEmpty) {
      throw const AiProviderFailure(
        AiFailureKind.malformedResponse,
        'Respons Google tidak berisi teks.',
      );
    }
    return AiTextResponse(text: text, model: model, providerId: config.id);
  }
}

final class OpenAiCompatibleProvider implements AiProvider {
  OpenAiCompatibleProvider([http.Client? client])
    : _client = client ?? http.Client();

  final http.Client _client;

  @override
  Future<AiTextResponse> generate({
    required AiProviderConfig config,
    required String model,
    required String apiKey,
    required AiGenerationRequest request,
    required Duration timeout,
  }) async {
    if (config.baseUrl == null || config.baseUrl!.trim().isEmpty) {
      throw const AiProviderFailure(
        AiFailureKind.unavailable,
        'Base URL provider belum diatur.',
      );
    }
    final base = Uri.parse(config.baseUrl!);
    final apiRootPath = base.path.isEmpty || base.path == '/'
        ? '/v1'
        : base.path.replaceFirst(RegExp(r'/$'), '');
    final uri = base.path.endsWith('/chat/completions')
        ? base
        : base.replace(path: '$apiRootPath/chat/completions');
    final schemaHint = request.responseSchema == null
        ? ''
        : '\nKembalikan satu objek JSON valid tanpa markdown yang mengikuti skema ini:\n'
              '${jsonEncode(request.responseSchema)}';
    final response = await _post(
      _client,
      uri,
      headers: <String, String>{
        'content-type': 'application/json',
        'authorization': 'Bearer $apiKey',
      },
      body: jsonEncode(<String, Object?>{
        'model': model,
        'max_tokens': request.maxOutputTokens.clamp(1, 4096),
        'messages': <Object?>[
          <String, Object?>{
            'role': 'system',
            'content': '${request.systemPrompt}$schemaHint',
          },
          <String, Object?>{'role': 'user', 'content': request.userPrompt},
        ],
      }),
      timeout: timeout,
    );
    _throwForStatus(response);

    Object? decoded;
    try {
      decoded = jsonDecode(response.body);
    } on FormatException {
      throw const AiProviderFailure(
        AiFailureKind.malformedResponse,
        'Respons provider bukan JSON.',
      );
    }
    final text = _extractOpenAiText(decoded);
    if (text.isEmpty) {
      throw const AiProviderFailure(
        AiFailureKind.malformedResponse,
        'Respons provider tidak berisi teks.',
      );
    }
    return AiTextResponse(text: text, model: model, providerId: config.id);
  }
}

Future<http.Response> _post(
  http.Client client,
  Uri uri, {
  required Map<String, String> headers,
  required String body,
  required Duration timeout,
}) async {
  try {
    // The timeout is the remaining portion of AiService's one global deadline.
    return await client
        .post(uri, headers: headers, body: body)
        .timeout(
          timeout,
          onTimeout: () => throw const AiProviderFailure(AiFailureKind.timeout),
        );
  } on AiProviderFailure {
    rethrow;
  } catch (error) {
    throw AiProviderFailure(AiFailureKind.unavailable, '$error');
  }
}

void _throwForStatus(http.Response response) {
  if (response.statusCode >= 200 && response.statusCode < 300) return;
  final normalizedBody = response.body.toLowerCase();
  final explicitlyInvalidKey =
      normalizedBody.contains('api_key_invalid') ||
      normalizedBody.contains('api key not valid') ||
      normalizedBody.contains('invalid api key');
  if (response.statusCode == 401 ||
      ((response.statusCode == 400 || response.statusCode == 403) &&
          explicitlyInvalidKey)) {
    throw const AiProviderFailure(AiFailureKind.invalidKey);
  }
  if (response.statusCode == 429) {
    throw const AiProviderFailure(AiFailureKind.rateLimited);
  }
  throw AiProviderFailure(
    AiFailureKind.unavailable,
    'HTTP ${response.statusCode}',
  );
}

String _extractGoogleText(Object? value) {
  if (value is! Map) return '';
  final candidates = value['candidates'];
  if (candidates is! List || candidates.isEmpty || candidates.first is! Map) {
    return '';
  }
  final content = (candidates.first as Map)['content'];
  if (content is! Map || content['parts'] is! List) return '';
  return (content['parts'] as List)
      .whereType<Map>()
      .map((part) => part['text'])
      .whereType<String>()
      .join()
      .trim();
}

String _extractOpenAiText(Object? value) {
  if (value is! Map) return '';
  final choices = value['choices'];
  if (choices is! List || choices.isEmpty || choices.first is! Map) return '';
  final message = (choices.first as Map)['message'];
  if (message is! Map) return '';
  final content = message['content'];
  if (content is String) return content.trim();
  if (content is List) {
    return content
        .whereType<Map>()
        .map((part) => part['text'])
        .whereType<String>()
        .join()
        .trim();
  }
  return '';
}
