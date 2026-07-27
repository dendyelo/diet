import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useMeals, useAI, useTheme } from '../context/AppContext';
import { Surface } from '../components/Surface';
import { Sparkles, Utensils, Sliders, CheckCircle2, Wifi, AlertCircle } from 'lucide-react-native';

interface LoggerScreenProps {
  onDone?: () => void;
}

export const LoggerScreen: React.FC<LoggerScreenProps> = ({ onDone }) => {
  const { addMealLog } = useMeals();
  const { parseFoodNutrition, aiStatus } = useAI();
  const { colors, spacing, radius, typography } = useTheme();

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
      setSuccessMsg(`✓ "${result.name}" (${result.nutrition.calories} kkal) berhasil dicatat melalui ${sourceLabel}.`);
    } catch (error: any) {
      setErrorMsg(error.message || 'Gagal memproses kalori makanan.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLog = async () => {
    if (!manualName.trim()) return;

    const kcal = parseInt(calories, 10) || 300;
    const p = parseFloat(protein) || 15;
    const c = parseFloat(carbs) || 40;
    const f = parseFloat(fat) || 10;

    await addMealLog(manualName.trim(), false, {
      calories: kcal,
      proteinGrams: p,
      carbsGrams: c,
      fatGrams: f,
    });

    setSuccessMsg(`✓ "${manualName}" (${kcal} kkal) berhasil dicatat secara manual.`);
    setManualName('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 100 }}>
        <Text style={{ ...typography.h1, color: colors.textPrimary, marginTop: 10 }}>Pencatatan Makanan</Text>

        {/* Input Mode Selector */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: 4 }}>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.sm, backgroundColor: inputMode === 'ai' ? colors.primary : 'transparent' }}
            onPress={() => setInputMode('ai')}
          >
            <Sparkles size={16} color={inputMode === 'ai' ? '#FFFFFF' : colors.textTertiary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: inputMode === 'ai' ? '#FFFFFF' : colors.textTertiary }}>Mode AI Text</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.sm, backgroundColor: inputMode === 'manual' ? colors.primary : 'transparent' }}
            onPress={() => setInputMode('manual')}
          >
            <Sliders size={16} color={inputMode === 'manual' ? '#FFFFFF' : colors.textTertiary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: inputMode === 'manual' ? '#FFFFFF' : colors.textTertiary }}>Input Manual</Text>
          </TouchableOpacity>
        </View>

        {successMsg ? (
          <View style={{ backgroundColor: colors.primarySubtle, padding: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary }}>
            <Text style={{ ...typography.bodyMedium, color: colors.primaryText, textAlign: 'center' }}>{successMsg}</Text>
          </View>
        ) : null}

        {errorMsg ? (
          <View style={{ backgroundColor: colors.dangerSubtle, padding: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger }}>
            <Text style={{ ...typography.bodyMedium, color: colors.danger, textAlign: 'center' }}>{errorMsg}</Text>
          </View>
        ) : null}

        {inputMode === 'ai' ? (
          <Surface style={{ padding: spacing.md }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs }}>Tulis Deskripsi Makanan</Text>
            <Text style={{ ...typography.caption, color: colors.textTertiary, marginBottom: spacing.md }}>
              Tulis secara bebas. AI akan membedah porsi, cara masak, dan perkiraan kalori secara otomatis.
            </Text>

            <TextInput
              style={{
                backgroundColor: colors.surfaceElevated,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.divider,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.textPrimary,
                fontSize: 14,
                minHeight: 100,
                textAlignVertical: 'top',
                marginBottom: spacing.md,
              }}
              placeholder="Contoh: 1 piring nasi goreng kambing + telur ceplok + kerupuk"
              placeholderTextColor={colors.textTertiary}
              value={foodText}
              onChangeText={setFoodText}
              multiline
            />

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: radius.md,
                opacity: (!foodText.trim() || loading) ? 0.4 : 1,
              }}
              onPress={handleAILog}
              disabled={!foodText.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Sparkles size={18} color="#FFFFFF" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Proses AI & Catat</Text>
                </>
              )}
            </TouchableOpacity>
          </Surface>
        ) : (
          <Surface style={{ padding: spacing.md }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}>Input Nutrisi Manual</Text>

            <View style={{ gap: spacing.sm }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>Nama Makanan</Text>
              <TextInput
                style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 14 }}
                placeholder="Nama makanan (misal: Ayam Bakar)"
                placeholderTextColor={colors.textTertiary}
                value={manualName}
                onChangeText={setManualName}
              />

              <Text style={{ ...typography.caption, color: colors.textTertiary }}>Kalori (kkal)</Text>
              <TextInput
                style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 14, paddingVertical: 10, color: colors.primaryText, fontSize: 14, fontWeight: 'bold' }}
                keyboardType="number-pad"
                value={calories}
                onChangeText={setCalories}
              />

              <View style={{ flexDirection: 'row', gap: spacing.xs + 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.caption, color: colors.textTertiary }}>Protein (g)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 10, paddingVertical: 8, color: colors.textPrimary, fontSize: 13 }}
                    keyboardType="decimal-pad"
                    value={protein}
                    onChangeText={setProtein}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.caption, color: colors.textTertiary }}>Karbo (g)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 10, paddingVertical: 8, color: colors.textPrimary, fontSize: 13 }}
                    keyboardType="decimal-pad"
                    value={carbs}
                    onChangeText={setCarbs}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.caption, color: colors.textTertiary }}>Lemak (g)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 10, paddingVertical: 8, color: colors.textPrimary, fontSize: 13 }}
                    keyboardType="decimal-pad"
                    value={fat}
                    onChangeText={setFat}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md }}
                onPress={handleManualLog}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Simpan Makanan Manual</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
