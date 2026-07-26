import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  useProfile,
  useMeals,
  useWeight,
  useHealth,
  useTheme,
} from '../context/AppContext';
import { Surface } from '../components/Surface';
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
  const { colors, spacing, radius, typography } = useTheme();

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

  // Contextual Coach Advice based on time & user logging state
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md, paddingTop: 50, paddingBottom: 100 }}>
      {/* 1. Greeting Head */}
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs }}>
          {timeState.greeting}
        </Text>
        <Text style={{ ...typography.caption, color: colors.textTertiary }}>
          {timeState.subtitle}
        </Text>
      </View>

      {/* Primary Dominant Calorie Metric */}
      <Surface style={{ padding: spacing.md, marginVertical: spacing.xs }}>
        <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          Target Kalori Harian
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.textPrimary }}>
            {caloriesIn.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textTertiary }}>
            {' '}/ {targetCalories.toLocaleString()} kcal
          </Text>
        </View>
        <View style={{ height: 8, backgroundColor: colors.surfaceElevated, borderRadius: 4, overflow: 'hidden' }}>
          <View
            style={{
              height: '100%',
              backgroundColor: colors.primary,
              borderRadius: 4,
              width: `${Math.min(100, Math.round((caloriesIn / targetCalories) * 100))}%`,
            }}
          />
        </View>
      </Surface>

      {/* 3 Secondary Compact Metrics Below */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xs }}>
        <Surface style={{ flex: 1, padding: 12, alignItems: 'center', gap: 4 }}>
          <Dumbbell size={14} color={colors.weight} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>
            {Math.round(proteinGrams)}/{targetProtein}g
          </Text>
          <Text style={{ fontSize: 10, color: colors.textTertiary }}>Protein</Text>
        </Surface>

        <Surface style={{ flex: 1, padding: 12, alignItems: 'center', gap: 4 }}>
          <Droplets size={14} color={colors.info} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>
            {waterGlasses}/8
          </Text>
          <Text style={{ fontSize: 10, color: colors.textTertiary }}>Air (Gelas)</Text>
        </Surface>

        <Surface style={{ flex: 1, padding: 12, alignItems: 'center', gap: 4 }}>
          <Footprints size={14} color={colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>
            {steps.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 10, color: colors.textTertiary }}>Langkah</Text>
        </Surface>
      </View>

      {/* Breathing Room Spacing */}
      <View style={{ height: spacing.sm }} />

      {/* 2. Concise Health Coach Card */}
      <InlineCoachCard
        adviceText={timeState.advice}
        actionLabel={timeState.actionLabel}
        onActionPress={timeState.onAction}
        onOpenChatPress={onOpenAICoachChat}
      />

      <View style={{ height: spacing.sm }} />

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

      <View style={{ height: spacing.sm }} />

      {/* 4. Section "Makanan Hari Ini" */}
      <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: 4 }}>
          Makanan Hari Ini
        </Text>

        {todayLogs.length === 0 && (
          <Surface style={{ alignItems: 'center', paddingVertical: 20, gap: 10 }}>
            <Text style={{ fontSize: 13, color: colors.textTertiary }}>
              Belum ada makanan dicatat hari ini.
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.primarySubtle,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: colors.primarySubtle,
              }}
              onPress={onOpenAddMeal}
            >
              <Plus size={14} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryText }}>
                Catat Makanan Pertama
              </Text>
            </TouchableOpacity>
          </Surface>
        )}

        {todayLogs.map((meal: MealLog) => (
          <Surface key={meal.id} style={{ padding: 14, marginVertical: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' }}>
                <Utensils size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{meal.name}</Text>
                <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                  {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{meal.nutrition.calories} kcal</Text>
            </View>
          </Surface>
        ))}
      </View>
    </ScrollView>
  );
};
