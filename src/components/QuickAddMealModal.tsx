import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { MealLog, NutritionData } from '../types';
import { Sparkles, Utensils, Clock, Plus, X } from 'lucide-react-native';
import { createLocalId } from '../utils/id';

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
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [quickCalories, setQuickCalories] = useState<string>('');

  if (!visible) return null;

  // 1-Tap Duplicate recent meal
  const handleDuplicateRecent = (meal: MealLog) => {
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

  // Submit text for AI parsing
  const handleSubmitAI = async () => {
    const text = inputText.trim();
    if (!text || loading) return;

    setLoading(true);
    try {
      const parsed = await onParseAI(text);
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
      // Fallback manual entry
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

  // Submit quick calories
  const handleQuickCalories = () => {
    const cal = parseInt(quickCalories, 10);
    if (isNaN(cal) || cal <= 0) return;

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

  // Extract unique recent meals
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
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.sheetTitle}>Catat Makanan Cepat</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* AI Text Input */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Ketik / Bicara Makanan</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="misal: Nasi uduk komplit + telur"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={handleSubmitAI}
                    />
                    <TouchableOpacity
                      style={[styles.submitBtn, (!inputText.trim() || loading) && styles.submitBtnDisabled]}
                      onPress={handleSubmitAI}
                      disabled={!inputText.trim() || loading}
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
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>1-Tap Duplikat Makanan Terakhir</Text>
                    <View style={styles.recentGrid}>
                      {uniqueRecentMeals.map((meal) => (
                        <TouchableOpacity
                          key={meal.id}
                          style={styles.recentChip}
                          onPress={() => handleDuplicateRecent(meal)}
                          activeOpacity={0.7}
                        >
                          <Clock size={12} color="#10B981" />
                          <Text style={styles.recentName} numberOfLines={1}>
                            {meal.name}
                          </Text>
                          <Text style={styles.recentCal}>{meal.nutrition.calories} kcal</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Quick Calories Input */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Input Kalori Langsung</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Jumlah kalori (misal: 450)"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      keyboardType="number-pad"
                      value={quickCalories}
                      onChangeText={setQuickCalories}
                    />
                    <TouchableOpacity
                      style={[styles.quickCalBtn, !quickCalories.trim() && styles.submitBtnDisabled]}
                      onPress={handleQuickCalories}
                      disabled={!quickCalories.trim()}
                    >
                      <Plus size={18} color="#FFFFFF" />
                      <Text style={styles.quickCalText}>Tambah</Text>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  submitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  recentGrid: {
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  recentName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recentCal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
  quickCalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  quickCalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
