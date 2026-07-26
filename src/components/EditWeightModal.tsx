import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { WeightLog } from '../types';
import { useTheme } from '../context/ThemeContext';

interface EditWeightModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, updatedFields: { weightKg?: number; note?: string }) => void;
  onDelete: (id: string) => Promise<boolean>;
  weightLog: WeightLog | null;
  /** When true, the delete button is disabled (e.g. only one log remaining) */
  isOnlyLog?: boolean;
}

export const EditWeightModal: React.FC<EditWeightModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  weightLog,
  isOnlyLog = false,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && weightLog) {
      setWeight(weightLog.weightKg.toString());
      setNote(weightLog.note || '');
      setError('');
    }
  }, [visible, weightLog]);

  const handleSave = () => {
    if (!weightLog) return;

    const parsedWeight = parseFloat(weight.replace(',', '.'));
    if (isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 300) {
      setError('Berat badan harus antara 20 dan 300 kg');
      return;
    }

    onSave(weightLog.id, {
      weightKg: parsedWeight,
      note: note.trim() !== '' ? note.trim() : undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!weightLog || isOnlyLog) return;

    Alert.alert(
      'Hapus Data',
      'Apakah Anda yakin ingin menghapus catatan berat badan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const deleted = await onDelete(weightLog.id);
            if (deleted) {
              onClose();
            } else {
              setError('Tidak bisa menghapus satu-satunya catatan berat badan');
            }
          },
        },
      ]
    );
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
              ✏️ Edit Berat Badan
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
                placeholder="0.0"
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

            <View style={{ flexDirection: 'row', gap: spacing.xs + 4 }}>
              <TouchableOpacity
                style={{ flex: 1, height: 48, borderRadius: radius.md, backgroundColor: colors.danger + '20', borderWidth: 1, borderColor: colors.danger + '50', justifyContent: 'center', alignItems: 'center', opacity: isOnlyLog ? 0.3 : 1 }}
                onPress={handleDelete}
                disabled={isOnlyLog}
              >
                <Text style={{ color: colors.danger, fontSize: 14, fontWeight: '600' }}>Hapus</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' }}
                onPress={onClose}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}
                onPress={handleSave}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
