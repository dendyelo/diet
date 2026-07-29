enum AiProviderKind { googleAiStudio, openAiCompatible }

enum AiConnectionStatus {
  notConfigured,
  checking,
  connected,
  invalidKey,
  rateLimited,
  offline,
}

final class AiProviderConfig {
  const AiProviderConfig({
    required this.id,
    required this.label,
    required this.kind,
    required this.models,
    this.baseUrl,
    this.enabled = true,
  });

  final String id;
  final String label;
  final AiProviderKind kind;
  final String? baseUrl;
  final List<String> models;
  final bool enabled;

  Map<String, Object?> toJson() => <String, Object?>{
    'id': id,
    'label': label,
    'kind': kind.name,
    'baseUrl': baseUrl,
    'models': models,
    'enabled': enabled,
  };

  static AiProviderConfig? fromJson(Object? value) {
    if (value is! Map) return null;
    final map = Map<String, Object?>.from(value);
    final id = _cleanText(map['id'], maxLength: 80);
    final label = _cleanText(map['label'], maxLength: 80);
    final kind = AiProviderKind.values
        .where((item) => item.name == map['kind'])
        .firstOrNull;
    final models = map['models'] is List
        ? (map['models']! as List)
              .map((item) => _cleanText(item, maxLength: 100))
              .where((item) => item.isNotEmpty)
              .toSet()
              .take(30)
              .toList(growable: false)
        : const <String>[];
    final baseUrl = _cleanText(map['baseUrl'], maxLength: 500);

    if (id.isEmpty || label.isEmpty || kind == null || models.isEmpty) {
      return null;
    }
    if (kind == AiProviderKind.openAiCompatible && !_isSafeHttpUrl(baseUrl)) {
      return null;
    }

    return AiProviderConfig(
      id: id,
      label: label,
      kind: kind,
      baseUrl: baseUrl.isEmpty ? null : baseUrl,
      models: models,
      enabled: map['enabled'] is bool ? map['enabled']! as bool : true,
    );
  }
}

const List<String> defaultGoogleModels = <String>[
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemma-4-31b-it',
  'gemma-4-26b-a4b-it',
];

const AiProviderConfig defaultGoogleAiStudioConfig = AiProviderConfig(
  id: 'google-ai-studio',
  label: 'Google AI Studio',
  kind: AiProviderKind.googleAiStudio,
  models: defaultGoogleModels,
);

enum AiConfidence { high, medium, low }

final class MealItemEstimate {
  const MealItemEstimate({required this.name, required this.calories});

  final String name;
  final double calories;
}

final class MealAnalysis {
  const MealAnalysis({
    required this.name,
    required this.calories,
    required this.proteinGrams,
    required this.carbsGrams,
    required this.fatGrams,
    required this.fiberGrams,
    required this.confidence,
    required this.items,
    required this.isOnlineAi,
    this.notes,
    this.model,
    this.providerId,
  });

  final String name;
  final double calories;
  final double proteinGrams;
  final double carbsGrams;
  final double fatGrams;
  final double fiberGrams;
  final AiConfidence confidence;
  final List<MealItemEstimate> items;
  final bool isOnlineAi;
  final String? notes;
  final String? model;
  final String? providerId;
}

enum AiSuggestedAction { meal, snack, water, checkin, none }

final class CoachMessage {
  const CoachMessage({
    required this.message,
    required this.followUps,
    required this.recommendedAction,
    this.safetyNote,
    this.model,
    this.providerId,
  });

  final String message;
  final List<String> followUps;
  final AiSuggestedAction recommendedAction;
  final String? safetyNote;
  final String? model;
  final String? providerId;
}

final class DailyInsight {
  const DailyInsight({
    required this.headline,
    required this.body,
    required this.recommendedAction,
    required this.suggestedPrompt,
    this.model,
    this.providerId,
  });

  final String headline;
  final String body;
  final AiSuggestedAction recommendedAction;
  final String suggestedPrompt;
  final String? model;
  final String? providerId;
}

String _cleanText(Object? value, {required int maxLength}) {
  if (value is! String) return '';
  final clean = value.replaceAll(RegExp(r'\s+'), ' ').trim();
  return clean.length <= maxLength ? clean : clean.substring(0, maxLength);
}

bool _isSafeHttpUrl(String value) {
  final uri = Uri.tryParse(value);
  return uri != null &&
      (uri.scheme == 'https' ||
          (uri.scheme == 'http' &&
              (uri.host == 'localhost' || uri.host == '127.0.0.1'))) &&
      uri.host.isNotEmpty &&
      !uri.hasQuery &&
      !uri.hasFragment;
}
