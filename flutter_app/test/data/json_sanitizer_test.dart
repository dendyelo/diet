import 'package:diet/data/ai/json_sanitizer.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('extracts a balanced JSON object without swallowing trailing text', () {
    final result = extractJsonObject(
      'Jawaban: {"message":"kurung } di string","value":2} setelahnya {rusak}',
    );

    expect(result, <String, Object?>{
      'message': 'kurung } di string',
      'value': 2,
    });
  });

  test('rejects arrays and malformed JSON', () {
    expect(extractJsonObject('[{"value": 1}]'), isNull);
    expect(extractJsonObject('```json\n{broken}\n```'), isNull);
  });
}
