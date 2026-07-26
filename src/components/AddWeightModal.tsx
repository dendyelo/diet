import React, { useEffect, useState } from 'react';
import {
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
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setWeight(lastWeight ? String(lastWeight) : '');
      setNote('');
      setError('');
    }
  }, [lastWeight, visible]);

  const handleSave = () => {
    const parsedWeight = Number.parseFloat(weight.replace(',', '.'));
    if (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 300) {
      setError('Masukkan berat antara 20–300 kg.');
      return;
    }

    onSave(parsedWeight, note.trim() || undefined);
    setWeight('');
    setNote('');
    onClose();
  };

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

                <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                  BERAT HARI INI
                </Text>
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
                    autoFocus
                    selectTextOnFocus
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={(text) => {
                      setWeight(text);
                      setError('');
                    }}
                    placeholder={lastWeight ? String(lastWeight) : '0,0'}
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
                    onPress={onClose}
                    style={{
                      flex: 1,
                      minHeight: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: colors.divider,
                      borderRadius: radius.md,
                    }}
                  >
                    <Text style={{ ...typography.bodyMedium, color: colors.textSecondary }}>
                      Batal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    onPress={handleSave}
                    style={{
                      flex: 1.4,
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
                      Simpan
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
