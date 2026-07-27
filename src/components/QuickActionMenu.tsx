import React from 'react';
import {
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

type QuickAction = 'food' | 'activity' | 'water' | 'weight';

interface QuickActionMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: QuickAction) => void;
}

const ACTIONS: { action: QuickAction; label: string; detail: string }[] = [
  { action: 'food', label: 'Makan atau snack', detail: 'Catat asupan' },
  { action: 'activity', label: 'Aktivitas', detail: 'Ceritakan ke AI' },
  { action: 'water', label: 'Air minum', detail: 'Tambah satu gelas' },
  { action: 'weight', label: 'Berat badan', detail: 'Perbarui progres' },
];

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({
  visible,
  onClose,
  onSelectAction,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const handleAction = (action: QuickAction) => {
    onClose();
    requestAnimationFrame(() => onSelectAction(action));
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
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
                  marginBottom: spacing.md,
                }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: spacing.md,
                }}
              >
                <View>
                  <Text style={{ ...typography.h2, color: colors.textPrimary }}>Tambah</Text>
                  <Text
                    style={{
                      ...typography.caption,
                      color: colors.textTertiary,
                      marginTop: 3,
                    }}
                  >
                    Pilih satu catatan.
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Tutup menu tambah"
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
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: colors.divider,
                  borderRadius: radius.md,
                }}
              >
                {ACTIONS.map((item, index) => (
                  <TouchableOpacity
                    key={item.action}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label}. ${item.detail}`}
                    activeOpacity={0.65}
                    onPress={() => handleAction(item.action)}
                    style={{
                      minHeight: 58,
                      flexDirection: 'row',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      gap: spacing.md,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.divider,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.overline,
                        color: item.action === 'food' ? colors.primaryText : colors.textTertiary,
                        width: 24,
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <Text
                      style={{
                        ...typography.bodyMedium,
                        color: colors.textPrimary,
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        ...typography.caption,
                        color: colors.textTertiary,
                        flexShrink: 1,
                        textAlign: 'right',
                      }}
                    >
                      {item.detail}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};
