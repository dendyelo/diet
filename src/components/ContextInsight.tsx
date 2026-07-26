import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ContextInsightProps {
  label: string;
  headline?: string;
  body?: string;
  loading?: boolean;
  error?: boolean;
  onOpen?: () => void;
  onRefresh?: () => void;
}

export function ContextInsight({
  label,
  headline,
  body,
  loading = false,
  error = false,
  onOpen,
  onRefresh,
}: ContextInsightProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.root,
        {
          borderTopColor: colors.divider,
          marginTop: spacing.md,
          paddingTop: spacing.md,
        },
      ]}
    >
      <View style={styles.topline}>
        <Text style={[typography.overline, { color: colors.textTertiary }]}>
          {label}
        </Text>
        {onRefresh ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Perbarui ${label}`}
            disabled={loading}
            hitSlop={10}
            onPress={onRefresh}
            style={({ pressed }) => ({
              minHeight: 32,
              justifyContent: 'center',
              opacity: loading ? 0.4 : pressed ? 0.5 : 1,
            })}
          >
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Perbarui
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            Membaca konteks terbaru…
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole={onOpen ? 'button' : undefined}
          accessibilityLabel={onOpen ? `Buka detail ${label}` : undefined}
          disabled={!onOpen}
          onPress={onOpen}
          style={({ pressed }) => [
            styles.copy,
            { opacity: pressed && onOpen ? 0.55 : 1 },
          ]}
        >
          <Text
            style={[
              typography.bodyMedium,
              { color: error ? colors.textTertiary : colors.textPrimary },
            ]}
          >
            {headline || (error ? 'Insight belum tersedia.' : 'Belum ada insight.')}
          </Text>
          {body ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {body}
            </Text>
          ) : null}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderTopWidth: 1,
    gap: 8,
  },
  topline: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  loadingRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copy: {
    minHeight: 44,
    justifyContent: 'center',
    gap: 4,
  },
});
