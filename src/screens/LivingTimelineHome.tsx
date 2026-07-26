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
import { GlassCard } from '../components/GlassCard';
import { DailyMissionCard } from '../components/DailyMissionCard';
import { InlineCoachCard } from '../components/InlineCoachCard';
import { calculateTargetCalories, calculateTargetProtein } from '../utils/calorieCalc';
import { MealLog } from '../types';
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

  // Determine time-of-day greeting and concise coach advice
  const timeState = useMemo(() => {
    if (currentHour >= 5 && currentHour < 12) {
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
        advice: 'Ingat minum air putih di sela aktivitas siangmu.',
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
  }, [currentHour, profile.name, proteinGrams, targetProtein, netDeficit, onOpenAddMeal, addWaterGlass]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Greeting Head */}
      <View style={styles.headerBox}>
        <Text style={styles.greetingText}>{timeState.greeting}</Text>
        <Text style={styles.subtitleText}>{timeState.subtitle}</Text>
      </View>

      {/* Point 1: Hierarchical Metric Display — Primary Dominant Calorie Metric */}
      <GlassCard style={styles.primaryMetricCard}>
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
      </GlassCard>

      {/* Point 1: 3 Secondary Compact Metrics Below */}
      <View style={styles.secondaryMetricRow}>
        <GlassCard style={styles.secondaryCard}>
          <Dumbbell size={14} color="#A855F7" />
          <Text style={styles.secondaryValue}>{Math.round(proteinGrams)}/{targetProtein}g</Text>
          <Text style={styles.secondaryLabel}>Protein</Text>
        </GlassCard>

        <GlassCard style={styles.secondaryCard}>
          <Droplets size={14} color="#3B82F6" />
          <Text style={styles.secondaryValue}>{waterGlasses}/8</Text>
          <Text style={styles.secondaryLabel}>Air (Gelas)</Text>
        </GlassCard>

        <GlassCard style={styles.secondaryCard}>
          <Footprints size={14} color="#10B981" />
          <Text style={styles.secondaryValue}>{steps.toLocaleString()}</Text>
          <Text style={styles.secondaryLabel}>Langkah</Text>
        </GlassCard>
      </View>

      {/* 2. Concise Health Coach Card */}
      <InlineCoachCard
        adviceText={timeState.advice}
        actionLabel={timeState.actionLabel}
        onActionPress={timeState.onAction}
        onOpenChatPress={onOpenAICoachChat}
      />

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

      {/* Point 6: Honest Section Header "Makanan Hari Ini" */}
      <View style={styles.timelineSection}>
        <Text style={styles.sectionTitle}>Makanan Hari Ini</Text>

        {todayLogs.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>Belum ada makanan dicatat hari ini.</Text>
            <TouchableOpacity style={styles.quickAddBtn} onPress={onOpenAddMeal}>
              <Plus size={14} color="#10B981" />
              <Text style={styles.quickAddText}>Catat Makanan Pertama</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {todayLogs.map((meal: MealLog) => (
          <GlassCard key={meal.id} style={styles.timelineItem}>
            <View style={styles.timelineRow}>
              <View style={styles.iconBox}>
                <Utensils size={16} color="#10B981" />
              </View>
              <View style={styles.timelineTextGroup}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealTime}>
                  {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={styles.mealCal}>{meal.nutrition.calories} kcal</Text>
            </View>
          </GlassCard>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  content: {
    padding: 16,
    paddingTop: 50,
    paddingBottom: 100,
    gap: 8,
  },
  headerBox: {
    marginBottom: 8,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  primaryMetricCard: {
    padding: 16,
    borderRadius: 22,
    marginVertical: 4,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
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
    color: '#FFFFFF',
  },
  primaryCalorieSub: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  secondaryMetricRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 2,
  },
  secondaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 18,
    alignItems: 'center',
    gap: 4,
  },
  secondaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  timelineSection: {
    marginTop: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
  timelineItem: {
    padding: 14,
    borderRadius: 18,
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
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineTextGroup: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mealTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  mealCal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
});
