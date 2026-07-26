import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from './GlassCard';

interface InlineCoachCardProps {
  adviceText: string;
  actionLabel?: string;
  onActionPress?: () => void;
  onOpenChatPress?: () => void;
}

export const InlineCoachCard: React.FC<InlineCoachCardProps> = ({
  adviceText,
  actionLabel,
  onActionPress,
  onOpenChatPress,
}) => {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.titleText}>Coach</Text>
      </View>

      <Text style={styles.adviceText}>{adviceText}</Text>

      <View style={styles.btnRow}>
        {actionLabel && onActionPress && (
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={onActionPress}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}

        {onOpenChatPress && (
          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={onOpenChatPress}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryActionText}>Tanya Coach</Text>
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 22,
    marginVertical: 6,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.3,
  },
  adviceText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  primaryActionBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
