import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AddWeightModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (weightKg: number, note?: string) => void;
  lastWeight: number | null;
}

export const AddWeightModal: React.FC<AddWeightModalProps> = ({
  visible,
  onClose,
  onSave,
  lastWeight,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setWeight(lastWeight ? lastWeight.toString() : '');
      setNote('');
      setError('');
    }
  }, [visible, lastWeight]);

  const handleSave = () => {
    const parsedWeight = parseFloat(weight.replace(',', '.'));
    if (isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 300) {
      setError('Berat badan harus antara 20 dan 300 kg');
      return;
    }

    onSave(parsedWeight, note.trim() !== '' ? note.trim() : undefined);
    setWeight('');
    setNote('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: spacing.md }}>
          <View style={{ width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.divider }}>
            <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg, textAlign: 'center' }}>
              ⚖️ Catat Berat Badan
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
              <TextInput
                style={{ fontSize: 32, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center', minWidth: 100 }}
                value={weight}
                onChangeText={(text) => {
                  setWeight(text);
                  setError('');
                }}
                keyboardType="decimal-pad"
                placeholder={lastWeight ? lastWeight.toString() : '0.0'}
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={{ fontSize: 24, color: colors.textTertiary, marginLeft: 8, marginTop: 4 }}>kg</Text>
            </View>

            {error ? <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: spacing.md }}>{error}</Text> : null}

            <TextInput
              style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: 16, minHeight: 80, textAlignVertical: 'top', marginBottom: spacing.lg }}
              value={note}
              onChangeText={setNote}
              placeholder="Catatan opsional..."
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                style={{ flex: 1, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' }}
                onPress={onClose}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '600' }}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}
                onPress={handleSave}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
