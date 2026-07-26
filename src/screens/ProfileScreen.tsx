import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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

  const bmr = calculateBMR({ ...profile, weightKg: Number(weight) || 70, heightCm: Number(height) || 170, age: Number(age) || 26, gender, bodyType });
  const tdee = calculateTDEE({ ...profile, weightKg: Number(weight) || 70, heightCm: Number(height) || 170, age: Number(age) || 26, gender, bodyType });

  const handleOpenGoogleAIStudio = () => {
    Linking.openURL('https://aistudio.google.com/app/apikey');
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    await testConnection();
    setIsTestingKey(false);
  };

  const handleSaveApiKey = async () => {
    if (apiKeyInput.trim()) {
      await updateApiKey(apiKeyInput.trim());
      setSavedMsg('API Key berhasil disimpan & diuji.');
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
    updateProfile({
      name,
      age: parseInt(age, 10) || 26,
      gender,
      heightCm: parseFloat(height) || 170,
      weightKg: parseFloat(weight) || 70,
      targetWeightKg: parseFloat(targetWeight) || 65,
      bodyType,
      targetDeficitKcal: parseInt(targetDeficit, 10) || 500,
      fastingTargetHours: parseInt(fastingTarget, 10) || 16,
    });
    setSavedMsg('Profil berhasil diperbarui!');
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
              }}
              onPress={() => setThemeMode('system')}
            >
              <Smartphone size={16} color={themeMode === 'system' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: themeMode === 'system' ? '#FFFFFF' : colors.textSecondary }}>Sistem</Text>
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
              }}
              onPress={() => setThemeMode('dark')}
            >
              <Moon size={16} color={themeMode === 'dark' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: themeMode === 'dark' ? '#FFFFFF' : colors.textSecondary }}>Gelap</Text>
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
              }}
              onPress={() => setThemeMode('light')}
            >
              <Sun size={16} color={themeMode === 'light' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: themeMode === 'light' ? '#FFFFFF' : colors.textSecondary }}>Terang</Text>
            </TouchableOpacity>
          </View>
        </Surface>

        {/* AI Key Card */}
        <Surface style={{ padding: spacing.md, borderRadius: radius.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.xs }}>
            <Key size={18} color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>Google Gemini AI Cloud</Text>
          </View>
          <Text style={{ ...typography.caption, color: colors.textTertiary, marginBottom: spacing.md }}>{aiStatus.description}</Text>

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

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' }}
              onPress={handleSaveApiKey}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Simpan Key</Text>
            </TouchableOpacity>

            {userApiKey ? (
              <TouchableOpacity
                style={{ backgroundColor: colors.danger, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' }}
                onPress={handleDeleteApiKey}
              >
                <Trash2 size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </Surface>

        {/* Profile Card */}
        <Surface style={{ padding: spacing.md, borderRadius: radius.lg }}>
          <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}>Data Fisik Pengguna</Text>

          <View style={{ gap: spacing.sm }}>
            <Text style={{ ...typography.caption, color: colors.textTertiary }}>Nama</Text>
            <TextInput
              style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 13 }}
              value={name}
              onChangeText={setName}
            />

            <Text style={{ ...typography.caption, color: colors.textTertiary }}>Umur (Tahun)</Text>
            <TextInput
              style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 13 }}
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
            />

            <Text style={{ ...typography.caption, color: colors.textTertiary }}>Tinggi (cm)</Text>
            <TextInput
              style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 13 }}
              keyboardType="decimal-pad"
              value={height}
              onChangeText={setHeight}
            />

            <Text style={{ ...typography.caption, color: colors.textTertiary }}>Berat Badan (kg)</Text>
            <TextInput
              style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 13 }}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />

            <TouchableOpacity
              style={{ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md }}
              onPress={handleSaveProfile}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Simpan Perubahan Profil</Text>
            </TouchableOpacity>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};
