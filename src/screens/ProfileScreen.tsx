import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { calculateBMR, calculateTDEE } from '../utils/calorieCalc';
import { getAIStatus } from '../services/aiService';
import { GlassCard } from '../components/GlassCard';
import { Key, Save, CheckCircle2, Wifi, WifiOff } from 'lucide-react-native';

export const ProfileScreen: React.FC = () => {
  const { profile, updateProfile } = useApp();

  const [name, setName] = useState<string>(profile.name);
  const [age, setAge] = useState<string>(profile.age.toString());
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender);
  const [height, setHeight] = useState<string>(profile.heightCm.toString());
  const [weight, setWeight] = useState<string>(profile.weightKg.toString());
  const [targetWeight, setTargetWeight] = useState<string>(profile.targetWeightKg.toString());
  const [targetDeficit, setTargetDeficit] = useState<string>(profile.targetDeficitKcal.toString());
  const [bedtime, setBedtime] = useState<string>(profile.bedtimeHour.toString());
  const [apiKey, setApiKey] = useState<string>(profile.geminiApiKey || '');
  const [savedMsg, setSavedMsg] = useState<string>('');

  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(profile);
  const aiStatus = getAIStatus(apiKey);

  const handleSave = async () => {
    const parsedAge = Math.min(100, Math.max(10, parseInt(age, 10) || 26));
    const parsedHeight = Math.min(230, Math.max(100, parseInt(height, 10) || 170));
    const parsedWeight = Math.min(250, Math.max(30, parseFloat(weight) || 70));
    const parsedTargetWeight = Math.min(250, Math.max(30, parseFloat(targetWeight) || 65));
    const parsedDeficit = Math.min(1500, Math.max(100, parseInt(targetDeficit, 10) || 500));

    await updateProfile({
      name: name.trim() || 'Teman Diet',
      age: parsedAge,
      gender,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      targetWeightKg: parsedTargetWeight,
      targetDeficitKcal: parsedDeficit,
      bedtimeHour: parseInt(bedtime, 10) || 23,
      geminiApiKey: apiKey.trim(),
    });

    setSavedMsg('✓ Pengaturan profil & BMR berhasil diperbarui!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>PROFIL & PENGATURAN ENERGI</Text>
        <Text style={styles.screenSub}>
          Konfigurasi data fisik untuk kalkulasi presisi BMR, TDEE, dan API Key Gemini AI.
        </Text>

        {savedMsg !== '' && (
          <View style={styles.savedBanner}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={styles.savedText}>{savedMsg}</Text>
          </View>
        )}

        {/* Calculated BMR & TDEE Metrics */}
        <GlassCard style={styles.metricsCard}>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>BMR (ISTIRAHAT)</Text>
              <Text style={[styles.metricValue, { color: '#60A5FA' }]}>{bmr} kcal</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>TDEE (AKTIVITAS)</Text>
              <Text style={[styles.metricValue, { color: '#34D399' }]}>{tdee} kcal</Text>
            </View>
          </View>
        </GlassCard>

        {/* Profile Inputs */}
        <GlassCard>
          <Text style={styles.sectionHeader}>PROFIL FISIK</Text>

          <Text style={styles.label}>NAMA PANGGILAN</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>USIA (TAHUN)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} maxLength={3} />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>JENIS KELAMIN</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                  onPress={() => setGender('male')}
                >
                  <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                    Pria
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                  onPress={() => setGender('female')}
                >
                  <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                    Wanita
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>TINGGI (CM)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={height} onChangeText={setHeight} maxLength={3} />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>BERAT SAAT INI (KG)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={weight} onChangeText={setWeight} maxLength={4} />
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>TARGET BERAT (KG)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={targetWeight}
                onChangeText={setTargetWeight}
                maxLength={4}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>TARGET DEFISIT (KCAL)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={targetDeficit}
                onChangeText={setTargetDeficit}
                maxLength={4}
              />
            </View>
          </View>
        </GlassCard>

        {/* Gemini API Key */}
        <GlassCard>
          <View style={styles.headerRow}>
            <Key size={16} color="#F59E0B" />
            <Text style={styles.sectionHeader}>GEMINI AI API KEY</Text>
          </View>

          {/* AI Status Badge Container */}
          <View style={[styles.statusBanner, { backgroundColor: aiStatus.color + '15', borderColor: aiStatus.color + '30' }]}>
            {aiStatus.isOnline ? (
              <Wifi size={16} color="#10B981" />
            ) : (
              <WifiOff size={16} color="#F59E0B" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: aiStatus.color }]}>
                Status: {aiStatus.modeLabel}
              </Text>
              <Text style={styles.statusDesc}>{aiStatus.description}</Text>
            </View>
          </View>

          <Text style={styles.hint}>
            Masukkan API Key Gemini AI milik Anda (Gratis dari Google AI Studio) untuk mengaktifkan Mode Online Cloud.
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
    padding: 16,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
    lineHeight: 18,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  savedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  metricsCard: {
    paddingVertical: 14,
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
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusDesc: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  hint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 10,
    lineHeight: 16,
  },
  grid2: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  genderBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  genderText: {
    fontSize: 12,
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
    marginTop: 12,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
