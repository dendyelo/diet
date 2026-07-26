import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FoodItemBreakdown, MealLog, NutritionData } from '../types';
import { useTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

interface QuickAddMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveMeal: (
    meal: Omit<MealLog, 'id' | 'timestamp'>
  ) => Promise<void> | void;
  recentMeals: MealLog[];
  onParseAI: (text: string) => Promise<AIParsedMeal | null>;
  defaultIsSnack?: boolean;
}

interface AIParsedMeal {
  name: string;
  nutrition: NutritionData;
  itemsBreakdown?: FoodItemBreakdown[];
  aiNotes?: string;
  confidence?: 'high' | 'medium' | 'low';
  isOnlineAI?: boolean;
}

type EntryMode = 'ai' | 'manual';

interface SegmentProps {
  selected: boolean;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

const Segment: React.FC<SegmentProps> = ({
  selected,
  label,
  onPress,
  disabled = false,
}) => {
  const { colors, radius, typography } = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      activeOpacity={0.75}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.sm,
        backgroundColor: selected ? colors.surface : 'transparent',
        borderWidth: selected ? 1 : 0,
        borderColor: colors.divider,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        style={{
          ...typography.caption,
          color: selected ? colors.textPrimary : colors.textTertiary,
          fontWeight: selected ? '600' : '500',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export const QuickAddMealModal: React.FC<QuickAddMealModalProps> = ({
  visible,
  onClose,
  onSaveMeal,
  recentMeals,
  onParseAI,
  defaultIsSnack = false,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [entryMode, setEntryMode] = useState<EntryMode>('ai');
  const [isSnack, setIsSnack] = useState(defaultIsSnack);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quickCalories, setQuickCalories] = useState('');
  const [formError, setFormError] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [aiPreview, setAIPreview] = useState<AIParsedMeal | null>(null);
  const parseGenerationRef = useRef(0);
  const savingRef = useRef(false);

  useEffect(() => {
    ++parseGenerationRef.current;
    setLoading(false);

    if (visible) {
      setIsSnack(defaultIsSnack);
      setFormError('');
      setAIPreview(null);
    }
  }, [defaultIsSnack, visible]);

  const uniqueRecentMeals = useMemo(
    () =>
      recentMeals.slice(0, 50).reduce<MealLog[]>((unique, meal) => {
        const alreadyAdded = unique.some(
          (item) => item.name.toLocaleLowerCase() === meal.name.toLocaleLowerCase()
        );
        if (!alreadyAdded && unique.length < 3) unique.push(meal);
        return unique;
      }, []),
    [recentMeals]
  );

  if (!visible) return null;

  const resetAfterSave = () => {
    setInputText('');
    setQuickCalories('');
    setManualName('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setFormError('');
    setAIPreview(null);
  };

  const handleModalClose = () => {
    if (savingRef.current) return;

    ++parseGenerationRef.current;
    setLoading(false);
    onClose();
  };

  const completeSave = async (
    meal: Omit<MealLog, 'id' | 'timestamp'>
  ): Promise<void> => {
    if (savingRef.current) return;

    savingRef.current = true;
    setIsSaving(true);
    setFormError('');

    try {
      await onSaveMeal(meal);
      await triggerHaptic('success');
      ++parseGenerationRef.current;
      resetAfterSave();
      onClose();
    } catch {
      setFormError('Catatan belum tersimpan. Periksa koneksi atau ruang penyimpanan, lalu coba lagi.');
      await triggerHaptic('error');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const selectMealType = (nextIsSnack: boolean) => {
    triggerHaptic('light');
    setIsSnack(nextIsSnack);
  };

  const openManualFallback = (description: string) => {
    setManualName((current) => current || description);
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setEntryMode('manual');
    setFormError(
      'AI belum bisa membaca deskripsi ini. Isinya sudah dipindahkan ke form manual—masukkan angka yang kamu ketahui.'
    );
    triggerHaptic('error');
  };

  const handleSubmitAI = async () => {
    const description = inputText.trim();
    if (!description || loading || savingRef.current) return;

    const generation = ++parseGenerationRef.current;
    setLoading(true);
    setFormError('');
    try {
      const parsed = await onParseAI(description);
      if (generation !== parseGenerationRef.current) return;

      if (!parsed) {
        openManualFallback(description);
        return;
      }

      setAIPreview(parsed);
      await triggerHaptic('success');
    } catch {
      if (generation === parseGenerationRef.current) {
        openManualFallback(description);
      }
    } finally {
      if (generation === parseGenerationRef.current) {
        setLoading(false);
      }
    }
  };

  const handleConfirmAI = async () => {
    if (!aiPreview) return;

    await completeSave({
      name: aiPreview.name,
      isSnack,
      nutrition: aiPreview.nutrition,
      source: 'ai',
      itemsBreakdown: aiPreview.itemsBreakdown,
      notes: aiPreview.aiNotes,
    });
  };

  const handleEditAIPreview = () => {
    if (!aiPreview) return;

    setManualName(aiPreview.name);
    setManualCalories(String(Math.round(aiPreview.nutrition.calories)));
    setManualProtein(String(aiPreview.nutrition.proteinGrams));
    setManualCarbs(String(aiPreview.nutrition.carbsGrams));
    setManualFat(String(aiPreview.nutrition.fatGrams));
    setEntryMode('manual');
    setFormError('');
    triggerHaptic('light');
  };

  const handleDuplicateRecent = async (meal: MealLog) => {
    await completeSave({
      name: meal.name,
      isSnack,
      trigger: meal.trigger,
      nutrition: { ...meal.nutrition },
      source: meal.source,
      itemsBreakdown: meal.itemsBreakdown ? [...meal.itemsBreakdown] : undefined,
      notes: meal.notes,
    });
  };

  const handleQuickCalories = async () => {
    const calories = Number.parseInt(quickCalories, 10);
    if (!Number.isFinite(calories) || calories <= 0) {
      setFormError('Masukkan jumlah kalori yang valid.');
      return;
    }

    await completeSave({
      name: isSnack ? 'Catatan snack' : 'Catatan makan',
      isSnack,
      nutrition: {
        calories,
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
      },
      source: 'manual',
    });
  };

  const handleManualSave = async () => {
    const calories = Number.parseInt(manualCalories, 10);
    const protein = manualProtein.trim() ? Number.parseFloat(manualProtein.replace(',', '.')) : 0;
    const carbs = manualCarbs.trim() ? Number.parseFloat(manualCarbs.replace(',', '.')) : 0;
    const fat = manualFat.trim() ? Number.parseFloat(manualFat.replace(',', '.')) : 0;

    if (!manualName.trim()) {
      setFormError('Tambahkan nama makanan.');
      return;
    }
    if (!Number.isFinite(calories) || calories <= 0) {
      setFormError('Kalori wajib diisi dengan angka lebih dari 0.');
      return;
    }
    if ([protein, carbs, fat].some((value) => !Number.isFinite(value) || value < 0)) {
      setFormError('Nilai makro tidak boleh negatif.');
      return;
    }

    await completeSave({
      name: manualName.trim(),
      isSnack,
      nutrition: {
        calories,
        proteinGrams: protein,
        carbsGrams: carbs,
        fatGrams: fat,
      },
      source: 'manual',
    });
  };

  const fieldStyle = {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  } as const;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleModalClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={{ flex: 1 }} onPress={handleModalClose}>
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: colors.overlay,
            }}
          >
            <Pressable onPress={(event) => event.stopPropagation()}>
              <View
                style={{
                  maxHeight: '92%',
                  paddingHorizontal: spacing.md,
                  paddingTop: spacing.sm,
                  paddingBottom: Math.max(spacing.md, insets.bottom),
                  borderTopLeftRadius: radius.xl,
                  borderTopRightRadius: radius.xl,
                  borderWidth: 1,
                  borderBottomWidth: 0,
                  borderColor: colors.divider,
                  backgroundColor: colors.surface,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.divider,
                    alignSelf: 'center',
                    marginBottom: spacing.md,
                  }}
                />

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: spacing.md,
                    marginBottom: spacing.md,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.h2, color: colors.textPrimary }}>Catat asupan</Text>
                    <Text
                      style={{
                        ...typography.caption,
                        color: colors.textTertiary,
                        marginTop: 3,
                      }}
                    >
                      Cepat dengan AI, atau isi sendiri.
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Tutup pencatatan asupan"
                    accessibilityState={{ disabled: isSaving }}
                    disabled={isSaving}
                    onPress={handleModalClose}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isSaving ? 0.45 : 1,
                    }}
                  >
                    <Text style={{ ...typography.caption, color: colors.textSecondary }}>Tutup</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
                  <View
                    style={{
                      width: '100%',
                      flexShrink: 0,
                      flexDirection: 'row',
                      padding: 3,
                      borderRadius: radius.md,
                      backgroundColor: colors.surfaceElevated,
                    }}
                  >
                    <Segment
                      selected={!isSnack}
                      label="Makan"
                      disabled={isSaving}
                      onPress={() => selectMealType(false)}
                    />
                    <Segment
                      selected={isSnack}
                      label="Snack"
                      disabled={isSaving}
                      onPress={() => selectMealType(true)}
                    />
                  </View>
                  <View
                    style={{
                      width: '100%',
                      flexShrink: 0,
                      flexDirection: 'row',
                      padding: 3,
                      borderRadius: radius.md,
                      backgroundColor: colors.surfaceElevated,
                    }}
                  >
                    <Segment
                      selected={entryMode === 'ai'}
                      label="AI"
                      disabled={isSaving}
                      onPress={() => {
                        setEntryMode('ai');
                        setFormError('');
                      }}
                    />
                    <Segment
                      selected={entryMode === 'manual'}
                      label="Manual"
                      disabled={isSaving}
                      onPress={() => {
                        setEntryMode('manual');
                        setFormError('');
                      }}
                    />
                  </View>
                </View>

                {formError ? (
                  <View
                    accessibilityRole="alert"
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: spacing.sm,
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: colors.danger,
                      backgroundColor: colors.dangerSubtle,
                    }}
                  >
                    <Text style={{ ...typography.caption, color: colors.danger }}>{formError}</Text>
                  </View>
                ) : null}

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xs }}
                >
                  {entryMode === 'ai' ? (
                    <>
                      <View style={{ gap: spacing.sm }}>
                        <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                          DESKRIPSI
                        </Text>
                        <TextInput
                          accessibilityLabel="Deskripsi makanan"
                          autoCapitalize="sentences"
                          returnKeyType="send"
                          style={fieldStyle}
                          placeholder="Contoh: nasi, ayam bakar, dan lalapan"
                          placeholderTextColor={colors.textTertiary}
                          value={inputText}
                          onChangeText={(text) => {
                            ++parseGenerationRef.current;
                            setInputText(text);
                            setLoading(false);
                            setFormError('');
                            setAIPreview(null);
                          }}
                          onSubmitEditing={handleSubmitAI}
                          editable={!isSaving}
                        />
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Analisis makanan dengan AI"
                          accessibilityState={{
                            disabled: !inputText.trim() || loading || isSaving,
                          }}
                          disabled={!inputText.trim() || loading || isSaving}
                          activeOpacity={0.8}
                          onPress={handleSubmitAI}
                          style={{
                            minHeight: 48,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: radius.md,
                            backgroundColor: colors.primary,
                            opacity:
                              !inputText.trim() || loading || isSaving ? 0.42 : 1,
                          }}
                        >
                          {loading ? (
                            <ActivityIndicator color={colors.onPrimary} />
                          ) : (
                            <Text
                              style={{
                                ...typography.bodyMedium,
                                color: colors.onPrimary,
                                fontWeight: '600',
                              }}
                            >
                              Analisis
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      {aiPreview ? (
                        <View
                          accessibilityLabel="Preview hasil analisis AI"
                          style={{
                            padding: spacing.md,
                            gap: spacing.md,
                            borderWidth: 1,
                            borderColor: colors.primary,
                            borderRadius: radius.md,
                            backgroundColor: colors.primarySubtle,
                          }}
                        >
                          <View style={{ gap: 4 }}>
                            <Text style={{ ...typography.overline, color: colors.primaryText }}>
                              {aiPreview.isOnlineAI === false
                                ? 'ESTIMASI LOKAL'
                                : 'HASIL AI'}
                            </Text>
                            <Text style={{ ...typography.h3, color: colors.textPrimary }}>
                              {aiPreview.name}
                            </Text>
                          </View>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: spacing.sm,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 30,
                                lineHeight: 36,
                                fontWeight: '400',
                                color: colors.textPrimary,
                              }}
                            >
                              {Math.round(aiPreview.nutrition.calories)}
                              <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                                {' '}kkal
                              </Text>
                            </Text>
                            <Text
                              style={{
                                ...typography.caption,
                                color: colors.textSecondary,
                                flexShrink: 1,
                              }}
                            >
                              P {aiPreview.nutrition.proteinGrams}g · K {aiPreview.nutrition.carbsGrams}g · L {aiPreview.nutrition.fatGrams}g
                            </Text>
                          </View>

                          {aiPreview.itemsBreakdown && aiPreview.itemsBreakdown.length > 1 ? (
                            <View
                              style={{
                                borderTopWidth: 1,
                                borderTopColor: colors.divider,
                                paddingTop: spacing.sm,
                                gap: 6,
                              }}
                            >
                              {aiPreview.itemsBreakdown.slice(0, 4).map((item, index) => (
                                <View
                                  key={`${item.name}-${index}`}
                                  style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    gap: spacing.sm,
                                  }}
                                >
                                  <Text
                                    numberOfLines={1}
                                    style={{
                                      ...typography.caption,
                                      color: colors.textSecondary,
                                      flex: 1,
                                    }}
                                  >
                                    {item.name}
                                  </Text>
                                  <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                                    ±{Math.round(item.calories)} kkal
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : null}

                          {aiPreview.aiNotes ? (
                            <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                              {aiPreview.aiNotes}
                            </Text>
                          ) : null}

                          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel="Edit hasil analisis AI"
                              accessibilityState={{ disabled: isSaving }}
                              disabled={isSaving}
                              onPress={handleEditAIPreview}
                              style={{
                                minHeight: 46,
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: colors.divider,
                                borderRadius: radius.md,
                                opacity: isSaving ? 0.45 : 1,
                              }}
                            >
                              <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>
                                Edit
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel="Konfirmasi dan simpan hasil AI"
                              accessibilityState={{ disabled: isSaving }}
                              disabled={isSaving}
                              onPress={handleConfirmAI}
                              style={{
                                minHeight: 46,
                                flex: 1.45,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: radius.md,
                                backgroundColor: colors.primary,
                                opacity: isSaving ? 0.55 : 1,
                              }}
                            >
                              <Text
                                style={{
                                  ...typography.bodyMedium,
                                  color: colors.onPrimary,
                                  fontWeight: '600',
                                }}
                              >
                                {isSaving ? 'Menyimpan…' : 'Simpan hasil'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}

                      {uniqueRecentMeals.length > 0 ? (
                        <View style={{ gap: spacing.sm }}>
                          <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                            TERAKHIR
                          </Text>
                          <View
                            style={{
                              overflow: 'hidden',
                              borderWidth: 1,
                              borderColor: colors.divider,
                              borderRadius: radius.md,
                            }}
                          >
                            {uniqueRecentMeals.map((meal, index) => (
                              <TouchableOpacity
                                key={meal.id}
                                accessibilityRole="button"
                                accessibilityLabel={`Catat lagi ${meal.name}`}
                                accessibilityState={{ disabled: isSaving }}
                                disabled={isSaving}
                                activeOpacity={0.7}
                                onPress={() => handleDuplicateRecent(meal)}
                                style={{
                                  minHeight: 48,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: spacing.sm,
                                  paddingHorizontal: 14,
                                  borderTopWidth: index === 0 ? 0 : 1,
                                  borderTopColor: colors.divider,
                                  opacity: isSaving ? 0.45 : 1,
                                }}
                              >
                                <Text
                                  style={{
                                    ...typography.bodyMedium,
                                    color: colors.textPrimary,
                                    flex: 1,
                                  }}
                                  numberOfLines={1}
                                >
                                  {meal.name}
                                </Text>
                                <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                                  {meal.nutrition.calories} kcal
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ) : null}

                      <View style={{ gap: spacing.sm }}>
                        <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                          HANYA KALORI
                        </Text>
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                          <TextInput
                            accessibilityLabel="Jumlah kalori"
                            style={[fieldStyle, { flex: 1 }]}
                            keyboardType="number-pad"
                            placeholder="0"
                            placeholderTextColor={colors.textTertiary}
                            value={quickCalories}
                            onChangeText={(text) => {
                              setQuickCalories(text);
                              setFormError('');
                            }}
                          />
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityState={{
                              disabled: !quickCalories.trim() || isSaving,
                            }}
                            disabled={!quickCalories.trim() || isSaving}
                            onPress={handleQuickCalories}
                            style={{
                              minWidth: 92,
                              minHeight: 48,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 1,
                              borderColor: colors.divider,
                              borderRadius: radius.md,
                              opacity: quickCalories.trim() && !isSaving ? 1 : 0.42,
                            }}
                          >
                            <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>
                              Simpan
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                          Makro disimpan 0 sampai kamu melengkapinya.
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={{ gap: spacing.md }}>
                      <View style={{ gap: spacing.sm }}>
                        <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                          NAMA
                        </Text>
                        <TextInput
                          accessibilityLabel="Nama makanan"
                          style={fieldStyle}
                          placeholder="Nama makanan"
                          placeholderTextColor={colors.textTertiary}
                          value={manualName}
                          onChangeText={(text) => {
                            setManualName(text);
                            setFormError('');
                          }}
                        />
                      </View>

                      <View style={{ gap: spacing.sm }}>
                        <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                          NUTRISI
                        </Text>
                        <TextInput
                          accessibilityLabel="Kalori"
                          style={fieldStyle}
                          keyboardType="number-pad"
                          placeholder="Kalori (wajib)"
                          placeholderTextColor={colors.textTertiary}
                          value={manualCalories}
                          onChangeText={(text) => {
                            setManualCalories(text);
                            setFormError('');
                          }}
                        />
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                          {[
                            ['Protein', manualProtein, setManualProtein],
                            ['Karbo', manualCarbs, setManualCarbs],
                            ['Lemak', manualFat, setManualFat],
                          ].map(([label, value, setter]) => (
                            <View key={label as string} style={{ flex: 1, gap: spacing.xs }}>
                              <Text
                                style={{
                                  ...typography.caption,
                                  color: colors.textTertiary,
                                }}
                              >
                                {label as string}
                              </Text>
                              <TextInput
                                accessibilityLabel={`${label as string} dalam gram`}
                                style={[fieldStyle, { paddingHorizontal: 10 }]}
                                keyboardType="decimal-pad"
                                placeholder="0 g"
                                placeholderTextColor={colors.textTertiary}
                                value={value as string}
                                onChangeText={(text) => {
                                  (setter as React.Dispatch<React.SetStateAction<string>>)(text);
                                  setFormError('');
                                }}
                              />
                            </View>
                          ))}
                        </View>
                      </View>

                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isSaving }}
                        disabled={isSaving}
                        activeOpacity={0.8}
                        onPress={handleManualSave}
                        style={{
                          minHeight: 50,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: radius.md,
                          backgroundColor: colors.primary,
                          opacity: isSaving ? 0.55 : 1,
                        }}
                      >
                        <Text
                          style={{
                            ...typography.bodyMedium,
                            color: colors.onPrimary,
                            fontWeight: '600',
                          }}
                        >
                          {isSaving
                            ? 'Menyimpan…'
                            : `Simpan ${isSnack ? 'snack' : 'makanan'}`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
