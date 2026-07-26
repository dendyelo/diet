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
import { parseFoodNutritionWithAI } from '../services/aiService';
import { NutritionData, FoodItemBreakdown } from '../types';
import { X, Sparkles, Clock, Utensils, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface AddMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveMeal: (
    name: string,
    nutrition: NutritionData,
    customTimestamp?: string,
    itemsBreakdown?: FoodItemBreakdown[]
  ) => void;
  userApiKey?: string;
}

const TIME_OPTIONS = [
  { label: 'Baru Saja', offsetMinutes: 0 },
  { label: '30m Lalu', offsetMinutes: 30 },
  { label: '1j Lalu', offsetMinutes: 60 },
  { label: '2j Lalu', offsetMinutes: 120 },
];

export const AddMealModal: React.FC<AddMealModalProps> = ({
  visible,
  onClose,
  onSaveMeal,
  userApiKey,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [foodText, setFoodText] = useState<string>('');
  const [selectedTimeOffset, setSelectedTimeOffset] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleParseAndSave = async () => {
    if (!foodText.trim()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const result = await parseFoodNutritionWithAI(foodText, userApiKey);
      const timestamp = new Date(Date.now() - selectedTimeOffset * 60 * 1000).toISOString();

      onSaveMeal(result.name, result.nutrition, timestamp, result.itemsBreakdown);
      setFoodText('');
      setErrorMsg('');
      onClose();
    } catch {
      setErrorMsg('Gagal menganalisis makanan. Pastikan koneksi atau input Anda jelas.');
    } finally {
      setLoading(false);
    }
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
              <Utensils size={18} color={colors.primary} />
              <Text style={{ ...typography.h3, color: colors.textPrimary }}>Catat Makanan</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
            {/* Food Input */}
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' }}>
                Nama & Porsi Makanan
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
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
                placeholder="misal: 1 piring nasi uduk + 1 telur balado + es teh less sugar"
                placeholderTextColor={colors.textTertiary}
                value={foodText}
                onChangeText={setFoodText}
                multiline
              />
            </View>

            {/* Time Selection */}
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' }}>
                Waktu Makan
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs + 4 }}>
                {TIME_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.offsetMinutes}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      backgroundColor: selectedTimeOffset === opt.offsetMinutes ? colors.primarySubtle : colors.surfaceElevated,
                      borderWidth: 1,
                      borderColor: selectedTimeOffset === opt.offsetMinutes ? colors.primary : colors.divider,
                    }}
                    onPress={() => setSelectedTimeOffset(opt.offsetMinutes)}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: selectedTimeOffset === opt.offsetMinutes ? colors.primaryText : colors.textSecondary,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {errorMsg ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerSubtle, padding: 10, borderRadius: radius.sm }}>
                <AlertCircle size={14} color={colors.danger} />
                <Text style={{ fontSize: 12, color: colors.danger, flex: 1 }}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
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
                marginTop: spacing.sm,
              }}
              onPress={handleParseAndSave}
              disabled={!foodText.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Sparkles size={18} color="#FFFFFF" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Analisis & Simpan</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
