import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Utensils, Droplets, Scale, Timer, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface QuickActionMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: 'food' | 'water' | 'weight' | 'fasting') => void;
}

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({
  visible,
  onClose,
  onSelectAction,
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  if (!visible) return null;

  const handleAction = (action: 'food' | 'water' | 'weight' | 'fasting') => {
    onClose();
    requestAnimationFrame(() => {
      onSelectAction(action);
    });
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 90,
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                width: '90%',
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                padding: spacing.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.divider,
              }}
            >
              <Text
                style={{
                  ...typography.caption,
                  fontWeight: '700',
                  color: colors.textTertiary,
                  letterSpacing: 0.5,
                  marginBottom: spacing.md,
                  textTransform: 'uppercase',
                }}
              >
                Catat Sesuatu
              </Text>

              {/* Quick Action Grid Buttons */}
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  gap: spacing.sm + 4,
                  width: '100%',
                }}
              >
                {/* Food */}
                <TouchableOpacity
                  style={{
                    width: '48%',
                    paddingVertical: 18,
                    paddingHorizontal: 12,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    backgroundColor: colors.primarySubtle,
                    borderColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
                  }}
                  onPress={() => handleAction('food')}
                  activeOpacity={0.7}
                >
                  <Utensils size={24} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primaryText }}>Makan</Text>
                </TouchableOpacity>

                {/* Water */}
                <TouchableOpacity
                  style={{
                    width: '48%',
                    paddingVertical: 18,
                    paddingHorizontal: 12,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    backgroundColor: colors.infoSubtle,
                    borderColor: colors.info,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
                  }}
                  onPress={() => handleAction('water')}
                  activeOpacity={0.7}
                >
                  <Droplets size={24} color={colors.info} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.info }}>Air Minum</Text>
                </TouchableOpacity>

                {/* Weight */}
                <TouchableOpacity
                  style={{
                    width: '48%',
                    paddingVertical: 18,
                    paddingHorizontal: 12,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    backgroundColor: colors.weightSubtle,
                    borderColor: colors.weight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
                  }}
                  onPress={() => handleAction('weight')}
                  activeOpacity={0.7}
                >
                  <Scale size={24} color={colors.weight} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.weight }}>Berat Badan</Text>
                </TouchableOpacity>

                {/* Fasting */}
                <TouchableOpacity
                  style={{
                    width: '48%',
                    paddingVertical: 18,
                    paddingHorizontal: 12,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    backgroundColor: colors.warningSubtle,
                    borderColor: colors.warning,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
                  }}
                  onPress={() => handleAction('fasting')}
                  activeOpacity={0.7}
                >
                  <Timer size={24} color={colors.warning} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.warning }}>Puasa</Text>
                </TouchableOpacity>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={{
                  marginTop: spacing.md,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.surfaceElevated,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
