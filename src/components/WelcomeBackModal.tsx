import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Calendar, HeartHandshake } from 'lucide-react-native';

interface WelcomeBackModalProps {
  visible: boolean;
  onFreshStart: () => void;
  onDismiss: () => void;
}

export const WelcomeBackModal: React.FC<WelcomeBackModalProps> = ({
  visible,
  onFreshStart,
  onDismiss,
}) => {
  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <HeartHandshake size={32} color="#10B981" />
          </View>

          <Text style={styles.title}>Selamat Datang Kembali! 🌱</Text>
          <Text style={styles.message}>
            Perjalanan kesehatan adalah maraton jangka panjang, bukan tentang kesempurnaan setiap hari.
            Tidak masalah jika kamu terlewat beberapa hari — yang terpenting adalah keberanian untuk mulai lagi!
          </Text>

          <TouchableOpacity style={styles.freshBtn} onPress={onFreshStart}>
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.freshBtnText}>Mulai Segar Hari Ini (Fresh Start)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Calendar size={16} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.dismissBtnText}>Lanjutkan Saja</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    width: '100%',
    maxWidth: 360,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  freshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  freshBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  dismissBtnText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
