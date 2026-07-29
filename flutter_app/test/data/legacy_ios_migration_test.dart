import 'dart:convert';

import 'package:diet/data/data.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes.dart';

final class FakeLegacyIosStorageReader implements LegacyIosStorageReader {
  FakeLegacyIosStorageReader(this.snapshot);

  final LegacyIosStorageSnapshot snapshot;
  int readCount = 0;

  @override
  Future<LegacyIosStorageSnapshot> read() async {
    readCount += 1;
    return snapshot;
  }
}

void main() {
  group('LegacyIosMigration', () {
    test(
      'moves only HabitDiet data and sends secrets straight to secure storage',
      () async {
        final preferences = FakeKeyValueStore();
        final secure = FakeSecureValueStore();
        final reader = FakeLegacyIosStorageReader(
          LegacyIosStorageSnapshot(
            values: <String, String>{
              '@habitdiet_user_profile': jsonEncode(<String, Object?>{
                'name': 'Dendy',
                'weightKg': 72,
                'geminiApiKey': 'old-profile-secret',
              }),
              '@habitdiet_meal_logs': '[]',
              'unrelated.preference': 'must-not-migrate',
            },
            geminiApiKey: ' keychain-secret ',
          ),
        );

        final considered = await LegacyIosMigration(
          preferences: preferences,
          apiKeys: ApiKeyVault(store: secure),
          reader: reader,
        ).seedIfFlutterSchemaAbsent();

        expect(considered, isTrue);
        expect(reader.readCount, 1);
        expect(preferences.values['unrelated.preference'], isNull);
        expect(
          jsonDecode(preferences.values['@habitdiet_user_profile']!)
              as Map<String, dynamic>,
          isNot(contains('geminiApiKey')),
        );
        expect(
          await ApiKeyVault(store: secure).read('google-ai-studio'),
          'keychain-secret',
        );
        expect(
          preferences.values.values.join(),
          isNot(contains('keychain-secret')),
        );
        expect(
          preferences.values.values.join(),
          isNot(contains('old-profile-secret')),
        );
      },
    );

    test(
      'does not read legacy native storage after Flutter schema exists',
      () async {
        final preferences = FakeKeyValueStore(<String, String>{
          LegacyIosMigration.schemaKey: '${AppStorage.schemaVersion}',
        });
        final reader = FakeLegacyIosStorageReader(
          const LegacyIosStorageSnapshot(
            values: <String, String>{'@habitdiet_meal_logs': '[]'},
            geminiApiKey: 'must-not-be-read',
          ),
        );
        final secure = FakeSecureValueStore();

        final considered = await LegacyIosMigration(
          preferences: preferences,
          apiKeys: ApiKeyVault(store: secure),
          reader: reader,
        ).seedIfFlutterSchemaAbsent();

        expect(considered, isFalse);
        expect(reader.readCount, 0);
        expect(secure.values, isEmpty);
        expect(preferences.values['@habitdiet_meal_logs'], isNull);
      },
    );

    test('preserves an API key already saved by Flutter', () async {
      final preferences = FakeKeyValueStore();
      final secure = FakeSecureValueStore();
      final vault = ApiKeyVault(store: secure);
      await vault.write('google-ai-studio', 'flutter-key');
      final reader = FakeLegacyIosStorageReader(
        LegacyIosStorageSnapshot(
          values: <String, String>{
            '@habitdiet_user_profile': jsonEncode(<String, Object?>{
              'name': 'Dendy',
              'geminiApiKey': 'profile-key',
            }),
          },
          geminiApiKey: 'expo-key',
        ),
      );

      await LegacyIosMigration(
        preferences: preferences,
        apiKeys: vault,
        reader: reader,
      ).seedIfFlutterSchemaAbsent();

      expect(await vault.read('google-ai-studio'), 'flutter-key');
      expect(preferences.values.values.join(), isNot(contains('profile-key')));
      expect(preferences.values.values.join(), isNot(contains('expo-key')));
    });

    test(
      'drops a malformed profile instead of persisting unknown secrets',
      () async {
        final preferences = FakeKeyValueStore();
        final reader = FakeLegacyIosStorageReader(
          const LegacyIosStorageSnapshot(
            values: <String, String>{
              '@habitdiet_user_profile': '{"geminiApiKey":"possibly-secret"',
              '@habitdiet_meal_logs': '[]',
            },
          ),
        );

        await LegacyIosMigration(
          preferences: preferences,
          apiKeys: ApiKeyVault(store: FakeSecureValueStore()),
          reader: reader,
        ).seedIfFlutterSchemaAbsent();

        expect(preferences.values['@habitdiet_user_profile'], isNull);
        expect(preferences.values['@habitdiet_meal_logs'], '[]');
        expect(
          preferences.values.values.join(),
          isNot(contains('possibly-secret')),
        );
      },
    );

    test(
      'AppStorage imports before converting to the current schema',
      () async {
        final day = DateTime(2026, 7, 28, 12);
        final preferences = FakeKeyValueStore();
        final secure = FakeSecureValueStore();
        final reader = FakeLegacyIosStorageReader(
          LegacyIosStorageSnapshot(
            values: <String, String>{
              '@habitdiet_user_profile': jsonEncode(<String, Object?>{
                'name': 'Pengguna Expo',
                'weightKg': 74,
              }),
              '@habitdiet_meal_logs': jsonEncode(<Object?>[
                <String, Object?>{
                  'id': 'expo-meal',
                  'timestamp': day.toIso8601String(),
                  'name': 'Makan siang',
                  'isSnack': false,
                  'source': 'manual',
                  'nutrition': <String, Object?>{'calories': 510},
                },
              ]),
            },
            geminiApiKey: 'secure-expo-key',
          ),
        );

        final storage = await AppStorage.initialize(
          preferences: preferences,
          apiKeys: ApiKeyVault(store: secure),
          legacyIosReader: reader,
        );

        expect((await storage.loadProfile()).name, 'Pengguna Expo');
        expect(await storage.loadMeals(day: day), hasLength(1));
        expect(
          preferences.values[LegacyIosMigration.schemaKey],
          '${AppStorage.schemaVersion}',
        );
        expect(
          await storage.apiKeys.read('google-ai-studio'),
          'secure-expo-key',
        );
        expect(
          preferences.values.values.join(),
          isNot(contains('secure-expo-key')),
        );
        expect(reader.readCount, 1);
      },
    );
  });
}
