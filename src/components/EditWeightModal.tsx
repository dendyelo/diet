import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (visible && weightLog) {
      setWeight(String(weightLog.weightKg));
      setNote(weightLog.note || '');
      setError('');
      setDeleting(false);
    }
  }, [visible, weightLog]);

  const handleSave = () => {
    if (!weightLog) return;

    const parsedWeight = Number.parseFloat(weight.replace(',', '.'));
    if (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 300) {
      setError('Masukkan berat antara 20–300 kg.');
      return;
    }

    onSave(weightLog.id, {
      weightKg: parsedWeight,
      note: note.trim() || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!weightLog || isOnlyLog || deleting) return;

    Alert.alert('Hapus catatan?', 'Data berat ini akan dihapus dari progresmu.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const deleted = await onDelete(weightLog.id);
          setDeleting(false);
          if (deleted) {
            onClose();
          } else {
            setError('Catatan ini belum bisa dihapus.');
          }
        },
      },
    ]);
  };

  if (!weightLog) return null;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
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
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                Keyboard.dismiss();
              }}
            >
              <View
                style={{
                  width: '100%',
                  maxWidth: 560,
                  alignSelf: 'center',
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
                    marginBottom: spacing.lg,
                  }}
                />

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                    EDIT BERAT
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Tutup edit berat badan"
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

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    justifyContent: 'center',
                    paddingVertical: spacing.lg,
                  }}
                >
                  <TextInput
                    accessibilityLabel="Berat badan dalam kilogram"
                    selectTextOnFocus
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={(text) => {
                      setWeight(text);
                      setError('');
                    }}
                    placeholder="0,0"
                    placeholderTextColor={colors.textDisabled}
                    style={{
                      minWidth: 130,
                      color: colors.textPrimary,
                      fontSize: 44,
                      lineHeight: 52,
                      fontWeight: '500',
                      letterSpacing: -1.5,
                      textAlign: 'right',
                      paddingVertical: 0,
                    }}
                  />
                  <Text
                    style={{
                      ...typography.h3,
                      color: colors.textTertiary,
                      marginLeft: spacing.sm,
                    }}
                  >
                    kg
                  </Text>
                </View>

                {error ? (
                  <Text
                    accessibilityRole="alert"
                    style={{
                      ...typography.caption,
                      color: colors.danger,
                      textAlign: 'center',
                      marginBottom: spacing.md,
                    }}
                  >
                    {error}
                  </Text>
                ) : null}

                <TextInput
                  accessibilityLabel="Catatan berat badan"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Catatan, opsional"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  maxLength={160}
                  style={{
                    minHeight: 72,
                    maxHeight: 112,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: colors.divider,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceElevated,
                    color: colors.textPrimary,
                    ...typography.body,
                    textAlignVertical: 'top',
                  }}
                />

                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.sm,
                    marginTop: spacing.md,
                  }}
                >
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={
                      isOnlyLog ? 'Catatan awal tidak dapat dihapus' : 'Hapus catatan berat'
                    }
                    accessibilityState={{ disabled: isOnlyLog || deleting }}
                    disabled={isOnlyLog || deleting}
                    onPress={handleDelete}
                    style={{
                      minWidth: 80,
                      minHeight: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radius.md,
                      opacity: isOnlyLog || deleting ? 0.35 : 1,
                    }}
                  >
                    <Text style={{ ...typography.bodyMedium, color: colors.danger }}>Hapus</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    onPress={handleSave}
                    style={{
                      flex: 1,
                      minHeight: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radius.md,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.bodyMedium,
                        color: colors.onPrimary,
                        fontWeight: '600',
                      }}
                    >
                      Simpan perubahan
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
