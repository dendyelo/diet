import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MealLog } from '../types';
import { TRIGGER_OPTIONS } from '../utils/habitAnalytics';
import { Trash2, Cookie, Utensils, Edit3 } from 'lucide-react-native';

interface MealCardProps {
  log: MealLog;
  onEdit: (log: MealLog) => void;
  onDelete: (id: string) => void;
}

export const MealCard: React.FC<MealCardProps> = ({ log, onEdit, onDelete }) => {
  const triggerInfo = log.trigger
    ? TRIGGER_OPTIONS.find((t) => t.type === log.trigger)
    : null;

  const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.card}>
      <View style={styles.leftRow}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: log.isSnack ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)' },
          ]}
        >
          {log.isSnack ? (
            <Cookie size={16} color="#F59E0B" />
          ) : (
            <Utensils size={16} color="#3B82F6" />
          )}
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={2}>{log.name}</Text>
            <Text style={styles.time} numberOfLines={1}>{timeStr}</Text>
          </View>

          {/* Itemized Food Calorie Breakdown List */}
          {log.itemsBreakdown && log.itemsBreakdown.length > 0 && (
            <View style={styles.breakdownContainer}>
              {log.itemsBreakdown.map((item, index) => (
                <View key={index} style={styles.breakdownItem}>
                  <Text style={styles.breakdownDot}>•</Text>
                  <Text style={styles.breakdownName} numberOfLines={1}>{item.name}:</Text>
                  <Text style={styles.breakdownCal} numberOfLines={1}>{item.calories} kcal</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.macroRow}>
            <Text style={styles.calBadge} numberOfLines={1}>Total: {log.nutrition.calories} kcal</Text>
            <Text style={styles.macroText} numberOfLines={1}>P: {log.nutrition.proteinGrams}g</Text>
            <Text style={styles.macroText} numberOfLines={1}>K: {log.nutrition.carbsGrams}g</Text>
            <Text style={styles.macroText} numberOfLines={1}>L: {log.nutrition.fatGrams}g</Text>
          </View>

          {triggerInfo && (
            <View style={[styles.triggerPill, { backgroundColor: triggerInfo.color + '20' }]}>
              <Text style={styles.triggerEmoji}>{triggerInfo.emoji}</Text>
              <Text style={[styles.triggerText, { color: triggerInfo.color }]} numberOfLines={1}>
                {triggerInfo.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={() => onEdit(log)} style={styles.actionBtn}>
          <Edit3 size={16} color="#60A5FA" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onDelete(log.id)} style={styles.actionBtn}>
          <Trash2 size={16} color="rgba(255, 255, 255, 0.3)" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  time: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  breakdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 2,
  },
  breakdownDot: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  breakdownName: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    flex: 1,
  },
  breakdownCal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#60A5FA',
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  calBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#34D399',
  },
  macroText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  triggerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  triggerEmoji: {
    fontSize: 11,
  },
  triggerText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 6,
  },
  actionBtn: {
    padding: 6,
  },
});
