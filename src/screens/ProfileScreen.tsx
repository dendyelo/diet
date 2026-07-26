import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useProfile, useAI, useTheme } from '../context/AppContext';
import { calculateBMR, calculateTDEE, BODY_TYPE_INFO } from '../utils/calorieCalc';
import { Surface } from '../components/Surface';
import { BodyType } from '../types';
import { Key, Save, CheckCircle2, Wifi, Activity, ExternalLink, RefreshCw, Trash2, Sun, Moon, Smartphone } from 'lucide-react-native';

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
  const [bodyType, setBodyType] = useState<BodyType>(profile.bodyType || 'normal');
  const [targetDeficit, setTargetDeficit] = useState<string>(profile.targetDeficitKcal.toString());
  const [fastingTarget, setFastingTarget] = useState<string>((profile.fastingTargetHours || 16).toString());
  const [apiKeyInput, setApiKeyInput] = useState<string>(userApiKey);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [savedMsg, setSavedMsg] = useState<string>('');

  useEffect(() => {
    setApiKeyInput(userApiKey);
  }, [userApiKey]);

  const parsedAge = Math.max(10, Math.min(100, parseInt(age, 10) || 26));
  const parsedHeight = Math.max(100, Math.min(230, parseFloat(height) || 170));
  const parsedWeight = Math.max(30, Math.min(250, parseFloat(weight) || 70));
  const parsedTargetWeight = Math.max(30, Math.min(250, parseFloat(targetWeight) || 65));
  const parsedTargetDeficit = Math.max(100, Math.min(1500, parseInt(targetDeficit, 10) || 500));
  const parsedFastingTarget = Math.max(8, Math.min(24, parseInt(fastingTarget, 10) || 16));

  const updatedProfileObj = {
    ...profile,
    name,
    age: parsedAge,
    gender,
    heightCm: parsedHeight,
    weightKg: parsedWeight,
    targetWeightKg: parsedTargetWeight,
    bodyType,
    targetDeficitKcal: parsedTargetDeficit,
    fastingTargetHours: parsedFastingTarget,
  };

  const bmr = calculateBMR(updatedProfileObj);
  const tdee = calculateTDEE(updatedProfileObj);

  const handleOpenGoogleAIStudio = () => {
    Linking.openURL('https://aistudio.google.com/app/apikey');
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    const connectionResult = await testConnection();
    setIsTestingKey(false);
    if (connectionResult === 'connected') {
      setSavedMsg('✓ Koneksi Gemini Cloud Berhasil!');
    } else {
      setSavedMsg('✕ Gagal terhubung ke Gemini AI Cloud.');
    }
    setTimeout(() => setSavedMsg(''), 4000);
  };

  const handleSaveApiKey = async () => {
    if (apiKeyInput.trim()) {
      await updateApiKey(apiKeyInput.trim());
      setSavedMsg('API Key berhasil disimpan.');
      setTimeout(() => setSavedMsg(''), 3000);
    }
  };

  const handleDeleteApiKey = async () => {
    await deleteApiKey();
    setApiKeyInput('');
    setSavedMsg('API Key berhasil dihapus.');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleSaveProfile = () => {
    updateProfile(updatedProfileObj);
    setSavedMsg('Profil & Target Kesehatan Berhasil Disimpan!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 100, gap: spacing.md }}>
        <Text style={{ ...typography.h1, color: colors.textPrimary, marginTop: 10 }}>Pengaturan & Profil</Text>

        {savedMsg ? (
          <View style={{ backgroundColor: colors.primarySubtle, padding: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary }}>
            <Text style={{ ...typography.bodyMedium, color: colors.primaryText, textAlign: 'center' }}>{savedMsg}</Text>
          </View>
        ) : null}

        {/* Theme Mode Preference Card */}
        <Surface style={{ padding: spacing.md, borderRadius: radius.lg }}>
          <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs }}>Tema Tampilan</Text>
          <Text style={{ ...typography.caption, color: colors.textTertiary, marginBottom: spacing.md }}>Pilih mode tema yang nyaman di mata</Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: radius.md,
                backgroundColor: themeMode === 'system' ? colors.primary : colors.surfaceElevated,
                borderWidth: 1,
                borderColor: themeMode === 'system' ? colors.primary : colors.divider,
                minHeight: 44,
              }}
              onPress={() => setThemeMode('system')}
            >
              <Smartphone size={16} color={themeMode === 'system' ? colors.onPrimary : colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: themeMode === 'system' ? colors.onPrimary : colors.textSecondary }}>Sistem</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: radius.md,
                backgroundColor: themeMode === 'dark' ? colors.primary : colors.surfaceElevated,
                borderWidth: 1,
                borderColor: themeMode === 'dark' ? colors.primary : colors.divider,
                minHeight: 44,
              }}
              onPress={() => setThemeMode('dark')}
            >
              <Moon size={16} color={themeMode === 'dark' ? colors.onPrimary : colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: themeMode === 'dark' ? colors.onPrimary : colors.textSecondary }}>Gelap</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: radius.md,
                backgroundColor: themeMode === 'light' ? colors.primary : colors.surfaceElevated,
                borderWidth: 1,
                borderColor: themeMode === 'light' ? colors.primary : colors.divider,
                minHeight: 44,
              }}
              onPress={() => setThemeMode('light')}
            >
              <Sun size={16} color={themeMode === 'light' ? colors.onPrimary : colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: themeMode === 'light' ? colors.onPrimary : colors.textSecondary }}>Terang</Text>
            </TouchableOpacity>
          </View>
        </Surface>

        {/* Gemini AI Key Card */}
        <Surface style={{ padding: spacing.md, borderRadius: radius.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.xs }}>
            <Key size={18} color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>Google Gemini AI Cloud</Text>
          </View>
          <Text style={{ ...typography.caption, color: colors.textTertiary, marginBottom: spacing.sm }}>
            {aiStatus.description}
          </Text>

          {/* Status Indicator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceElevated, padding: 10, borderRadius: radius.sm, marginBottom: spacing.md }}>
            <Wifi size={16} color={aiStatus.isOnline ? colors.success : colors.warning} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: aiStatus.isOnline ? colors.success : colors.warning, flex: 1 }}>
              {aiStatus.modeLabel}
            </Text>
          </View>

          <TextInput
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.divider,
              paddingHorizontal: 14,
              paddingVertical: 10,
              color: colors.textPrimary,
              fontSize: 13,
              marginBottom: spacing.md,
            }}
            placeholder="Tempel Gemini API Key (AIzaSy...)"
            placeholderTextColor={colors.textTertiary}
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            secureTextEntry={true}
          />

          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}
                onPress={handleSaveApiKey}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.onPrimary }}>Simpan Key</Text>
              </TouchableOpacity>

              {userApiKey ? (
                <>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: colors.infoSubtle, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, minHeight: 44 }}
                    onPress={handleTestConnection}
                    disabled={isTestingKey}
                  >
                    {isTestingKey ? <ActivityIndicator size="small" color={colors.info} /> : <RefreshCw size={14} color={colors.info} />}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.info }}>Tes Koneksi</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ backgroundColor: colors.dangerSubtle, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', minHeight: 44 }}
                    onPress={handleDeleteApiKey}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </>
              ) : null}
            </View>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingTop: 4 }}
              onPress={handleOpenGoogleAIStudio}
            >
              <ExternalLink size={14} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primaryText }}>
                Buat API Key Gratis di Google AI Studio
              </Text>
            </TouchableOpacity>
          </View>
        </Surface>

        {/* Calculated Metabolism BMR / TDEE Card */}
        <Surface style={{ padding: spacing.md, borderRadius: radius.lg }}>
          <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs }}>Estimasi Metabolisme (BMR & TDEE)</Text>
          <Text style={{ ...typography.caption, color: colors.textTertiary, marginBottom: spacing.md }}>
            Dihitung berdasarkan usia, tinggi, berat, gender, dan tipe tubuhmu.
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1, backgroundColor: colors.surfaceElevated, padding: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase' }}>BMR (Istirahat)</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.primary, marginTop: 2 }}>{bmr} kcal</Text>
            </View>

            <View style={{ flex: 1, backgroundColor: colors.surfaceElevated, padding: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase' }}>TDEE (Total Harian)</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.info, marginTop: 2 }}>{tdee} kcal</Text>
            </View>
          </View>
        </Surface>

        {/* Profile & Health Goals Form */}
        <Surface style={{ padding: spacing.md, borderRadius: radius.lg }}>
          <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}>Data Fisik & Target Kesehatan</Text>

          <View style={{ gap: spacing.md }}>
            {/* Name */}
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>Nama Pengguna</Text>
              <TextInput
                style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 13, minHeight: 44 }}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Gender Selection */}
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>Jenis Kelamin</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', backgroundColor: gender === 'male' ? colors.primary : colors.surfaceElevated, borderWidth: 1, borderColor: gender === 'male' ? colors.primary : colors.divider, minHeight: 44 }}
                  onPress={() => setGender('male')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: gender === 'male' ? colors.onPrimary : colors.textSecondary }}>Laki-laki 👨</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', backgroundColor: gender === 'female' ? colors.primary : colors.surfaceElevated, borderWidth: 1, borderColor: gender === 'female' ? colors.primary : colors.divider, minHeight: 44 }}
                  onPress={() => setGender('female')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: gender === 'female' ? colors.onPrimary : colors.textSecondary }}>Perempuan 👩</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Physical Stats Row */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.caption, color: colors.textTertiary }}>Umur (10-100)</Text>
                <TextInput
                  style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 13, minHeight: 44 }}
                  keyboardType="number-pad"
                  value={age}
                  onChangeText={setAge}
                />
              </View>

              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.caption, color: colors.textTertiary }}>Tinggi (100-230 cm)</Text>
                <TextInput
                  style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 13, minHeight: 44 }}
                  keyboardType="decimal-pad"
                  value={height}
                  onChangeText={setHeight}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.caption, color: colors.textTertiary }}>Berat Saat Ini (kg)</Text>
                <TextInput
                  style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 13, minHeight: 44 }}
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>

              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.caption, color: colors.textTertiary }}>Target Berat (kg)</Text>
                <TextInput
                  style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 13, minHeight: 44 }}
                  keyboardType="decimal-pad"
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                />
              </View>
            </View>

            {/* Body Type Selection */}
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>Tipe Tubuh / Aktivitas</Text>
              <View style={{ gap: spacing.xs }}>
                {(['easy_gain', 'normal', 'hard_gain'] as BodyType[]).map((bt) => {
                  const info = BODY_TYPE_INFO[bt];
                  return (
                    <TouchableOpacity
                      key={bt}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        padding: 10,
                        borderRadius: radius.md,
                        backgroundColor: bodyType === bt ? colors.surfaceElevated : 'transparent',
                        borderWidth: 1,
                        borderColor: bodyType === bt ? colors.primary : colors.divider,
                        minHeight: 44,
                      }}
                      onPress={() => setBodyType(bt)}
                    >
                      <Text style={{ fontSize: 16 }}>{info.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>{info.label}</Text>
                        <Text style={{ fontSize: 10, color: colors.textTertiary }}>{info.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Target Deficit & Fasting Target */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.caption, color: colors.textTertiary }}>Target Defisit (kcal)</Text>
                <TextInput
                  style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 12, paddingVertical: 10, color: colors.primaryText, fontSize: 13, fontWeight: 'bold', minHeight: 44 }}
                  keyboardType="number-pad"
                  value={targetDeficit}
                  onChangeText={setTargetDeficit}
                />
              </View>

              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={{ ...typography.caption, color: colors.textTertiary }}>Target Puasa (Jam)</Text>
                <TextInput
                  style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 13, minHeight: 44 }}
                  keyboardType="number-pad"
                  value={fastingTarget}
                  onChangeText={setFastingTarget}
                />
              </View>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm, minHeight: 44, justifyContent: 'center' }}
              onPress={handleSaveProfile}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onPrimary }}>Simpan Perubahan Profil & Target</Text>
            </TouchableOpacity>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};
