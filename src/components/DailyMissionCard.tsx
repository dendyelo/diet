import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { GlassCard } from './GlassCard';

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
  targetProteinGrams?: number;
  onToggleWater?: () => void;
}

export const DailyMissionCard: React.FC<DailyMissionCardProps> = ({
  waterGlasses,
  stepCount,
  netDeficit,
  proteinGrams,
  targetProteinGrams = 80,
  onToggleWater,
}) => {
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
      title: `Defisit kalori terjaga (${netDeficit >= 0 ? `Defisit ${netDeficit}` : `Surplus ${Math.abs(netDeficit)}`} kcal)`,
      isCompleted: netDeficit >= 0,
    },
    {
      id: 'protein',
      title: `Protein > ${targetProteinGrams}g (${Math.round(proteinGrams)}g)`,
      isCompleted: proteinGrams >= targetProteinGrams,
    },
  ];

  const completedCount = missions.filter((m) => m.isCompleted).length;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Misi Hari Ini</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{completedCount}/4 Selesai</Text>
        </View>
      </View>

      <View style={styles.missionList}>
        {missions.map((mission) => (
          <TouchableOpacity
            key={mission.id}
            style={styles.missionItem}
            activeOpacity={mission.id === 'water' && onToggleWater ? 0.7 : 1}
            onPress={mission.id === 'water' && onToggleWater ? onToggleWater : undefined}
          >
            {mission.isCompleted ? (
              <CheckCircle2 size={18} color="#10B981" />
            ) : (
              <Circle size={18} color="rgba(255, 255, 255, 0.3)" />
            )}
            <Text
              style={[
                styles.missionText,
                mission.isCompleted && styles.completedText,
              ]}
            >
              {mission.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 22,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
  },
  missionList: {
    gap: 10,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  missionText: {
    fontSize: 13,
    color: '#E4E4E7',
    fontWeight: '500',
  },
  completedText: {
    color: 'rgba(255, 255, 255, 0.5)',
    textDecorationLine: 'line-through',
  },
});
