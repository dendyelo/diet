import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface SurfaceProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'surface' | 'subtle';
}

export const Surface: React.FC<SurfaceProps> = ({
  children,
  variant = 'surface',
  style,
  ...props
}) => {
  const { colors, isDark, radius, spacing } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor:
            variant === 'subtle' ? colors.surfaceElevated : colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.06)',
          padding: spacing.md,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.18 : 0.03,
          shadowRadius: 6,
          elevation: isDark ? 0 : 2,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};
