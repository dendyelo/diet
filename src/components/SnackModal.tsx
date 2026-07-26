import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
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
      // 100% Gemini AI Cloud Determination
      const result = await parseFoodNutritionWithAI(snackText, userApiKey);

      onSubmitSnack(
        result.name,
        result.nutrition,
        selectedTrigger,
        result.itemsBreakdown
      );

      setSnackText('');
      setErrorMsg('');
      onClose();
    } catch (error: any) {
      setErrorMsg(error.message || 'Gagal menghitung cemilan dengan Gemini AI.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleWaterClick = () => {
    onDrinkWater();
    setWaterPrompted(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Cookie size={20} color="#F59E0B" />
              <Text style={styles.sheetTitle}>Catat Ngemil (Gemini AI Cloud)</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {errorMsg !== '' && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Water Check Banner */}
            <View style={styles.waterBanner}>
              <Droplet size={18} color="#3B82F6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.waterTitle}>Cek Hidrasi Dulu!</Text>
                <Text style={styles.waterDesc}>
                  60% keinginan ngemil adalah sinyal haus terselubung.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.waterBtn,
                  waterPrompted && { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                ]}
                onPress={handleWaterClick}
              >
                <Text
                  style={[
                    styles.waterBtnText,
                    waterPrompted && { color: '#10B981' },
                  ]}
                >
                  {waterPrompted ? '✓ Minum' : '+ Minum Air'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Select Emotional Trigger */}
            <Text style={styles.sectionLabel}>APA PEMICU KEINGINAN NGEMIL?</Text>
            <View style={styles.triggerGrid}>
              {TRIGGER_OPTIONS.map((t) => {
                const isSelected = selectedTrigger === t.type;
                return (
                  <TouchableOpacity
                    key={t.type}
                    style={[
                      styles.triggerCard,
                      isSelected && {
                        borderColor: t.color,
                        backgroundColor: t.color + '20',
                      },
                    ]}
                    onPress={() => setSelectedTrigger(t.type)}
                  >
                    <Text style={styles.triggerEmoji}>{t.emoji}</Text>
                    <Text style={[styles.triggerText, isSelected && { color: t.color, fontWeight: 'bold' }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Snack Input */}
            <Text style={styles.sectionLabel}>APA YANG ANDA CEMIL / MINUM?</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Contoh: Boba brown sugar, 1 bungkus keripik singkong, atau kopi susu"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              multiline={true}
              numberOfLines={3}
              value={snackText}
              onChangeText={(text) => {
                setSnackText(text);
                if (errorMsg) setErrorMsg('');
              }}
            />
            <Text style={styles.hintText}>
              💡 Gemini AI Cloud akan otomatis menghitung kalori & nutrisinya secara presisi. Anda selalu bisa mengeditnya di riwayat nanti!
            </Text>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loadingAI && { opacity: 0.6 }]}
              onPress={handleParseAndSubmit}
              disabled={loadingAI}
            >
              {loadingAI ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Sparkles size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Hitung & Simpan dengan Gemini AI</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '82%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
    flex: 1,
    lineHeight: 16,
  },
  waterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginBottom: 16,
  },
  waterTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#60A5FA',
  },
  waterDesc: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  waterBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  waterBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 12,
    marginBottom: 8,
  },
  triggerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  triggerCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  triggerEmoji: {
    fontSize: 18,
  },
  triggerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 6,
    lineHeight: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
    marginBottom: 20,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
