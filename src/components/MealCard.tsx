import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MealLog } from '../types';
import { TRIGGER_OPTIONS } from '../utils/habitAnalytics';
import { Trash2, Cookie, Utensils } from 'lucide-react-native';

interface MealCardProps {
  log: MealLog;
  onDelete: (id: string) => void;
}

export const MealCard: React.FC<MealCardProps> = ({ log, onDelete }) => {
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
            <Text style={styles.name}>{log.name}</Text>
            <Text style={styles.time}>{timeStr}</Text>
          </View>

          <View style={styles.macroRow}>
            <Text style={styles.calBadge}>{log.nutrition.calories} kcal</Text>
            <Text style={styles.macroText}>P: {log.nutrition.proteinGrams}g</Text>
            <Text style={styles.macroText}>K: {log.nutrition.carbsGrams}g</Text>
            <Text style={styles.macroText}>L: {log.nutrition.fatGrams}g</Text>
          </View>

          {triggerInfo && (
            <View style={[styles.triggerPill, { backgroundColor: triggerInfo.color + '20' }]}>
              <Text style={styles.triggerEmoji}>{triggerInfo.emoji}</Text>
              <Text style={[styles.triggerText, { color: triggerInfo.color }]}>
                {triggerInfo.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity onPress={() => onDelete(log.id)} style={styles.deleteBtn}>
        <Trash2 size={16} color="rgba(255, 255, 255, 0.3)" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 14,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  calBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34D399',
  },
  macroText: {
    fontSize: 11,
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
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
});
