import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { calculateBMR, calculateTDEE, BODY_TYPE_INFO } from '../utils/calorieCalc';
import { getAIStatus } from '../services/aiService';
import { GlassCard } from '../components/GlassCard';
import { BodyType } from '../types';
import { Key, Save, CheckCircle2, Wifi, Activity, ExternalLink } from 'lucide-react-native';

export const ProfileScreen: React.FC = () => {
  const { profile, updateProfile } = useApp();

  const [name, setName] = useState<string>(profile.name);
  const [age, setAge] = useState<string>(profile.age.toString());
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender);
  const [height, setHeight] = useState<string>(profile.heightCm.toString());
  const [weight, setWeight] = useState<string>(profile.weightKg.toString());
  const [targetWeight, setTargetWeight] = useState<string>(profile.targetWeightKg.toString());
  const [bodyType, setBodyType] = useState<BodyType>(profile.bodyType || 'normal');
  const [targetDeficit, setTargetDeficit] = useState<string>(profile.targetDeficitKcal.toString());
  const [fastingTarget, setFastingTarget] = useState<string>((profile.fastingTargetHours || 16).toString());
  const [apiKey, setApiKey] = useState<string>(profile.geminiApiKey || '');
  const [savedMsg, setSavedMsg] = useState<string>('');

  const bmr = calculateBMR({ ...profile, weightKg: Number(weight) || 70, heightCm: Number(height) || 170, age: Number(age) || 26, gender, bodyType });
  const tdee = calculateTDEE({ ...profile, weightKg: Number(weight) || 70, heightCm: Number(height) || 170, age: Number(age) || 26, gender, bodyType });
  const aiStatus = getAIStatus(apiKey);

  const handleOpenGoogleAIStudio = () => {
    Linking.openURL('https://aistudio.google.com/app/apikey');
  };

  const handleSave = async () => {
    const parsedAge = Math.min(100, Math.max(10, parseInt(age, 10) || 26));
    const parsedHeight = Math.min(230, Math.max(100, parseInt(height, 10) || 170));
    const parsedWeight = Math.min(250, Math.max(30, parseFloat(weight) || 70));
    const parsedTargetWeight = Math.min(250, Math.max(30, parseFloat(targetWeight) || 65));
    const parsedDeficit = Math.min(1500, Math.max(100, parseInt(targetDeficit, 10) || 500));
    const parsedFastingTarget = Math.min(24, Math.max(8, parseInt(fastingTarget, 10) || 16));

    await updateProfile({
      name: name.trim() || 'Teman Diet',
      age: parsedAge,
      gender,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      targetWeightKg: parsedTargetWeight,
      bodyType,
      targetDeficitKcal: parsedDeficit,
      fastingTargetHours: parsedFastingTarget,
      geminiApiKey: apiKey.trim(),
    });

    setSavedMsg('✓ Pengaturan profil & metabolisme berhasil diperbarui!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle} numberOfLines={1}>PROFIL & PENGATURAN ENERGI</Text>
        <Text style={styles.screenSub}>
          Konfigurasi tipe metabolisme & data fisik untuk kalkulasi presisi BMR, TDEE, dan AI.
        </Text>

        {savedMsg !== '' && (
          <View style={styles.savedBanner}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={styles.savedText} numberOfLines={1}>{savedMsg}</Text>
          </View>
        )}

        {/* Calculated BMR & TDEE Metrics */}
        <GlassCard style={styles.metricsCard}>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel} numberOfLines={1}>BMR (ISTIRAHAT)</Text>
              <Text style={[styles.metricValue, { color: '#60A5FA' }]} numberOfLines={1}>{bmr} kcal</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel} numberOfLines={1}>TDEE (AKTIVITAS)</Text>
              <Text style={[styles.metricValue, { color: '#34D399' }]} numberOfLines={1}>{tdee} kcal</Text>
            </View>
          </View>
        </GlassCard>

        {/* 3 Tipe Metabolisme Berat Badan Selector */}
        <GlassCard>
          <View style={styles.headerRow}>
            <Activity size={16} color="#F59E0B" />
            <Text style={styles.sectionHeader} numberOfLines={1}>TIPE METABOLISME TUBUH</Text>
          </View>

          <View style={styles.bodyTypeGrid}>
            {(['easy_gain', 'normal', 'hard_gain'] as BodyType[]).map((typeKey) => {
              const info = BODY_TYPE_INFO[typeKey];
              const isSelected = bodyType === typeKey;
              return (
                <TouchableOpacity
                  key={typeKey}
                  style={[
                    styles.bodyTypeCard,
                    isSelected && {
                      backgroundColor: info.color + '20',
                      borderColor: info.color,
                    },
                  ]}
                  onPress={() => setBodyType(typeKey)}
                >
                  <Text style={styles.bodyTypeEmoji}>{info.emoji}</Text>
                  <Text
                    style={[
                      styles.bodyTypeLabel,
                      isSelected && { color: info.color, fontWeight: 'bold' },
                    ]}
                    numberOfLines={1}
                  >
                    {info.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.bodyTypeDesc}>
            💡 {BODY_TYPE_INFO[bodyType].desc}
          </Text>
        </GlassCard>

        {/* Profile Inputs */}
        <GlassCard>
          <Text style={styles.sectionHeader} numberOfLines={1}>PROFIL FISIK & TARGET</Text>

          <Text style={styles.label} numberOfLines={1}>NAMA PANGGILAN</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label} numberOfLines={1}>USIA (TAHUN)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} maxLength={3} />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label} numberOfLines={1}>GENDER</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                  onPress={() => setGender('male')}
                >
                  <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]} numberOfLines={1}>
                    Pria
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                  onPress={() => setGender('female')}
                >
                  <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]} numberOfLines={1}>
                    Wanita
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label} numberOfLines={1}>TINGGI (CM)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={height} onChangeText={setHeight} maxLength={3} />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label} numberOfLines={1}>BERAT (KG)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={weight} onChangeText={setWeight} maxLength={4} />
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label} numberOfLines={1}>TARGET DEFISIT (KCAL)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={targetDeficit}
                onChangeText={setTargetDeficit}
                maxLength={4}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label} numberOfLines={1}>TARGET PUASA (JAM)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={fastingTarget}
                onChangeText={setFastingTarget}
                maxLength={2}
              />
            </View>
          </View>
        </GlassCard>

        {/* Gemini API Key */}
        <GlassCard>
          <View style={styles.headerRow}>
            <Key size={16} color="#F59E0B" />
            <Text style={styles.sectionHeader} numberOfLines={1}>GEMINI AI API KEY</Text>
          </View>

          {/* AI Status Banner Container */}
          <View style={[styles.statusBanner, { backgroundColor: aiStatus.color + '15', borderColor: aiStatus.color + '30' }]}>
            <Wifi size={16} color={aiStatus.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: aiStatus.color }]} numberOfLines={1}>
                {aiStatus.modeLabel}
              </Text>
              <Text style={styles.statusDesc}>{aiStatus.description}</Text>
            </View>
          </View>

          {/* Create Free Gemini API Key Link Button */}
          <TouchableOpacity style={styles.createKeyLinkBtn} onPress={handleOpenGoogleAIStudio}>
            <Key size={14} color="#10B981" />
            <Text style={styles.createKeyLinkText} numberOfLines={1}>🔑 Buat API Key Gratis di Google AI Studio</Text>
            <ExternalLink size={12} color="#10B981" />
          </TouchableOpacity>

          <Text style={styles.hint}>
            Masukkan API Key Gemini AI milik Anda untuk mengaktifkan obrolan AI Coach Cloud.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="AIzaSy..."
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry={true}
          />
        </GlassCard>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Save size={18} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
    lineHeight: 16,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  savedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
    flex: 1,
  },
  metricsCard: {
    paddingVertical: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.8,
  },
  bodyTypeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  bodyTypeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bodyTypeEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  bodyTypeLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  bodyTypeDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusDesc: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
    lineHeight: 14,
  },
  createKeyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 10,
  },
  createKeyLinkText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10B981',
    flex: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#FFFFFF',
    fontSize: 13,
  },
  hint: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    lineHeight: 15,
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
  },
  gridItem: {
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 4,
  },
  genderBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  genderBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  genderText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  genderTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
