import React, { useEffect, useMemo, useState } from 'react';
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
import { TRIGGER_OPTIONS } from '../utils/habitAnalytics';
import { TriggerType, NutritionData, FoodItemBreakdown } from '../types';
import { parseFoodNutritionWithAI } from '../services/aiService';
import { useTheme } from '../context/ThemeContext';

interface SnackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitSnack: (
    name: string,
    nutrition: NutritionData,
    trigger: TriggerType,
    itemsBreakdown?: FoodItemBreakdown[]
  ) => void;
  onDrinkWater: () => void;
  userApiKey?: string;
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  BOSAN: 'Bosan',
  STRES: 'Stres',
  NONGKRONG: 'Sosial',
  LAPAR_ASLI: 'Lapar fisik',
  LAPAR_MALAM: 'Malam',
};

export const SnackModal: React.FC<SnackModalProps> = ({
  visible,
  onClose,
  onSubmitSnack,
  onDrinkWater,
  userApiKey,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>('BOSAN');
  const [snackText, setSnackText] = useState('');
  const [waterPrompted, setWaterPrompted] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedTriggerInfo = useMemo(
    () => TRIGGER_OPTIONS.find((option) => option.type === selectedTrigger),
    [selectedTrigger]
  );

  useEffect(() => {
    if (visible) {
      setWaterPrompted(false);
      setErrorMsg('');
    }
  }, [visible]);

  const handleParseAndSubmit = async () => {
    const description = snackText.trim();
    if (!description || loadingAI) return;

    setLoadingAI(true);
    setErrorMsg('');
    try {
      const result = await parseFoodNutritionWithAI(description, userApiKey);
      onSubmitSnack(
        result.name,
        result.nutrition,
        selectedTrigger,
        result.itemsBreakdown
      );
      setSnackText('');
      setWaterPrompted(false);
      onClose();
    } catch {
      setErrorMsg(
        'Belum bisa menganalisis snack ini. Perjelas porsi, atau gunakan Tambah → Makan atau snack → Manual.'
      );
    } finally {
      setLoadingAI(false);
    }
  };

  const handleWaterIntercept = () => {
    onDrinkWater();
    setWaterPrompted(true);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose}>
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
                    alignSelf: 'center',
                    backgroundColor: colors.divider,
                    marginBottom: spacing.md,
                  }}
                />

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: spacing.md,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.h2, color: colors.textPrimary }}>Ingin ngemil?</Text>
                    <Text
                      style={{
                        ...typography.caption,
                        color: colors.textTertiary,
                        marginTop: 3,
                      }}
                    >
                      Beri tubuh jeda sebelum mencatat.
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Tutup pencatatan snack"
                    onPress={onClose}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ ...typography.caption, color: colors.textSecondary }}>Tutup</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: spacing.lg }}
                >
                  <View
                    style={{
                      padding: spacing.md,
                      borderWidth: 1,
                      borderColor: waterPrompted ? colors.primary : colors.divider,
                      borderRadius: radius.md,
                      backgroundColor: waterPrompted
                        ? colors.primarySubtle
                        : colors.surfaceElevated,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.bodyMedium,
                        color: colors.textPrimary,
                        fontWeight: '600',
                      }}
                    >
                      {waterPrompted ? 'Satu gelas sudah dicatat' : 'Coba air putih dulu'}
                    </Text>
                    <Text
                      style={{
                        ...typography.caption,
                        color: colors.textSecondary,
                        marginTop: 5,
                        lineHeight: 18,
                      }}
                    >
                      {waterPrompted
                        ? 'Tunggu sebentar. Kalau rasa lapar tetap ada, lanjutkan di bawah.'
                        : 'Rasa haus sering terasa seperti lapar. Minum satu gelas, lalu tunggu 10 menit.'}
                    </Text>
                    {!waterPrompted ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        activeOpacity={0.75}
                        onPress={handleWaterIntercept}
                        style={{
                          alignSelf: 'flex-start',
                          minHeight: 40,
                          justifyContent: 'center',
                          marginTop: spacing.sm,
                          paddingHorizontal: 14,
                          borderRadius: radius.sm,
                          backgroundColor: colors.info,
                        }}
                      >
                        <Text
                          style={{
                            ...typography.caption,
                            color: colors.onInfo,
                            fontWeight: '600',
                          }}
                        >
                          Catat 1 gelas
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={{ gap: spacing.sm }}>
                    <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                      PEMICU
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                      {TRIGGER_OPTIONS.map((option) => {
                        const selected = option.type === selectedTrigger;
                        return (
                          <TouchableOpacity
                            key={option.type}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            activeOpacity={0.7}
                            onPress={() => setSelectedTrigger(option.type)}
                            style={{
                              minHeight: 40,
                              justifyContent: 'center',
                              paddingHorizontal: 13,
                              borderRadius: radius.full,
                              borderWidth: 1,
                              borderColor: selected ? colors.primary : colors.divider,
                              backgroundColor: selected
                                ? colors.primarySubtle
                                : colors.surface,
                            }}
                          >
                            <Text
                              style={{
                                ...typography.caption,
                                color: selected ? colors.primaryText : colors.textSecondary,
                              }}
                            >
                              {TRIGGER_LABELS[option.type]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {selectedTriggerInfo ? (
                      <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                        {selectedTriggerInfo.description}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ gap: spacing.sm }}>
                    <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                      SNACK
                    </Text>
                    <TextInput
                      accessibilityLabel="Deskripsi snack dan porsinya"
                      autoCapitalize="sentences"
                      value={snackText}
                      onChangeText={(text) => {
                        setSnackText(text);
                        setErrorMsg('');
                      }}
                      onSubmitEditing={handleParseAndSubmit}
                      returnKeyType="send"
                      placeholder="Contoh: 2 biskuit cokelat"
                      placeholderTextColor={colors.textTertiary}
                      style={{
                        minHeight: 50,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderWidth: 1,
                        borderColor: colors.divider,
                        borderRadius: radius.md,
                        backgroundColor: colors.surfaceElevated,
                        color: colors.textPrimary,
                        ...typography.body,
                      }}
                    />
                    {errorMsg ? (
                      <View
                        accessibilityRole="alert"
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderWidth: 1,
                          borderColor: colors.danger,
                          borderRadius: radius.sm,
                          backgroundColor: colors.dangerSubtle,
                        }}
                      >
                        <Text style={{ ...typography.caption, color: colors.danger }}>
                          {errorMsg}
                        </Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={!snackText.trim() || loadingAI}
                      activeOpacity={0.8}
                      onPress={handleParseAndSubmit}
                      style={{
                        minHeight: 50,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: radius.md,
                        backgroundColor: colors.primary,
                        opacity: !snackText.trim() || loadingAI ? 0.42 : 1,
                      }}
                    >
                      {loadingAI ? (
                        <ActivityIndicator color={colors.onPrimary} />
                      ) : (
                        <Text
                          style={{
                            ...typography.bodyMedium,
                            color: colors.onPrimary,
                            fontWeight: '600',
                          }}
                        >
                          Analisis & catat
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
