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

interface RadialMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: 'food' | 'water' | 'weight' | 'fasting') => void;
}

export const RadialMenuModal: React.FC<RadialMenuModalProps> = ({
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

              {/* Radial Grid Buttons */}
              <View style={styles.gridContainer}>
                {/* Food */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }]}
                  onPress={() => handleAction('food')}
                  activeOpacity={0.7}
                >
                  <Utensils size={24} color="#10B981" />
                  <Text style={[styles.actionLabel, { color: '#34D399' }]}>Makan</Text>
                </TouchableOpacity>

                {/* Water */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3B82F6' }]}
                  onPress={() => handleAction('water')}
                  activeOpacity={0.7}
                >
                  <Droplets size={24} color="#3B82F6" />
                  <Text style={[styles.actionLabel, { color: '#60A5FA' }]}>Air Minum</Text>
                </TouchableOpacity>

                {/* Weight */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: '#A855F7' }]}
                  onPress={() => handleAction('weight')}
                  activeOpacity={0.7}
                >
                  <Scale size={24} color="#A855F7" />
                  <Text style={[styles.actionLabel, { color: '#C084FC' }]}>Berat Badan</Text>
                </TouchableOpacity>

                {/* Fasting */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' }]}
                  onPress={() => handleAction('fasting')}
                  activeOpacity={0.7}
                >
                  <Timer size={24} color="#F59E0B" />
                  <Text style={[styles.actionLabel, { color: '#FBBF24' }]}>Puasa</Text>
                </TouchableOpacity>
              </View>

              {/* Close Button */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <X size={20} color="rgba(255, 255, 255, 0.6)" />
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
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    marginBottom: 16,
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
    borderRadius: 20,
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
    marginTop: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
