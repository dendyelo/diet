import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TRIGGER_OPTIONS } from '../utils/habitAnalytics';
import { TriggerType, NutritionData, FoodItemBreakdown } from '../types';
import { parseFoodNutritionWithAI } from '../services/aiService';
import { X, Droplet, Cookie, Sparkles, AlertCircle } from 'lucide-react-native';
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

export const SnackModal: React.FC<SnackModalProps> = ({
  visible,
  onClose,
  onSubmitSnack,
  onDrinkWater,
  userApiKey,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>('BOSAN');
  const [snackText, setSnackText] = useState<string>('');
  const [waterPrompted, setWaterPrompted] = useState<boolean>(false);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleParseAndSubmit = async () => {
    if (!snackText.trim()) return;

    setLoadingAI(true);
    setErrorMsg('');
    try {
      const result = await parseFoodNutritionWithAI(snackText, userApiKey);

      onSubmitSnack(
        result.name,
        result.nutrition,
        selectedTrigger,
        result.itemsBreakdown
      );

      setSnackText('');
      setWaterPrompted(false);
      setErrorMsg('');
      onClose();
    } catch {
      setErrorMsg('Gagal menganalisis cemilan. Pastikan deskripsi cemilan Anda jelas.');
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
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing.md,
            borderWidth: 1,
            borderColor: colors.divider,
            maxHeight: '90%',
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Cookie size={18} color={colors.warning} />
              <Text style={{ ...typography.h3, color: colors.textPrimary }}>Catat Snacking & Pemicu</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
            {/* Water Intercept Prompt */}
            {!waterPrompted ? (
              <View style={{ backgroundColor: colors.infoSubtle, padding: spacing.md, borderRadius: radius.md, gap: 8, borderWidth: 1, borderColor: colors.info }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Droplet size={18} color={colors.info} />
                  <Text style={{ ...typography.bodyMedium, color: colors.info, fontWeight: '700' }}>Tunggu Sebentar!</Text>
                </View>
                <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                  Kadang rasa lapar sebenarnya adalah haus. Coba minum 1 gelas air putih dan tunggu 10 menit?
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: colors.info, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.sm, alignSelf: 'flex-start', marginTop: 4 }}
                  onPress={handleWaterIntercept}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>💧 Minum 1 Gelas Air Dulu</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ backgroundColor: colors.primarySubtle, padding: spacing.sm + 2, borderRadius: radius.sm }}>
                <Text style={{ fontSize: 12, color: colors.primaryText, textAlign: 'center', fontWeight: '600' }}>
                  ✓ Air minum telah dicatat! Jika masih lapar, silakan catat cemilan Anda di bawah.
                </Text>
              </View>
            )}

            {/* Trigger Selection */}
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' }}>Apa Pemicu Ingin Ngemil?</Text>
              <View style={{ gap: spacing.xs }}>
                {TRIGGER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.type}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: selectedTrigger === opt.type ? colors.surfaceElevated : 'transparent',
                      padding: spacing.sm + 2,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: selectedTrigger === opt.type ? opt.color : colors.divider,
                    }}
                    onPress={() => setSelectedTrigger(opt.type)}
                  >
                    <Text style={{ fontSize: 18 }}>{opt.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>{opt.label}</Text>
                      <Text style={{ ...typography.caption, color: colors.textTertiary }}>{opt.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Snack Food Text */}
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' }}>Nama / Deskripsi Cemilan</Text>
              <TextInput
                style={{
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.divider,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: colors.textPrimary,
                  fontSize: 13,
                }}
                placeholder="misal: 2 keping biskuit cokelat + 1 cangkir kopi manis"
                placeholderTextColor={colors.textTertiary}
                value={snackText}
                onChangeText={setSnackText}
              />
            </View>

            {errorMsg ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerSubtle, padding: 10, borderRadius: radius.sm }}>
                <AlertCircle size={14} color={colors.danger} />
                <Text style={{ fontSize: 12, color: colors.danger, flex: 1 }}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.warning,
                paddingVertical: 14,
                borderRadius: radius.md,
                opacity: (!snackText.trim() || loadingAI) ? 0.4 : 1,
                marginTop: spacing.sm,
              }}
              onPress={handleParseAndSubmit}
              disabled={!snackText.trim() || loadingAI}
            >
              {loadingAI ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Sparkles size={18} color="#FFFFFF" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Analisis & Catat Snack</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
