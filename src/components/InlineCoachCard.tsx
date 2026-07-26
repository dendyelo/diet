import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Surface } from './Surface';
import { useTheme } from '../context/ThemeContext';

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
  const { colors, radius, spacing, typography } = useTheme();

  // Smooth LayoutAnimation on advice change
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [adviceText]);

  return (
    <Surface style={{ borderColor: colors.primarySubtle, marginVertical: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
        <Text style={{ ...typography.caption, color: colors.primaryText, fontWeight: '700', letterSpacing: 0.3 }}>
          Coach
        </Text>
      </View>

      <Text style={{ ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.sm }}>
        {adviceText}
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        {actionLabel && onActionPress && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: spacing.md - 2,
              paddingVertical: spacing.xs + 4,
              borderRadius: radius.sm,
            }}
            onPress={onActionPress}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{actionLabel}</Text>
          </TouchableOpacity>
        )}

        {onOpenChatPress && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.surfaceElevated,
              paddingHorizontal: spacing.md - 2,
              paddingVertical: spacing.xs + 4,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.divider,
            }}
            onPress={onOpenChatPress}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Tanya Coach</Text>
          </TouchableOpacity>
        )}
      </View>
    </Surface>
  );
};
