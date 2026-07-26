import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { MealLog, NutritionData } from '../types';
import { Sparkles, Clock, Plus, X, Sliders } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

interface QuickAddMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveMeal: (meal: Omit<MealLog, 'id' | 'timestamp'>) => void;
  recentMeals: MealLog[];
  onParseAI: (text: string) => Promise<{ name: string; nutrition: NutritionData } | null>;
}

export const QuickAddMealModal: React.FC<QuickAddMealModalProps> = ({
  visible,
  onClose,
  onSaveMeal,
  recentMeals,
  onParseAI,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [activeMode, setActiveMode] = useState<'quick' | 'manual'>('quick');
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [quickCalories, setQuickCalories] = useState<string>('');

  // Manual Macro state
  const [manualName, setManualName] = useState<string>('');
  const [manualCalories, setManualCalories] = useState<string>('450');
  const [manualProtein, setManualProtein] = useState<string>('25');
  const [manualCarbs, setManualCarbs] = useState<string>('50');
  const [manualFat, setManualFat] = useState<string>('15');

  if (!visible) return null;

  const handleDuplicateRecent = (meal: MealLog) => {
    triggerHaptic('success');
    onSaveMeal({
      name: meal.name,
      isSnack: meal.isSnack,
      trigger: meal.trigger,
      nutrition: { ...meal.nutrition },
      source: meal.source,
      itemsBreakdown: meal.itemsBreakdown ? [...meal.itemsBreakdown] : undefined,
      notes: meal.notes,
    });
    onClose();
  };

  const handleSubmitAI = async () => {
    const text = inputText.trim();
    if (!text || loading) return;

    setLoading(true);
    try {
      const parsed = await onParseAI(text);
      triggerHaptic('success');
      if (parsed) {
        onSaveMeal({
          name: parsed.name,
          isSnack: false,
          nutrition: parsed.nutrition,
          source: 'ai',
        });
        setInputText('');
        onClose();
      }
    } catch {
      triggerHaptic('success');
      onSaveMeal({
        name: text,
        isSnack: false,
        nutrition: { calories: 350, proteinGrams: 15, carbsGrams: 40, fatGrams: 10 },
        source: 'manual',
      });
      setInputText('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCalories = () => {
    const cal = parseInt(quickCalories, 10);
    if (isNaN(cal) || cal <= 0) return;

    triggerHaptic('success');
    onSaveMeal({
      name: 'Catatan Cepat',
      isSnack: false,
      nutrition: {
        calories: cal,
        proteinGrams: Math.round((cal * 0.2) / 4),
        carbsGrams: Math.round((cal * 0.5) / 4),
        fatGrams: Math.round((cal * 0.3) / 9),
      },
      source: 'manual',
    });
    setQuickCalories('');
    onClose();
  };

  const handleManualSave = () => {
    if (!manualName.trim()) return;

    triggerHaptic('success');
    onSaveMeal({
      name: manualName.trim(),
      isSnack: false,
      nutrition: {
        calories: parseInt(manualCalories, 10) || 300,
        proteinGrams: parseFloat(manualProtein) || 15,
        carbsGrams: parseFloat(manualCarbs) || 40,
        fatGrams: parseFloat(manualFat) || 10,
      },
      source: 'manual',
    });
    setManualName('');
    onClose();
  };

  const uniqueRecentMeals = useMemo(() => {
    return recentMeals.slice(0, 50).reduce<MealLog[]>((acc, current) => {
      const exists = acc.some((m) => m.name.toLowerCase() === current.name.toLowerCase());
      if (!exists && acc.length < 4) acc.push(current);
      return acc;
    }, []);
  }, [recentMeals]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
                padding: spacing.md,
                maxHeight: '85%',
                borderWidth: 1,
                borderColor: colors.divider,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing.sm,
                  paddingBottom: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.divider,
                }}
              >
                <Text style={{ ...typography.h2, color: colors.textPrimary }}>Catat Makanan</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={{ padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup dialog"
                >
                  <X size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* Mode Switcher Tab */}
              <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: 4, marginBottom: spacing.md }}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: activeMode === 'quick' ? colors.primary : 'transparent', minHeight: 44 }}
                  onPress={() => setActiveMode('quick')}
                >
                  <Sparkles size={14} color={activeMode === 'quick' ? colors.onPrimary : colors.textTertiary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: activeMode === 'quick' ? colors.onPrimary : colors.textTertiary }}>Mode Cepat & AI</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: activeMode === 'manual' ? colors.primary : 'transparent', minHeight: 44 }}
                  onPress={() => setActiveMode('manual')}
                >
                  <Sliders size={14} color={activeMode === 'manual' ? colors.onPrimary : colors.textTertiary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: activeMode === 'manual' ? colors.onPrimary : colors.textTertiary }}>Input Makro Manual</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
                {activeMode === 'quick' ? (
                  <>
                    {/* AI Text Input */}
                    <View style={{ gap: spacing.xs }}>
                      <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Ketik / Bicara Makanan
                      </Text>
                      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                        <TextInput
                          style={{
                            flex: 1,
                            backgroundColor: colors.surfaceElevated,
                            borderRadius: radius.md,
                            borderWidth: 1,
                            borderColor: colors.divider,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            color: colors.textPrimary,
                            fontSize: 13,
                            minHeight: 44,
                          }}
                          placeholder="misal: Nasi uduk komplit + telur"
                          placeholderTextColor={colors.textTertiary}
                          value={inputText}
                          onChangeText={setInputText}
                          onSubmitEditing={handleSubmitAI}
                        />
                        <TouchableOpacity
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: (!inputText.trim() || loading) ? 0.4 : 1,
                          }}
                          onPress={handleSubmitAI}
                          disabled={!inputText.trim() || loading}
                          accessibilityRole="button"
                          accessibilityLabel="Analisis makanan dengan AI"
                        >
                          {loading ? (
                            <ActivityIndicator size="small" color={colors.onPrimary} />
                          ) : (
                            <Sparkles size={18} color={colors.onPrimary} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* 1-Tap Duplicate Recent Meals */}
                    {uniqueRecentMeals.length > 0 && (
                      <View style={{ gap: spacing.xs }}>
                        <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          1-Tap Duplikat Makanan Terakhir
                        </Text>
                        <View style={{ gap: spacing.xs }}>
                          {uniqueRecentMeals.map((meal) => (
                            <TouchableOpacity
                              key={meal.id}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: spacing.sm,
                                backgroundColor: colors.primarySubtle,
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderRadius: radius.sm,
                                borderWidth: 1,
                                borderColor: colors.primarySubtle,
                                minHeight: 44,
                              }}
                              onPress={() => handleDuplicateRecent(meal)}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel={`Duplikat makanan ${meal.name}`}
                            >
                              <Clock size={14} color={colors.primary} />
                              <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary }} numberOfLines={1}>
                                {meal.name}
                              </Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryText }}>
                                {meal.nutrition.calories} kcal
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Quick Calories Input */}
                    <View style={{ gap: spacing.xs }}>
                      <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Input Kalori Langsung
                      </Text>
                      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                        <TextInput
                          style={{
                            flex: 1,
                            backgroundColor: colors.surfaceElevated,
                            borderRadius: radius.md,
                            borderWidth: 1,
                            borderColor: colors.divider,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            color: colors.textPrimary,
                            fontSize: 13,
                            minHeight: 44,
                          }}
                          placeholder="Jumlah kalori (misal: 450)"
                          placeholderTextColor={colors.textTertiary}
                          keyboardType="number-pad"
                          value={quickCalories}
                          onChangeText={setQuickCalories}
                        />
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: colors.primary,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: radius.md,
                            opacity: !quickCalories.trim() ? 0.4 : 1,
                            minHeight: 44,
                          }}
                          onPress={handleQuickCalories}
                          disabled={!quickCalories.trim()}
                          accessibilityRole="button"
                          accessibilityLabel="Tambah kalori langsung"
                        >
                          <Plus size={18} color={colors.onPrimary} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.onPrimary }}>Tambah</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                ) : (
                  /* Manual Macro Form */
                  <View style={{ gap: spacing.sm }}>
                    <View style={{ gap: spacing.xs }}>
                      <Text style={{ ...typography.caption, color: colors.textTertiary }}>Nama Makanan</Text>
                      <TextInput
                        style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 13, minHeight: 44 }}
                        placeholder="Nama makanan (misal: Dada Ayam Bakar)"
                        placeholderTextColor={colors.textTertiary}
                        value={manualName}
                        onChangeText={setManualName}
                      />
                    </View>

                    <View style={{ gap: spacing.xs }}>
                      <Text style={{ ...typography.caption, color: colors.textTertiary }}>Total Kalori (kcal)</Text>
                      <TextInput
                        style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 14, paddingVertical: 10, color: colors.primaryText, fontSize: 14, fontWeight: 'bold', minHeight: 44 }}
                        keyboardType="number-pad"
                        value={manualCalories}
                        onChangeText={setManualCalories}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: spacing.xs + 4 }}>
                      <View style={{ flex: 1, gap: spacing.xs }}>
                        <Text style={{ ...typography.caption, color: colors.textTertiary }}>Protein (g)</Text>
                        <TextInput
                          style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 10, paddingVertical: 8, color: colors.textPrimary, fontSize: 13, minHeight: 44 }}
                          keyboardType="decimal-pad"
                          value={manualProtein}
                          onChangeText={setManualProtein}
                        />
                      </View>

                      <View style={{ flex: 1, gap: spacing.xs }}>
                        <Text style={{ ...typography.caption, color: colors.textTertiary }}>Karbo (g)</Text>
                        <TextInput
                          style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 10, paddingVertical: 8, color: colors.textPrimary, fontSize: 13, minHeight: 44 }}
                          keyboardType="decimal-pad"
                          value={manualCarbs}
                          onChangeText={setManualCarbs}
                        />
                      </View>

                      <View style={{ flex: 1, gap: spacing.xs }}>
                        <Text style={{ ...typography.caption, color: colors.textTertiary }}>Lemak (g)</Text>
                        <TextInput
                          style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 10, paddingVertical: 8, color: colors.textPrimary, fontSize: 13, minHeight: 44 }}
                          keyboardType="decimal-pad"
                          value={manualFat}
                          onChangeText={setManualFat}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm, minHeight: 44, justifyContent: 'center' }}
                      onPress={handleManualSave}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onPrimary }}>Simpan Makanan Manual</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
