import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, Circle, Plus } from 'lucide-react-native';
import { Surface } from './Surface';
import { theme } from '../theme';

export interface DailyMissionItem {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface DailyMissionCardProps {
  waterGlasses: number;
  stepCount: number;
  netDeficit: number;
  proteinGrams: number;
  targetProteinGrams: number;
  todayMealsCount: number;
  onAddWater: () => void;
}

export const DailyMissionCard: React.FC<DailyMissionCardProps> = ({
  waterGlasses,
  stepCount,
  netDeficit,
  proteinGrams,
  targetProteinGrams,
  todayMealsCount,
  onAddWater,
}) => {
  const isDeficitAchieved = todayMealsCount > 0 && netDeficit >= 0;

  const missions: DailyMissionItem[] = [
    {
      id: 'water',
      title: `Minum 8 gelas air (${waterGlasses}/8)`,
      isCompleted: waterGlasses >= 8,
    },
    {
      id: 'steps',
      title: `Jalan 8.000 langkah (${stepCount.toLocaleString()}/8.000)`,
      isCompleted: stepCount >= 8000,
    },
    {
      id: 'deficit',
      title: todayMealsCount === 0
        ? 'Defisit kalori terjaga (Belum ada makanan)'
        : `Defisit kalori terjaga (${netDeficit >= 0 ? `Defisit ${netDeficit}` : `Surplus ${Math.abs(netDeficit)}`} kcal)`,
      isCompleted: isDeficitAchieved,
    },
    {
      id: 'protein',
      title: `Protein > ${targetProteinGrams}g (${Math.round(proteinGrams)}g)`,
      isCompleted: proteinGrams >= targetProteinGrams,
    },
  ];

  const completedCount = missions.filter((m) => m.isCompleted).length;

  return (
    <Surface style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Misi Hari Ini</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{completedCount}/4 Selesai</Text>
        </View>
      </View>

      <View style={styles.missionList}>
        {missions.map((mission) => (
          <View key={mission.id} style={styles.missionItem}>
            <View style={styles.missionLeft}>
              {mission.isCompleted ? (
                <CheckCircle2 size={18} color={theme.colors.primary} />
              ) : (
                <Circle size={18} color={theme.colors.textMuted} />
              )}
              <Text
                style={[
                  styles.missionText,
                  mission.isCompleted && styles.completedText,
                ]}
              >
                {mission.title}
              </Text>
            </View>

            {mission.id === 'water' && waterGlasses < 8 && (
              <TouchableOpacity
                style={styles.waterPlusBtn}
                onPress={onAddWater}
                activeOpacity={0.7}
              >
                <Plus size={12} color={theme.colors.primary} />
                <Text style={styles.waterPlusText}>+1</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.primarySubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  missionList: {
    gap: 10,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  missionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  missionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  completedText: {
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  waterPlusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  waterPlusText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
});
