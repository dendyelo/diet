import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TextInputProps } from 'react-native';
import { Surface } from '../components/Surface';
import { useAI, useProfile, useTheme } from '../context/AppContext';
import type { ThemeMode } from '../context/ThemeContext';
import type { ColorTokens } from '../theme/colors';
import type { ActivityLevel, BodyType } from '../types';
import {
  ACTIVITY_MULTIPLIERS,
  BODY_TYPE_INFO,
  BODY_TYPE_MULTIPLIERS,
  calculateBMR,
  calculateEffectiveDeficit,
  calculateTDEE,
} from '../utils/calorieCalc';

const THEME_OPTIONS: ReadonlyArray<TextOption<ThemeMode>> = [
  { value: 'system', label: 'Sistem' },
  { value: 'dark', label: 'Gelap' },
  { value: 'light', label: 'Terang' },
];

const GENDER_OPTIONS: ReadonlyArray<TextOption<'male' | 'female'>> = [
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' },
];

const ACTIVITY_OPTIONS: ReadonlyArray<TextOption<ActivityLevel>> = [
  { value: 'sedentary', label: 'Minimal' },
  { value: 'light', label: 'Ringan' },
  { value: 'moderate', label: 'Sedang' },
  { value: 'active', label: 'Aktif' },
  { value: 'very_active', label: 'Sangat aktif' },
];

const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: 'Sebagian besar hari dihabiskan dengan duduk.',
  light: 'Bergerak ringan atau olahraga 1–3 hari per minggu.',
  moderate: 'Olahraga rutin 3–5 hari per minggu.',
  active: 'Aktif atau olahraga intens hampir setiap hari.',
  very_active: 'Aktivitas fisik berat dan konsisten setiap hari.',
};

const BODY_TYPE_OPTIONS: ReadonlyArray<TextOption<BodyType>> = [
  { value: 'easy_gain', label: 'Mudah naik' },
  { value: 'normal', label: 'Seimbang' },
  { value: 'hard_gain', label: 'Sulit naik' },
];

const DEFICIT_OPTIONS: ReadonlyArray<TextOption<string>> = [
  { value: '250', label: 'Ringan · 250' },
  { value: '500', label: 'Standar · 500' },
  { value: '750', label: 'Tinggi · 750' },
  { value: '1000', label: 'Maks · 1.000' },
];

interface TextOption<T extends string> {
  value: T;
  label: string;
}

interface TextSegmentedControlProps<T extends string> {
  value: T;
  options: ReadonlyArray<TextOption<T>>;
  onChange: (value: T) => void;
  colors: ColorTokens;
  radiusValue: number;
  accessibilityLabel: string;
}

function TextSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  colors,
  radiusValue,
  accessibilityLabel,
}: TextSegmentedControlProps<T>) {
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 3,
        borderRadius: radiusValue,
        backgroundColor: colors.surfaceElevated,
      }}
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <TouchableOpacity
            key={option.value}
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              borderRadius: Math.max(8, radiusValue - 3),
              backgroundColor: isSelected ? colors.surface : 'transparent',
              borderWidth: isSelected ? 1 : 0,
              borderColor: colors.divider,
            }}
            activeOpacity={0.72}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={{
                color: isSelected ? colors.textPrimary : colors.textTertiary,
                fontSize: 12,
                fontWeight: isSelected ? '700' : '600',
              }}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface TextChoiceGroupProps<T extends string> {
  value: T;
  options: ReadonlyArray<TextOption<T>>;
  onChange: (value: T) => void;
  colors: ColorTokens;
  radiusValue: number;
  accessibilityLabel: string;
}

function TextChoiceGroup<T extends string>({
  value,
  options,
  onChange,
  colors,
  radiusValue,
  accessibilityLabel,
}: TextChoiceGroupProps<T>) {
  return (
    <View
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <TouchableOpacity
            key={option.value}
            style={{
              minHeight: 40,
              justifyContent: 'center',
              paddingHorizontal: 14,
              borderRadius: radiusValue,
              backgroundColor: isSelected ? colors.primarySubtle : colors.surfaceElevated,
              borderWidth: 1,
              borderColor: isSelected ? colors.primary : colors.divider,
            }}
            activeOpacity={0.72}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={{
                color: isSelected ? colors.primaryText : colors.textSecondary,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface ProfileFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  colors: ColorTokens;
  radiusValue: number;
}

const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  colors,
  radiusValue,
  ...inputProps
}) => (
  <View style={{ gap: 7 }}>
    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    <TextInput
      {...inputProps}
      style={{
        minHeight: 46,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radiusValue,
        borderWidth: 1,
        borderColor: colors.divider,
        backgroundColor: colors.surfaceElevated,
        color: colors.textPrimary,
        fontSize: 14,
      }}
      placeholderTextColor={colors.textTertiary}
      selectionColor={colors.primary}
    />
  </View>
);

export const ProfileScreen: React.FC = () => {
  const { profile, updateProfile } = useProfile();
  const { userApiKey, aiStatus, updateApiKey, deleteApiKey, testConnection } = useAI();
  const { themeMode, setThemeMode, colors, spacing, radius, typography } = useTheme();

  const [name, setName] = useState<string>(profile.name);
  const [age, setAge] = useState<string>(profile.age.toString());
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender);
  const [height, setHeight] = useState<string>(profile.heightCm.toString());
  const [weight, setWeight] = useState<string>(profile.weightKg.toString());
  const [targetWeight, setTargetWeight] = useState<string>(profile.targetWeightKg.toString());
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel || 'light');
  const [bodyType, setBodyType] = useState<BodyType>(profile.bodyType || 'normal');
  const [targetDeficit, setTargetDeficit] = useState<string>(profile.targetDeficitKcal.toString());
  const [apiKeyInput, setApiKeyInput] = useState<string>(userApiKey);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [savedMsg, setSavedMsg] = useState<string>('');
  const [isDataExpanded, setIsDataExpanded] = useState<boolean>(false);
  const [isTargetExpanded, setIsTargetExpanded] = useState<boolean>(false);
  const [isAIExpanded, setIsAIExpanded] = useState<boolean>(false);

  useEffect(() => {
    setApiKeyInput(userApiKey);
  }, [userApiKey]);

  const parsedAge = Math.max(10, Math.min(100, parseInt(age, 10) || 26));
  const parsedHeight = Math.max(100, Math.min(230, parseFloat(height) || 170));
  const parsedWeight = Math.max(30, Math.min(250, parseFloat(weight) || 70));
  const parsedTargetWeight = Math.max(30, Math.min(250, parseFloat(targetWeight) || 65));
  const parsedTargetDeficit = Math.max(
    100,
    Math.min(1000, parseInt(targetDeficit, 10) || 500)
  );

  const updatedProfileObj = {
    ...profile,
    name,
    age: parsedAge,
    gender,
    heightCm: parsedHeight,
    weightKg: parsedWeight,
    targetWeightKg: parsedTargetWeight,
    activityLevel,
    bodyType,
    targetDeficitKcal: parsedTargetDeficit,
  };

  const bmr = calculateBMR(updatedProfileObj);
  const tdee = calculateTDEE(updatedProfileObj);
  const effectiveDeficit = calculateEffectiveDeficit(updatedProfileObj, tdee);
  const previewCalorieTarget = tdee - effectiveDeficit;
  const initial = name.trim().charAt(0).toUpperCase() || 'S';

  const showMessage = (message: string, duration = 3000) => {
    setSavedMsg(message);
    setTimeout(() => setSavedMsg(''), duration);
  };

  const handleOpenGoogleAIStudio = () => {
    Linking.openURL('https://aistudio.google.com/app/apikey');
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    const connectionResult = await testConnection();
    setIsTestingKey(false);

    if (connectionResult === 'connected') {
      showMessage('Koneksi Gemini berhasil.', 4000);
    } else {
      showMessage('Gemini belum dapat terhubung.', 4000);
    }
  };

  const handleSaveApiKey = async () => {
    if (apiKeyInput.trim()) {
      await updateApiKey(apiKeyInput.trim());
      showMessage('API key disimpan.');
    }
  };

  const handleDeleteApiKey = async () => {
    await deleteApiKey();
    setApiKeyInput('');
    showMessage('API key dihapus.');
  };

  const handleSaveData = async () => {
    await updateProfile({
      name,
      age: parsedAge,
      gender,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      activityLevel,
      bodyType,
    });
    showMessage('Data tubuh diperbarui.');
  };

  const handleSaveTargets = async () => {
    await updateProfile({
      targetWeightKg: parsedTargetWeight,
      targetDeficitKcal: parsedTargetDeficit,
    });
    showMessage('Target dan rencana diperbarui.');
  };

  const sectionLabelStyle = {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '700' as const,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: 112,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingVertical: spacing.sm, gap: 3 }}>
          <Text
            style={{
              ...typography.h1,
              color: colors.textPrimary,
              fontSize: 30,
              lineHeight: 36,
              letterSpacing: -0.7,
            }}
          >
            Saya
          </Text>
          <Text style={{ ...typography.body, color: colors.textTertiary }}>
            Profil, target, dan preferensi.
          </Text>
        </View>

        {savedMsg ? (
          <View
            style={{
              minHeight: 42,
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.primarySubtle,
              borderWidth: 1,
              borderColor: colors.primary,
            }}
            accessibilityLiveRegion="polite"
          >
            <Text
              style={{
                ...typography.bodyMedium,
                color: colors.primaryText,
                textAlign: 'center',
              }}
            >
              {savedMsg}
            </Text>
          </View>
        ) : null}

        <Surface style={{ padding: spacing.lg, marginVertical: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <View
              style={{
                width: 48,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.full,
                backgroundColor: colors.primarySubtle,
              }}
            >
              <Text style={{ color: colors.primaryText, fontSize: 18, fontWeight: '700' }}>
                {initial}
              </Text>
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  ...typography.h2,
                  color: colors.textPrimary,
                  letterSpacing: -0.2,
                }}
                numberOfLines={1}
              >
                {name.trim() || 'Tanpa nama'}
              </Text>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                {parsedWeight} kg menuju {parsedTargetWeight} kg
              </Text>
            </View>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: colors.divider,
              marginVertical: spacing.md,
            }}
          />

          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                Saat istirahat
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 20,
                  lineHeight: 25,
                  fontWeight: '700',
                  letterSpacing: -0.35,
                }}
              >
                {bmr}
                <Text style={{ ...typography.caption, color: colors.textTertiary }}> kkal</Text>
              </Text>
            </View>

            <View style={{ width: 1, backgroundColor: colors.divider, marginHorizontal: spacing.md }} />

            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                Total harian
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 20,
                  lineHeight: 25,
                  fontWeight: '700',
                  letterSpacing: -0.35,
                }}
              >
                {tdee}
                <Text style={{ ...typography.caption, color: colors.textTertiary }}> kkal</Text>
              </Text>
            </View>
          </View>
        </Surface>

        <Surface style={{ padding: spacing.md, marginVertical: 0 }}>
          <Text style={{ ...sectionLabelStyle, marginBottom: spacing.sm }}>Tampilan</Text>
          <TextSegmentedControl
            value={themeMode}
            options={THEME_OPTIONS}
            onChange={(mode) => {
              void setThemeMode(mode);
            }}
            colors={colors}
            radiusValue={radius.md}
            accessibilityLabel="Pilih tema tampilan"
          />
        </Surface>

        <Surface
          style={{
            padding: 0,
            marginVertical: 0,
            overflow: 'hidden',
          }}
        >
          <TouchableOpacity
            style={{
              minHeight: 72,
              paddingHorizontal: spacing.md,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
            activeOpacity={0.7}
            onPress={() => setIsDataExpanded((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel="Data tubuh"
            accessibilityState={{ expanded: isDataExpanded }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={sectionLabelStyle}>Data tubuh</Text>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                Identitas, ukuran, dan pola aktivitas
              </Text>
            </View>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 22,
                lineHeight: 24,
                fontWeight: '300',
              }}
            >
              {isDataExpanded ? '⌄' : '›'}
            </Text>
          </TouchableOpacity>

          {isDataExpanded ? (
            <>
              <View style={{ height: 1, backgroundColor: colors.divider }} />
              <View style={{ padding: spacing.md, gap: spacing.lg }}>
                <ProfileField
                  label="Nama"
                  value={name}
                  onChangeText={setName}
                  colors={colors}
                  radiusValue={radius.md}
                  autoCapitalize="words"
                  returnKeyType="done"
                />

                <View style={{ gap: 8 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    Jenis kelamin
                  </Text>
                  <TextSegmentedControl
                    value={gender}
                    options={GENDER_OPTIONS}
                    onChange={setGender}
                    colors={colors}
                    radiusValue={radius.md}
                    accessibilityLabel="Pilih jenis kelamin"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <ProfileField
                      label="Usia"
                      value={age}
                      onChangeText={setAge}
                      colors={colors}
                      radiusValue={radius.md}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ProfileField
                      label="Tinggi (cm)"
                      value={height}
                      onChangeText={setHeight}
                      colors={colors}
                      radiusValue={radius.md}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                <ProfileField
                  label="Berat kini (kg)"
                  value={weight}
                  onChangeText={setWeight}
                  colors={colors}
                  radiusValue={radius.md}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />

                <View style={{ gap: 9 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    Aktivitas harian
                  </Text>
                  <TextChoiceGroup
                    value={activityLevel}
                    options={ACTIVITY_OPTIONS}
                    onChange={setActivityLevel}
                    colors={colors}
                    radiusValue={radius.full}
                    accessibilityLabel="Pilih aktivitas harian"
                  />
                  <Text style={{ ...typography.caption, color: colors.textTertiary, lineHeight: 17 }}>
                    {ACTIVITY_DESCRIPTIONS[activityLevel]} Pilihan ini membentuk perkiraan kebutuhan harian yang terkumpul bertahap sepanjang hari. Langkah di atas baseline dan aktivitas tercatat menjadi tambahan.
                  </Text>
                </View>

                <View style={{ gap: 9 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    Respons tubuh
                  </Text>
                  <TextChoiceGroup
                    value={bodyType}
                    options={BODY_TYPE_OPTIONS}
                    onChange={setBodyType}
                    colors={colors}
                    radiusValue={radius.full}
                    accessibilityLabel="Pilih respons tubuh"
                  />
                  <Text style={{ ...typography.caption, color: colors.textTertiary, lineHeight: 17 }}>
                    {BODY_TYPE_INFO[bodyType].desc} Penyesuaiannya sekitar 5% dan ikut terkumpul bertahap sepanjang hari.
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    minHeight: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.md,
                    backgroundColor: colors.primary,
                  }}
                  activeOpacity={0.78}
                  onPress={handleSaveData}
                  accessibilityRole="button"
                  accessibilityLabel="Simpan data tubuh"
                >
                  <Text style={{ color: colors.onPrimary, fontSize: 14, fontWeight: '700' }}>
                    Simpan data tubuh
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </Surface>

        <Surface
          style={{
            padding: 0,
            marginVertical: 0,
            overflow: 'hidden',
          }}
        >
          <TouchableOpacity
            style={{
              minHeight: 72,
              paddingHorizontal: spacing.md,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
            activeOpacity={0.7}
            onPress={() => setIsTargetExpanded((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel="Target dan rencana"
            accessibilityState={{ expanded: isTargetExpanded }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={sectionLabelStyle}>Target & rencana</Text>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                Berat tujuan, batas diet, dan timer puasa
              </Text>
            </View>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 22,
                lineHeight: 24,
                fontWeight: '300',
              }}
            >
              {isTargetExpanded ? '⌄' : '›'}
            </Text>
          </TouchableOpacity>

          {isTargetExpanded ? (
            <>
              <View style={{ height: 1, backgroundColor: colors.divider }} />
              <View style={{ padding: spacing.md, gap: spacing.lg }}>
                <ProfileField
                  label="Berat yang ingin dicapai (kg)"
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  colors={colors}
                  radiusValue={radius.md}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />

                <View
                  style={{
                    padding: spacing.md,
                    gap: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.divider,
                    backgroundColor: colors.surfaceElevated,
                  }}
                >
                  <View style={{ gap: 4 }}>
                    <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                      ASAL NILAI KEBUTUHAN
                    </Text>
                    <Text style={{ ...typography.h3, color: colors.textPrimary }}>
                      Sekitar {tdee.toLocaleString('id-ID')} kkal per hari
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.textTertiary, lineHeight: 17 }}>
                      Perkiraan dasar dihitung dari data tubuh, aktivitas yang dipilih, dan respons tubuh.
                    </Text>
                  </View>

                  <View
                    accessibilityLabel={`BMR ${bmr}, dikali aktivitas ${ACTIVITY_MULTIPLIERS[activityLevel]}, dikali respons tubuh ${BODY_TYPE_MULTIPLIERS[bodyType]}, hasil kebutuhan ${tdee} kilokalori`}
                    style={{
                      padding: 12,
                      gap: 10,
                      borderRadius: radius.sm,
                      backgroundColor: colors.surface,
                    }}
                  >
                    {[
                      ['BMR dari tubuh', `${bmr.toLocaleString('id-ID')} kkal`],
                      [
                        `Aktivitas ${ACTIVITY_OPTIONS.find((option) => option.value === activityLevel)?.label || ''}`,
                        `× ${ACTIVITY_MULTIPLIERS[activityLevel]}`,
                      ],
                      [
                        `Respons ${BODY_TYPE_OPTIONS.find((option) => option.value === bodyType)?.label || ''}`,
                        `× ${BODY_TYPE_MULTIPLIERS[bodyType].toFixed(2)}`,
                      ],
                      ['Perkiraan kebutuhan', `${tdee.toLocaleString('id-ID')} kkal`],
                    ].map(([label, value], index) => (
                      <View
                        key={label}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: spacing.sm,
                          paddingTop: index === 3 ? 10 : 0,
                          borderTopWidth: index === 3 ? 1 : 0,
                          borderTopColor: colors.divider,
                        }}
                      >
                        <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                          {label}
                        </Text>
                        <Text
                          style={{
                            ...typography.caption,
                            color: index === 3 ? colors.textPrimary : colors.textTertiary,
                            fontWeight: index === 3 ? '700' : '600',
                          }}
                        >
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text style={{ ...typography.caption, color: colors.textTertiary, lineHeight: 17 }}>
                    BMR berasal dari berat, tinggi, usia, dan jenis kelamin. Pada halaman Hari ini, kebutuhan dapat naik lagi dari langkah di atas baseline atau aktivitas yang benar-benar dicatat.
                  </Text>
                </View>

                <View
                  style={{
                    padding: spacing.md,
                    gap: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.divider,
                    backgroundColor: colors.surfaceElevated,
                  }}
                >
                  <View style={{ gap: 4 }}>
                    <Text style={{ ...typography.overline, color: colors.primaryText }}>
                      RENCANA DIET
                    </Text>
                    <Text style={{ ...typography.h3, color: colors.textPrimary }}>
                      Batas makan {previewCalorieTarget.toLocaleString('id-ID')} kkal
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.textTertiary, lineHeight: 17 }}>
                      Pilih seberapa jauh batas makan berada di bawah perkiraan kebutuhan harian.
                    </Text>
                  </View>

                  <TextChoiceGroup
                    value={targetDeficit}
                    options={DEFICIT_OPTIONS}
                    onChange={setTargetDeficit}
                    colors={colors}
                    radiusValue={radius.full}
                    accessibilityLabel="Pilih tingkat defisit kalori"
                  />

                  <View
                    accessibilityLabel={`Perkiraan kebutuhan ${tdee} dikurangi defisit efektif ${effectiveDeficit}, batas diet ${previewCalorieTarget} kilokalori`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: radius.sm,
                      backgroundColor: colors.surface,
                    }}
                  >
                    {[
                      ['Kebutuhan', tdee],
                      ['Dikurangi', effectiveDeficit],
                      ['Batas diet', previewCalorieTarget],
                    ].map(([label, value], index) => (
                      <React.Fragment key={label as string}>
                        {index > 0 ? (
                          <Text style={{ color: colors.textTertiary, fontSize: 18 }}>
                            {index === 1 ? '−' : '='}
                          </Text>
                        ) : null}
                        <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                          <Text
                            style={{
                              color: colors.textPrimary,
                              fontSize: 15,
                              fontWeight: '700',
                            }}
                          >
                            {(value as number).toLocaleString('id-ID')}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              color: colors.textTertiary,
                              fontSize: 10,
                              fontWeight: '600',
                            }}
                          >
                            {label as string}
                          </Text>
                        </View>
                      </React.Fragment>
                    ))}
                  </View>

                  <Text style={{ ...typography.caption, color: colors.textTertiary, lineHeight: 17 }}>
                    Angka ini menjadi batas rencana diet, bukan jumlah yang wajib dihabiskan. Pilihan 500 berarti batas makan sekitar 500 kkal di bawah kebutuhan.
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    minHeight: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.md,
                    backgroundColor: colors.primary,
                  }}
                  activeOpacity={0.78}
                  onPress={handleSaveTargets}
                  accessibilityRole="button"
                  accessibilityLabel="Simpan target dan rencana"
                >
                  <Text style={{ color: colors.onPrimary, fontSize: 14, fontWeight: '700' }}>
                    Simpan target & rencana
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </Surface>

        <Surface
          style={{
            padding: 0,
            marginVertical: 0,
            overflow: 'hidden',
          }}
        >
          <TouchableOpacity
            style={{
              minHeight: 72,
              paddingHorizontal: spacing.md,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
            activeOpacity={0.7}
            onPress={() => setIsAIExpanded((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel="AI dan privasi"
            accessibilityState={{ expanded: isAIExpanded }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={sectionLabelStyle}>AI & privasi</Text>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                {aiStatus.modeLabel}
              </Text>
            </View>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 22,
                lineHeight: 24,
                fontWeight: '300',
              }}
            >
              {isAIExpanded ? '⌄' : '›'}
            </Text>
          </TouchableOpacity>

          {isAIExpanded ? (
            <>
              <View style={{ height: 1, backgroundColor: colors.divider }} />
              <View style={{ padding: spacing.md, gap: spacing.md }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 9,
                    padding: 12,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceElevated,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: radius.full,
                      backgroundColor: aiStatus.isOnline ? colors.success : colors.warning,
                    }}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        ...typography.bodyMedium,
                        color: colors.textPrimary,
                      }}
                    >
                      {aiStatus.modeLabel}
                    </Text>
                    <Text
                      style={{
                        ...typography.caption,
                        color: colors.textTertiary,
                        lineHeight: 17,
                      }}
                    >
                      {aiStatus.description}
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 7 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                    Gemini API key
                  </Text>
                  <TextInput
                    style={{
                      minHeight: 46,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.divider,
                      backgroundColor: colors.surfaceElevated,
                      color: colors.textPrimary,
                      fontSize: 14,
                    }}
                    placeholder="Tempel API key"
                    placeholderTextColor={colors.textTertiary}
                    selectionColor={colors.primary}
                    value={apiKeyInput}
                    onChangeText={setApiKeyInput}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                  <Text
                    style={{
                      ...typography.caption,
                      color: colors.textTertiary,
                      lineHeight: 17,
                    }}
                  >
                    {Platform.OS === 'web'
                      ? 'Prototipe web menyimpan key hanya selama sesi tab. Untuk produksi, gunakan proxy backend agar key tidak berada di browser. Data fitur dikirim ke Gemini saat AI dipakai.'
                      : 'Di iOS dan Android, key disimpan dengan penyimpanan aman OS (Keychain/Keystore). Ringkasan, pertanyaan Coach, dan deskripsi makanan dikirim ke Gemini saat AI dipakai.'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      minHeight: 46,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radius.md,
                      backgroundColor: colors.primary,
                      opacity: apiKeyInput.trim() ? 1 : 0.45,
                    }}
                    activeOpacity={0.78}
                    onPress={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Simpan Gemini API key"
                  >
                    <Text style={{ color: colors.onPrimary, fontSize: 13, fontWeight: '700' }}>
                      Simpan key
                    </Text>
                  </TouchableOpacity>

                  {userApiKey ? (
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        minHeight: 46,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: colors.divider,
                        backgroundColor: colors.surfaceElevated,
                        opacity: isTestingKey ? 0.65 : 1,
                      }}
                      activeOpacity={0.72}
                      onPress={handleTestConnection}
                      disabled={isTestingKey}
                      accessibilityRole="button"
                      accessibilityLabel="Tes koneksi Gemini"
                    >
                      {isTestingKey ? (
                        <ActivityIndicator size="small" color={colors.primaryText} />
                      ) : null}
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 13,
                          fontWeight: '700',
                        }}
                      >
                        {isTestingKey ? 'Menguji' : 'Tes koneksi'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: spacing.md,
                  }}
                >
                  <TouchableOpacity
                    style={{ minHeight: 40, justifyContent: 'center' }}
                    activeOpacity={0.7}
                    onPress={handleOpenGoogleAIStudio}
                    accessibilityRole="link"
                    accessibilityLabel="Buka Google AI Studio"
                  >
                    <Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '600' }}>
                      Buka Google AI Studio ↗
                    </Text>
                  </TouchableOpacity>

                  {userApiKey ? (
                    <TouchableOpacity
                      style={{ minHeight: 40, justifyContent: 'center' }}
                      activeOpacity={0.7}
                      onPress={handleDeleteApiKey}
                      accessibilityRole="button"
                      accessibilityLabel="Hapus Gemini API key"
                    >
                      <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>
                        Hapus key
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </>
          ) : null}
        </Surface>

        <Text
          style={{
            ...typography.caption,
            color: colors.textTertiary,
            textAlign: 'center',
            lineHeight: 17,
          }}
        >
          Perubahan aktivitas dan respons tubuh langsung memperbarui estimasi energi.
        </Text>
      </ScrollView>
    </View>
  );
};
