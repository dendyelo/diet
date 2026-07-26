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
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: variant === 'subtle' ? colors.surfaceElevated : colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: variant === 'subtle' ? colors.divider : colors.border,
          padding: spacing.md,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};
