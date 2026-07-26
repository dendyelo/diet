import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Utensils, Droplets, Scale, Timer, X } from 'lucide-react-native';
import { theme } from '../theme';

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
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              <Text style={styles.menuTitle}>Catat Sesuatu</Text>

              {/* Quick Action Grid Buttons */}
              <View style={styles.gridContainer}>
                {/* Food */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.primarySubtle, borderColor: theme.colors.primary }]}
                  onPress={() => handleAction('food')}
                  activeOpacity={0.7}
                >
                  <Utensils size={24} color={theme.colors.primary} />
                  <Text style={[styles.actionLabel, { color: theme.colors.primaryText }]}>Makan</Text>
                </TouchableOpacity>

                {/* Water */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.waterSubtle, borderColor: theme.colors.water }]}
                  onPress={() => handleAction('water')}
                  activeOpacity={0.7}
                >
                  <Droplets size={24} color={theme.colors.water} />
                  <Text style={[styles.actionLabel, { color: '#60A5FA' }]}>Air Minum</Text>
                </TouchableOpacity>

                {/* Weight */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.weightSubtle, borderColor: theme.colors.weight }]}
                  onPress={() => handleAction('weight')}
                  activeOpacity={0.7}
                >
                  <Scale size={24} color={theme.colors.weight} />
                  <Text style={[styles.actionLabel, { color: '#C084FC' }]}>Berat Badan</Text>
                </TouchableOpacity>

                {/* Fasting */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.warningSubtle, borderColor: theme.colors.warning }]}
                  onPress={() => handleAction('fasting')}
                  activeOpacity={0.7}
                >
                  <Timer size={24} color={theme.colors.warning} />
                  <Text style={[styles.actionLabel, { color: '#FBBF24' }]}>Puasa</Text>
                </TouchableOpacity>
              </View>

              {/* Close Button */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 90,
  },
  menuContainer: {
    width: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  actionBtn: {
    width: '48%',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: theme.spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
