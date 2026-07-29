import 'dart:convert';

Map<String, Object?>? extractJsonObject(String rawText) {
  var text = rawText.trim();
  text = text.replaceFirst(
    RegExp(r'^```(?:json)?\s*', caseSensitive: false),
    '',
  );
  text = text.replaceFirst(RegExp(r'\s*```$'), '');

  final direct = _decodeObject(text);
  if (direct != null) return direct;
  if (text.startsWith('[')) return null;

  var inString = false;
  var escaped = false;
  var depth = 0;
  var start = -1;

  for (var index = 0; index < text.length; index += 1) {
    final char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char == '\\') {
        escaped = true;
      } else if (char == '"') {
        inString = false;
      }
      continue;
    }

    if (char == '"') {
      inString = true;
    } else if (char == '{') {
      if (depth == 0) start = index;
      depth += 1;
    } else if (char == '}' && depth > 0) {
      depth -= 1;
      if (depth == 0 && start >= 0) {
        final decoded = _decodeObject(text.substring(start, index + 1));
        if (decoded != null) return decoded;
        start = -1;
      }
    }
  }
  return null;
}

Map<String, Object?>? decodeStoredObject(String? raw) {
  if (raw == null || raw.trim().isEmpty) return null;
  try {
    final value = jsonDecode(raw);
    if (value is Map) return Map<String, Object?>.from(value);
  } on FormatException {
    return null;
  }
  return null;
}

List<Object?> decodeStoredList(String? raw) {
  if (raw == null || raw.trim().isEmpty) return const <Object?>[];
  try {
    final value = jsonDecode(raw);
    return value is List ? List<Object?>.from(value) : const <Object?>[];
  } on FormatException {
    return const <Object?>[];
  }
}

double cleanNumber(
  Object? value, {
  double fallback = 0,
  double min = 0,
  double max = double.infinity,
}) {
  final number = value is num ? value.toDouble() : double.tryParse('$value');
  if (number == null || !number.isFinite) return fallback;
  return number.clamp(min, max).toDouble();
}

int cleanInt(
  Object? value, {
  int fallback = 0,
  int min = 0,
  int max = 2147483647,
}) {
  final number = value is num ? value.toInt() : int.tryParse('$value');
  if (number == null) return fallback;
  return number.clamp(min, max);
}

String cleanText(Object? value, {String fallback = '', int maxLength = 200}) {
  if (value is! String) return fallback;
  final clean = value.replaceAll(RegExp(r'\s+'), ' ').trim();
  if (clean.isEmpty) return fallback;
  return clean.length <= maxLength ? clean : clean.substring(0, maxLength);
}

DateTime? cleanDateTime(Object? value) {
  if (value is! String) return null;
  return DateTime.tryParse(value)?.toLocal();
}

Map<String, Object?>? _decodeObject(String text) {
  try {
    final value = jsonDecode(text);
    return value is Map ? Map<String, Object?>.from(value) : null;
  } on FormatException {
    return null;
  }
}
