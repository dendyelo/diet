import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MealLog } from '../types';
import { TRIGGER_OPTIONS } from '../utils/habitAnalytics';
import { Trash2, Cookie, Utensils, Edit3 } from 'lucide-react-native';
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
    ? TRIGGER_OPTIONS.find((t) => t.type === log.trigger)
    : null;

  const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Surface
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: spacing.sm + 4,
        marginVertical: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2, flex: 1 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
            backgroundColor: log.isSnack ? colors.warningSubtle : colors.infoSubtle,
          }}
        >
          {log.isSnack ? (
            <Cookie size={16} color={colors.warning} />
          ) : (
            <Utensils size={16} color={colors.info} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 6 }}>
            <Text style={{ ...typography.bodyMedium, color: colors.textPrimary, flex: 1 }} numberOfLines={2}>
              {log.name}
            </Text>
            <Text style={{ ...typography.caption, color: colors.textTertiary }} numberOfLines={1}>
              {timeStr}
            </Text>
          </View>

          {/* Itemized Food Calorie Breakdown List */}
          {log.itemsBreakdown && log.itemsBreakdown.length > 0 && (
            <View
              style={{
                backgroundColor: colors.surfaceElevated,
                borderRadius: radius.sm,
                padding: spacing.xs + 4,
                marginVertical: 6,
                borderWidth: 1,
                borderColor: colors.divider,
              }}
            >
              {log.itemsBreakdown.map((item, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: 2 }}>
                  <Text style={{ color: colors.info, fontSize: 12, fontWeight: 'bold' }}>•</Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
                    {item.name}:
                  </Text>
                  <Text style={{ ...typography.caption, fontWeight: 'bold', color: colors.info }} numberOfLines={1}>
                    {item.calories} kcal
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryText }} numberOfLines={1}>
              Total: {log.nutrition.calories} kcal
            </Text>
            <Text style={{ ...typography.caption, color: colors.textTertiary }} numberOfLines={1}>
              P: {log.nutrition.proteinGrams}g
            </Text>
            <Text style={{ ...typography.caption, color: colors.textTertiary }} numberOfLines={1}>
              K: {log.nutrition.carbsGrams}g
            </Text>
            <Text style={{ ...typography.caption, color: colors.textTertiary }} numberOfLines={1}>
              L: {log.nutrition.fatGrams}g
            </Text>
          </View>

          {triggerInfo && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                alignSelf: 'flex-start',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: radius.sm,
                marginTop: 4,
                backgroundColor: triggerInfo.color + '20',
              }}
            >
              <Text style={{ fontSize: 11 }}>{triggerInfo.emoji}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: triggerInfo.color }} numberOfLines={1}>
                {triggerInfo.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 6 }}>
        <TouchableOpacity onPress={() => onEdit(log)} style={{ padding: 6 }}>
          <Edit3 size={16} color={colors.info} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onDelete(log.id)} style={{ padding: 6 }}>
          <Trash2 size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </Surface>
  );
};
