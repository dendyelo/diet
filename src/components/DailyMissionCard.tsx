import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle2, Circle, Plus } from 'lucide-react-native';
import { Surface } from './Surface';
import { useTheme } from '../context/ThemeContext';

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
  const { colors, spacing, radius, typography } = useTheme();

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
    <Surface style={{ padding: spacing.md, marginVertical: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <Text style={{ ...typography.h3, color: colors.textPrimary }}>Misi Hari Ini</Text>
        <View
          style={{
            backgroundColor: colors.primarySubtle,
            paddingHorizontal: spacing.sm + 2,
            paddingVertical: spacing.xs,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.primarySubtle,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryText }}>
            {completedCount}/4 Selesai
          </Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        {missions.map((mission) => (
          <View key={mission.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, flex: 1 }}>
              {mission.isCompleted ? (
                <CheckCircle2 size={18} color={colors.primary} />
              ) : (
                <Circle size={18} color={colors.textTertiary} />
              )}
              <Text
                style={{
                  ...typography.body,
                  color: mission.isCompleted ? colors.textTertiary : colors.textSecondary,
                  textDecorationLine: mission.isCompleted ? 'line-through' : 'none',
                }}
              >
                {mission.title}
              </Text>
            </View>

            {mission.id === 'water' && waterGlasses < 8 && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                  backgroundColor: colors.primarySubtle,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  borderColor: colors.primarySubtle,
                }}
                onPress={onAddWater}
                activeOpacity={0.7}
              >
                <Plus size={12} color={colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryText }}>+1</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </Surface>
  );
};
