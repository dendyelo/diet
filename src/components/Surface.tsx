import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { theme } from '../theme';

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
  return (
    <View
      style={[
        styles.card,
        variant === 'subtle' && styles.cardSubtle,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  cardSubtle: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.borderSubtle,
  },
});
