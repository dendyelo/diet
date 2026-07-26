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
import { Sparkles, Clock, Plus, X } from 'lucide-react-native';
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
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [quickCalories, setQuickCalories] = useState<string>('');

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
                maxHeight: '80%',
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
                  marginBottom: spacing.md,
                  paddingBottom: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.divider,
                }}
              >
                <Text style={{ ...typography.h2, color: colors.textPrimary }}>Catat Makanan Cepat</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={{ padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup dialog"
                >
                  <X size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
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
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Sparkles size={18} color="#FFFFFF" />
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
                      <Plus size={18} color="#FFFFFF" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Tambah</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
