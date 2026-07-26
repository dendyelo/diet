import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Sparkles, Calendar, HeartHandshake } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

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
  const { colors, spacing, radius, typography } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.md }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.lg,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.divider,
            width: '100%',
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primarySubtle,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            <HeartHandshake size={32} color={colors.primary} />
          </View>

          <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs, textAlign: 'center' }}>
            Selamat Datang Kembali! 🌱
          </Text>
          <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg }}>
            Perjalanan kesehatan adalah maraton jangka panjang, bukan tentang kesempurnaan setiap hari.
            Tidak masalah jika kamu terlewat beberapa hari — yang terpenting adalah keberanian untuk mulai lagi!
          </Text>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: colors.primary,
              width: '100%',
              paddingVertical: 14,
              borderRadius: radius.md,
              marginBottom: spacing.sm,
            }}
            onPress={onFreshStart}
          >
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Mulai Segar Hari Ini (Fresh Start)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
            }}
            onPress={onDismiss}
          >
            <Calendar size={16} color={colors.textTertiary} />
            <Text style={{ fontSize: 13, color: colors.textTertiary, fontWeight: '600' }}>Lanjutkan Saja</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
