import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  useProfile,
  useMeals,
  useWeight,
  useHealth,
} from '../context/AppContext';
import { Surface } from '../components/Surface';
import { DailyMissionCard } from '../components/DailyMissionCard';
import { InlineCoachCard } from '../components/InlineCoachCard';
import { calculateTargetCalories, calculateTargetProtein } from '../utils/calorieCalc';
import { MealLog } from '../types';
import { theme } from '../theme';
import { Utensils, Plus, Droplets, Footprints, Dumbbell } from 'lucide-react-native';

interface LivingTimelineHomeProps {
  onOpenAddMeal: () => void;
  onOpenAddWeight: () => void;
  onOpenAICoachChat: () => void;
}

export const LivingTimelineHome: React.FC<LivingTimelineHomeProps> = ({
  onOpenAddMeal,
  onOpenAddWeight,
  onOpenAICoachChat,
}) => {
  const { profile } = useProfile();
  const { todayLogs, totalCaloriesIn } = useMeals();
  const { waterGlasses, steps, addWaterGlass } = useHealth();
  const { weightLogs } = useWeight();

  const currentHour = new Date().getHours();

  // Dynamic Target Calculations
  const targetCalories = useMemo(() => calculateTargetCalories(profile), [profile]);
  const targetProtein = useMemo(() => calculateTargetProtein(profile), [profile]);

  const caloriesIn = totalCaloriesIn || 0;
  const netDeficit = targetCalories - caloriesIn;

  // Total protein consumed today
  const proteinGrams = useMemo(() => {
    return todayLogs.reduce((acc: number, m: MealLog) => acc + (m.nutrition.proteinGrams || 0), 0);
  }, [todayLogs]);

  // Directive 5: Deeper Contextual Coach Advice based on time & user logging state
  const timeState = useMemo(() => {
    if (currentHour >= 5 && currentHour < 12) {
      if (todayLogs.length > 0) {
        return {
          greeting: `Selamat Pagi, ${profile.name || 'Teman'} 🌅`,
          subtitle: 'Sarapanmu sudah tercatat. Siap melangkah hari ini!',
          advice: `Bagus! Proteinmu sudah ${Math.round(proteinGrams)}g pagi ini. Pertahankan hidrasi harian.`,
          actionLabel: '+ Minum Air',
          onAction: () => addWaterGlass(),
        };
      }
      return {
        greeting: `Selamat Pagi, ${profile.name || 'Teman'} 🌅`,
        subtitle: 'Awali hari dengan energi positif dan pola makan terjaga.',
        advice: 'Sarapan tinggi protein akan membuatmu kenyang lebih lama.',
        actionLabel: '+ Catat Sarapan',
        onAction: onOpenAddMeal,
      };
    } else if (currentHour >= 12 && currentHour < 18) {
      if (proteinGrams < targetProtein) {
        const remaining = Math.round(targetProtein - proteinGrams);
        return {
          greeting: `Selamat Siang, ${profile.name || 'Teman'} ☀️`,
          subtitle: 'Berikut ringkasan energimu sejauh ini.',
          advice: `Proteinmu kurang ${remaining}g lagi. Tambahkan telur atau ayam saat makan siang.`,
          actionLabel: '+ Tambah Makanan',
          onAction: onOpenAddMeal,
        };
      }
      return {
        greeting: `Selamat Siang, ${profile.name || 'Teman'} ☀️`,
        subtitle: 'Berikut ringkasan energimu sejauh ini.',
        advice: `Mantap! Target protein tercapai (${Math.round(proteinGrams)}g). Ingat minum air putih di sela aktivitas.`,
        actionLabel: '+ Minum Air',
        onAction: () => addWaterGlass(),
      };
    } else {
      return {
        greeting: `Selamat Malam, ${profile.name || 'Teman'} 🌙`,
        subtitle: 'Hari ini hampir usai. Kerja bagus menjaga pola makanmu.',
        advice: netDeficit >= 0
          ? 'Defisit kalori harianmu sangat terjaga. Besok kita lanjut lagi!'
          : 'Ada sedikit surplus kalori, tetapi tidak perlu panik. Besok kita seimbangkan kembali.',
        actionLabel: '+ Catat Makanan',
        onAction: onOpenAddMeal,
      };
    }
  }, [currentHour, profile.name, todayLogs.length, proteinGrams, targetProtein, netDeficit, onOpenAddMeal, addWaterGlass]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Greeting Head */}
      <View style={styles.headerBox}>
        <Text style={styles.greetingText}>{timeState.greeting}</Text>
        <Text style={styles.subtitleText}>{timeState.subtitle}</Text>
      </View>

      {/* Primary Dominant Calorie Metric */}
      <Surface style={styles.primaryMetricCard}>
        <Text style={styles.cardHeaderTitle}>Target Kalori Harian</Text>
        <View style={styles.primaryCalorieRow}>
          <Text style={styles.primaryCalorieValue}>{caloriesIn.toLocaleString()}</Text>
          <Text style={styles.primaryCalorieSub}> / {targetCalories.toLocaleString()} kcal</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, Math.round((caloriesIn / targetCalories) * 100))}%` },
            ]}
          />
        </View>
      </Surface>

      {/* 3 Secondary Compact Metrics Below */}
      <View style={styles.secondaryMetricRow}>
        <Surface style={styles.secondaryCard}>
          <Dumbbell size={14} color="#A855F7" />
          <Text style={styles.secondaryValue}>{Math.round(proteinGrams)}/{targetProtein}g</Text>
          <Text style={styles.secondaryLabel}>Protein</Text>
        </Surface>

        <Surface style={styles.secondaryCard}>
          <Droplets size={14} color={theme.colors.water} />
          <Text style={styles.secondaryValue}>{waterGlasses}/8</Text>
          <Text style={styles.secondaryLabel}>Air (Gelas)</Text>
        </Surface>

        <Surface style={styles.secondaryCard}>
          <Footprints size={14} color={theme.colors.primary} />
          <Text style={styles.secondaryValue}>{steps.toLocaleString()}</Text>
          <Text style={styles.secondaryLabel}>Langkah</Text>
        </Surface>
      </View>

      {/* Directive 6: Distinct Breathing Room Spacing between sections */}
      <View style={styles.sectionSpacer} />

      {/* 2. Concise Health Coach Card */}
      <InlineCoachCard
        adviceText={timeState.advice}
        actionLabel={timeState.actionLabel}
        onActionPress={timeState.onAction}
        onOpenChatPress={onOpenAICoachChat}
      />

      <View style={styles.sectionSpacer} />

      {/* 3. Daily Mission Checklist */}
      <DailyMissionCard
        waterGlasses={waterGlasses}
        stepCount={steps}
        netDeficit={netDeficit}
        proteinGrams={proteinGrams}
        targetProteinGrams={targetProtein}
        todayMealsCount={todayLogs.length}
        onAddWater={() => addWaterGlass()}
      />

      <View style={styles.sectionSpacer} />

      {/* 4. Section "Makanan Hari Ini" */}
      <View style={styles.timelineSection}>
        <Text style={styles.sectionTitle}>Makanan Hari Ini</Text>

        {todayLogs.length === 0 && (
          <Surface style={styles.emptyCard}>
            <Text style={styles.emptyText}>Belum ada makanan dicatat hari ini.</Text>
            <TouchableOpacity style={styles.quickAddBtn} onPress={onOpenAddMeal}>
              <Plus size={14} color={theme.colors.primary} />
              <Text style={styles.quickAddText}>Catat Makanan Pertama</Text>
            </TouchableOpacity>
          </Surface>
        )}

        {todayLogs.map((meal: MealLog) => (
          <Surface key={meal.id} style={styles.timelineItem}>
            <View style={styles.timelineRow}>
              <View style={styles.iconBox}>
                <Utensils size={16} color={theme.colors.primary} />
              </View>
              <View style={styles.timelineTextGroup}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealTime}>
                  {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={styles.mealCal}>{meal.nutrition.calories} kcal</Text>
            </View>
          </Surface>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingTop: 50,
    paddingBottom: 100,
  },
  headerBox: {
    marginBottom: theme.spacing.md,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitleText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  primaryMetricCard: {
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  primaryCalorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  primaryCalorieValue: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
  },
  primaryCalorieSub: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  secondaryMetricRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.xs,
  },
  secondaryCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  secondaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  secondaryLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  sectionSpacer: {
    height: theme.spacing.sm,
  },
  timelineSection: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primarySubtle,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryText,
  },
  timelineItem: {
    padding: 14,
    marginVertical: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineTextGroup: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  mealTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  mealCal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
