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
import { parseFoodNutritionWithAI } from '../services/aiService';
import { NutritionData, FoodItemBreakdown } from '../types';
import { X, Sparkles, Clock, Utensils, AlertCircle } from 'lucide-react-native';

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
    } catch (error: any) {
      setErrorMsg(error.message || 'Gagal menghitung kalori dengan Gemini AI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Utensils size={20} color="#60A5FA" />
              <Text style={styles.sheetTitle}>Catat Makanan (Gemini AI Cloud)</Text>
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

            {/* Time Picker Back-Dating */}
            <Text style={styles.sectionLabel}>KAPAN ANDA MAKAN INI?</Text>
            <View style={styles.timeGrid}>
              {TIME_OPTIONS.map((opt) => {
                const isSelected = selectedTimeOffset === opt.offsetMinutes;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                    onPress={() => setSelectedTimeOffset(opt.offsetMinutes)}
                  >
                    <Clock size={12} color={isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
                    <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Food Input */}
            <Text style={styles.sectionLabel}>APA YANG ANDA MAKAN?</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Contoh: Nasi, telur dadar, ayam bakar, dan sambal"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              multiline={true}
              numberOfLines={4}
              value={foodText}
              onChangeText={(text) => {
                setFoodText(text);
                if (errorMsg) setErrorMsg('');
              }}
            />
            <Text style={styles.hintText}>
              💡 Gemini AI Cloud akan otomatis merinci kalori masing-masing item (nasi: x kcal, telur: x kcal, ayam: x kcal).
            </Text>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleParseAndSave}
              disabled={loading}
            >
              {loading ? (
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
    maxHeight: '80%',
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
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 12,
    marginBottom: 8,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  timeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  timeChipText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
    minHeight: 100,
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
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    marginBottom: 20,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
