import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Surface } from './Surface';
import { theme } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  // Smooth LayoutAnimation on advice change (Directive 4)
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [adviceText]);

  return (
    <Surface style={styles.card}>
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
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginVertical: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryText,
    letterSpacing: 0.3,
  },
  adviceText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  btnRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  primaryActionBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
