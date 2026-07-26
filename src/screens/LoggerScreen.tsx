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
import { useMeals, useAI } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';
import { Sparkles, Utensils, Sliders, CheckCircle2, Wifi, AlertCircle } from 'lucide-react-native';

interface LoggerScreenProps {
  onDone?: () => void;
}

export const LoggerScreen: React.FC<LoggerScreenProps> = ({ onDone }) => {
  const { addMealLog } = useMeals();
  const { parseFoodNutrition, aiStatus, userApiKey } = useAI();

  const [inputMode, setInputMode] = useState<'ai' | 'manual'>('ai');
  const [foodText, setFoodText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

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
    setErrorMsg('');
    try {
      const result = await parseFoodNutrition(foodText);
      await addMealLog(result.name, false, result.nutrition, undefined, undefined, 'ai', result.itemsBreakdown);
      setFoodText('');

      const sourceLabel = result.isOnlineAI ? 'Gemini AI' : 'Smart Culinary Engine lokal';
      setSuccessMsg(`✓ "${result.name}" (${result.nutrition.calories} kcal) berhasil dicatat melalui ${sourceLabel}.`);
    } catch (error: any) {
      setErrorMsg(error.message || 'Gagal memproses kalori makanan.');
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
        {/* Screen Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle} numberOfLines={1}>PENCATAT NUTRISI & AI</Text>
            <Text style={styles.screenSub}>
              Hitung kalori makanan dari deskripsi santai atau manual.
            </Text>
          </View>

          {/* AI Status Indicator Badge */}
          <View style={[styles.aiStatusBadge, { backgroundColor: aiStatus.color + '18', borderColor: aiStatus.color + '40' }]}>
            <View style={[styles.statusDot, { backgroundColor: aiStatus.color }]} />
            <Text style={[styles.statusBadgeText, { color: aiStatus.color }]} numberOfLines={1}>
              {aiStatus.isOnline ? 'Cloud AI' : 'Engine Lokal'}
            </Text>
          </View>
        </View>

        {/* Tab Selector Mode */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabBtn, inputMode === 'ai' && styles.tabBtnActive]}
            onPress={() => setInputMode('ai')}
          >
            <Sparkles size={16} color={inputMode === 'ai' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
            <Text style={[styles.tabText, inputMode === 'ai' && styles.tabTextActive]} numberOfLines={1}>
              Gemini AI Cloud
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, inputMode === 'manual' && styles.tabBtnActive]}
            onPress={() => setInputMode('manual')}
          >
            <Sliders size={16} color={inputMode === 'manual' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
            <Text style={[styles.tabText, inputMode === 'manual' && styles.tabTextActive]} numberOfLines={1}>
              Manual Input
            </Text>
          </TouchableOpacity>
        </View>

        {/* Success Message Banner */}
        {successMsg !== '' && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={styles.successText} numberOfLines={1}>{successMsg}</Text>
          </View>
        )}

        {/* Error Message Banner */}
        {errorMsg !== '' && (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#EF4444" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {inputMode === 'ai' ? (
          <GlassCard>
            {/* AI Mode Banner */}
            <View style={[styles.aiModeBar, { backgroundColor: aiStatus.color + '12' }]}>
              <Wifi size={16} color={aiStatus.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiModeTitle, { color: aiStatus.color }]} numberOfLines={1}>
                  {aiStatus.modeLabel}
                </Text>
                <Text style={styles.aiModeDesc}>{aiStatus.description}</Text>
              </View>
            </View>

            <Text style={styles.label} numberOfLines={1}>DESKRIPSI MAKANAN (BAHASA INDONESIA)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Contoh: Makan siang Nasi Padang rendang, perkedel 1, daun singkong, dan es teh manis"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              multiline={true}
              numberOfLines={4}
              value={foodText}
              onChangeText={(text) => {
                setFoodText(text);
                if (errorMsg) setErrorMsg('');
              }}
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
                  <Text style={styles.submitBtnText} numberOfLines={1}>Hitung Kalori dengan Gemini AI</Text>
                </>
              )}
            </TouchableOpacity>
          </GlassCard>
        ) : (
          <GlassCard>
            <Text style={styles.label} numberOfLines={1}>NAMA MAKANAN</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Dada Ayam Bakar + Nasi Merah"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={manualName}
              onChangeText={setManualName}
            />

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.label} numberOfLines={1}>KALORI (KCAL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="450"
                  keyboardType="numeric"
                  value={calories}
                  onChangeText={setCalories}
                />
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.label} numberOfLines={1}>PROTEIN (GRAM)</Text>
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
                <Text style={styles.label} numberOfLines={1}>KARBOHIDRAT (GRAM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="50"
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.label} numberOfLines={1}>LEMAK (GRAM)</Text>
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
              <Text style={styles.submitBtnText} numberOfLines={1}>Simpan Log Makanan</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    lineHeight: 18,
  },
  aiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginLeft: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  aiModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  aiModeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  aiModeDesc: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F87171',
    flex: 1,
    lineHeight: 16,
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
