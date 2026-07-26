import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { parseFoodNutritionWithAI } from '../services/aiService';
import { GlassCard } from '../components/GlassCard';
import { Sparkles, Utensils, Sliders, CheckCircle2 } from 'lucide-react-native';

export const LoggerScreen: React.FC = () => {
  const { profile, addMealLog } = useApp();

  const [inputMode, setInputMode] = useState<'ai' | 'manual'>('ai');
  const [foodText, setFoodText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Manual input state
  const [manualName, setManualName] = useState<string>('');
  const [calories, setCalories] = useState<string>('450');
  const [protein, setProtein] = useState<string>('25');
  const [carbs, setCarbs] = useState<string>('50');
  const [fat, setFat] = useState<string>('15');

  const handleAILog = async () => {
    if (!foodText.trim()) return;

    setLoading(true);
    setSuccessMsg('');
    try {
      const result = await parseFoodNutritionWithAI(foodText, profile.geminiApiKey);
      await addMealLog(result.name, false, result.nutrition, undefined, undefined, 'ai');
      setFoodText('');
      setSuccessMsg(`✓ "${result.name}" (${result.nutrition.calories} kcal) berhasil dicatat!`);
    } catch (error) {
      console.error('Error logging meal via AI:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLog = async () => {
    if (!manualName.trim()) return;

    const kcal = parseInt(calories, 10) || 300;
    const p = parseInt(protein, 10) || 15;
    const c = parseInt(carbs, 10) || 40;
    const f = parseInt(fat, 10) || 10;

    await addMealLog(
      manualName.trim(),
      false,
      { calories: kcal, proteinGrams: p, carbsGrams: c, fatGrams: f },
      undefined,
      undefined,
      'manual'
    );

    setManualName('');
    setSuccessMsg(`✓ "${manualName}" (${kcal} kcal) berhasil dicatat!`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>PENCATAT NUTRISI & AI</Text>
        <Text style={styles.screenSub}>
          Hitung kalori makanan lokal dari deskripsi santai bahasa Indonesia atau input manual.
        </Text>

        {/* Tab Selector Mode */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabBtn, inputMode === 'ai' && styles.tabBtnActive]}
            onPress={() => setInputMode('ai')}
          >
            <Sparkles size={16} color={inputMode === 'ai' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
            <Text style={[styles.tabText, inputMode === 'ai' && styles.tabTextActive]}>
              Gemini AI Estimator
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, inputMode === 'manual' && styles.tabBtnActive]}
            onPress={() => setInputMode('manual')}
          >
            <Sliders size={16} color={inputMode === 'manual' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
            <Text style={[styles.tabText, inputMode === 'manual' && styles.tabTextActive]}>
              Manual Input
            </Text>
          </TouchableOpacity>
        </View>

        {/* Success Message Banner */}
        {successMsg !== '' && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {inputMode === 'ai' ? (
          <GlassCard>
            <Text style={styles.label}>DESKRIPSI MAKANAN (BAHASA INDONESIA)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Contoh: Makan siang Nasi Padang rendang, perkedel 1, daun singkong, dan es teh manis"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              multiline={true}
              numberOfLines={4}
              value={foodText}
              onChangeText={setFoodText}
            />

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleAILog}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Sparkles size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Hitung Kalori dengan AI</Text>
                </>
              )}
            </TouchableOpacity>
          </GlassCard>
        ) : (
          <GlassCard>
            <Text style={styles.label}>NAMA MAKANAN</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Dada Ayam Bakar + Nasi Merah"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={manualName}
              onChangeText={setManualName}
            />

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>KALORI (KCAL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="450"
                  keyboardType="numeric"
                  value={calories}
                  onChangeText={setCalories}
                />
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.label}>PROTEIN (GRAM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="25"
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={setProtein}
                />
              </View>
            </View>

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>KARBOHIDRAT (GRAM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="50"
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.label}>LEMAK (GRAM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="15"
                  keyboardType="numeric"
                  value={fat}
                  onChangeText={setFat}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleManualLog}>
              <Utensils size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Simpan Log Makanan</Text>
            </TouchableOpacity>
          </GlassCard>
        )}
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
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  successBanner: {
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
  successText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    marginTop: 8,
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 110,
    textAlignVertical: 'top',
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
  grid2: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
