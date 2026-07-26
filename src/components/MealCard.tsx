import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MealLog } from '../types';
import { TRIGGER_OPTIONS } from '../utils/habitAnalytics';
import { useTheme } from '../context/ThemeContext';
import { Surface } from './Surface';

interface MealCardProps {
  log: MealLog;
  onEdit: (log: MealLog) => void;
  onDelete: (id: string) => void;
}

export const MealCard: React.FC<MealCardProps> = ({ log, onEdit, onDelete }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const triggerInfo = log.trigger
    ? TRIGGER_OPTIONS.find((trigger) => trigger.type === log.trigger)
    : null;
  const time = new Date(log.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const visibleItems = log.itemsBreakdown?.slice(0, 3) ?? [];
  const hiddenItemCount = Math.max(0, (log.itemsBreakdown?.length ?? 0) - visibleItems.length);

  return (
    <Surface
      accessibilityLabel={`${log.isSnack ? 'Snack' : 'Makan'}, ${log.name}, ${
        log.nutrition.calories
      } kilokalori`}
      style={{
        padding: spacing.md,
        marginBottom: spacing.sm,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: log.isSnack ? colors.warning : colors.primary,
            }}
          />
          <Text style={{ ...typography.overline, color: colors.textTertiary }}>
            {log.isSnack ? 'SNACK' : 'MAKAN'}
          </Text>
        </View>
        <Text style={{ ...typography.caption, color: colors.textTertiary }}>{time}</Text>
      </View>

      <Text
        style={{
          ...typography.h3,
          color: colors.textPrimary,
          marginBottom: spacing.sm,
        }}
        numberOfLines={2}
      >
        {log.name}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
        <Text
          style={{
            fontSize: 25,
            lineHeight: 31,
            fontWeight: '600',
            letterSpacing: -0.5,
            color: colors.textPrimary,
          }}
        >
          {log.nutrition.calories}
        </Text>
        <Text style={{ ...typography.caption, color: colors.textTertiary }}>kcal</Text>
      </View>

      <Text
        style={{
          ...typography.caption,
          color: colors.textSecondary,
          marginTop: 3,
        }}
      >
        P {log.nutrition.proteinGrams} g · K {log.nutrition.carbsGrams} g · L{' '}
        {log.nutrition.fatGrams} g
      </Text>

      {visibleItems.length > 0 ? (
        <View
          style={{
            marginTop: spacing.md,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.divider,
            gap: 5,
          }}
        >
          {visibleItems.map((item, index) => (
            <View
              key={`${item.name}-${index}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Text
                style={{ ...typography.caption, color: colors.textSecondary, flex: 1 }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                {item.calories} kcal
              </Text>
            </View>
          ))}
          {hiddenItemCount > 0 ? (
            <Text style={{ ...typography.caption, color: colors.textTertiary }}>
              +{hiddenItemCount} item lain
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: spacing.md,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
        }}
      >
        <View style={{ flex: 1 }}>
          {triggerInfo ? (
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: radius.full,
                backgroundColor: colors.surfaceElevated,
              }}
            >
              <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                Pemicu · {triggerInfo.label}
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Edit ${log.name}`}
          onPress={() => onEdit(log)}
          style={{
            minWidth: 52,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...typography.caption, color: colors.textSecondary }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Hapus ${log.name}`}
          onPress={() => onDelete(log.id)}
          style={{
            minWidth: 58,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...typography.caption, color: colors.danger }}>Hapus</Text>
        </TouchableOpacity>
      </View>
    </Surface>
  );
};
