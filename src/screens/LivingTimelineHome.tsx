import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  useProfile,
  useMeals,
  useWeight,
  useHealth,
  useAI,
  useTheme,
} from '../context/AppContext';
import { Surface } from '../components/Surface';
import { DailyMissionCard } from '../components/DailyMissionCard';
import { InlineCoachCard } from '../components/InlineCoachCard';
import { EnergyGauge } from '../components/EnergyGauge';
import { HabitRings } from '../components/HabitRings';
import { MealCard } from '../components/MealCard';
import { SnackModal } from '../components/SnackModal';
import { EditMealModal } from '../components/EditMealModal';
import { calculateTargetCalories, calculateTargetProtein } from '../utils/calorieCalc';
import { getFastingStage, formatElapsedTime } from '../utils/habitAnalytics';
import { MealLog, TriggerType, NutritionData, FoodItemBreakdown } from '../types';
import { Utensils, Plus, Droplets, Footprints, Dumbbell, Cookie, Clock, ChevronDown, ChevronUp, RefreshCw, Flame } from 'lucide-react-native';
import { triggerHaptic } from '../utils/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const { todayLogs, totalCaloriesIn, snackCount, addMealLog, updateMealLog, deleteMealLog } = useMeals();
  const { fastingState, steps, waterGlasses, energy, addWaterGlass, resetFastingTimer } = useHealth();
  const { userApiKey } = useAI();
  const { colors, spacing, radius, typography } = useTheme();

  const [showSnackModal, setShowSnackModal] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [showAdvancedStats, setShowAdvancedStats] = useState<boolean>(false);

  const currentHour = new Date().getHours();
  const elapsedSeconds = fastingState?.elapsedSeconds || 0;
  const hasMealRecorded = fastingState?.hasMealRecorded ?? true;
  const elapsedHours = elapsedSeconds / 3600;
  const fastingStage = getFastingStage(elapsedHours);
  const fastingFormatted = formatElapsedTime(elapsedSeconds);

  // Dynamic Target Calculations
  const targetCalories = useMemo(() => calculateTargetCalories(profile), [profile]);
  const targetProtein = useMemo(() => calculateTargetProtein(profile), [profile]);

  const caloriesIn = totalCaloriesIn || 0;
  const netDeficit = targetCalories - caloriesIn;

  // Total protein consumed today
  const proteinGrams = useMemo(() => {
    return todayLogs.reduce((acc: number, m: MealLog) => acc + (m.nutrition.proteinGrams || 0), 0);
  }, [todayLogs]);

  // Smart Activity Advice Rule
  const activityAdvice = useMemo(() => {
    if (steps < 4000 && caloriesIn > 1500) {
      return `Langkahmu baru ${steps.toLocaleString()}. Luangkan 15 menit jalan santai untuk membantu pencernaan & pembakaran.`;
    }
    return null;
  }, [steps, caloriesIn]);

  // Contextual Coach Advice
  const timeState = useMemo(() => {
    if (activityAdvice) {
      return {
        greeting: `Selamat ${currentHour < 12 ? 'Pagi' : currentHour < 18 ? 'Siang' : 'Malam'}, ${profile.name || 'Teman'} ✨`,
        subtitle: 'Saran aktivitas untuk pencernaanmu.',
        advice: activityAdvice,
        actionLabel: '+ Jalan 15 Mnt',
        onAction: () => triggerHaptic('medium'),
      };
    }

    if (currentHour >= 5 && currentHour < 12) {
      if (todayLogs.length > 0) {
        return {
          greeting: `Selamat Pagi, ${profile.name || 'Teman'} 🌅`,
          subtitle: 'Sarapanmu sudah tercatat. Siap melangkah hari ini!',
          advice: `Bagus! Proteinmu sudah ${Math.round(proteinGrams)}g pagi ini. Pertahankan hidrasi harian.`,
          actionLabel: '+ Minum Air',
          onAction: () => {
            triggerHaptic('light');
            addWaterGlass();
          },
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
        onAction: () => {
          triggerHaptic('light');
          addWaterGlass();
        },
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
  }, [currentHour, profile.name, todayLogs.length, proteinGrams, targetProtein, netDeficit, activityAdvice, onOpenAddMeal, addWaterGlass]);

  const toggleAdvancedStats = () => {
    triggerHaptic('light');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdvancedStats(!showAdvancedStats);
  };

  const handleAddSnackSubmit = async (
    name: string,
    nutrition: NutritionData,
    trigger: TriggerType,
    itemsBreakdown?: FoodItemBreakdown[]
  ) => {
    triggerHaptic('success');
    await addMealLog(name, true, nutrition, trigger, undefined, 'ai', itemsBreakdown);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md, paddingTop: 50, paddingBottom: 100 }}>
      {/* 1. Header Greeting & Cheat Day Indicator */}
      <View style={{ marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <Text style={{ ...typography.h1, color: colors.textPrimary, flex: 1 }}>
            {timeState.greeting}
          </Text>

          {profile?.isCheatDay && (
            <View style={{ backgroundColor: colors.warningSubtle, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.warning }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.warning }}>🍕 CHEAT DAY</Text>
            </View>
          )}
        </View>

        <Text style={{ ...typography.caption, color: colors.textTertiary }}>
          {timeState.subtitle}
        </Text>
      </View>

      {/* 2. Dominant Primary Calorie Metric Card */}
      <Surface style={{ padding: spacing.md, marginVertical: spacing.xs }}>
        <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          Target Kalori Harian
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 }}>
          <Text style={{ fontSize: 32, fontWeight: '900', color: colors.textPrimary }}>
            {caloriesIn.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textTertiary }}>
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

      {/* 3. Secondary Compact Metrics Bar */}
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

      {/* 4. Modern Sleek Fasting Bar */}
      <Surface style={{ padding: 12, marginVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: fastingStage.color + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={16} color={fastingStage.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>{fastingFormatted.formatted}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: fastingStage.color }}>• {fastingStage.name}</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.textTertiary }} numberOfLines={1}>
              {hasMealRecorded ? 'Puasa berjalan sejak makan terakhir' : 'Belum ada sesi makan hari ini'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={{ backgroundColor: colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider }}
          onPress={async () => {
            triggerHaptic('medium');
            await resetFastingTimer(new Date().toISOString());
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>Reset Puasa</Text>
        </TouchableOpacity>
      </Surface>

      {/* 5. Health Coach Companion Card */}
      <InlineCoachCard
        adviceText={timeState.advice}
        actionLabel={timeState.actionLabel}
        onActionPress={timeState.onAction}
        onOpenChatPress={onOpenAICoachChat}
      />

      {/* 6. Quick Health Logging Actions Bar */}
      <Surface style={{ padding: spacing.md, marginVertical: spacing.xs }}>
        <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: spacing.sm }}>
          PENCATATAN HARIAN CEPAT
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.xs + 4 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.infoSubtle, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', gap: 4, minHeight: 44, justifyContent: 'center' }}
            onPress={() => {
              triggerHaptic('light');
              addWaterGlass();
            }}
          >
            <Droplets size={16} color={colors.info} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.info }}>+1 Air</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.warningSubtle, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', gap: 4, minHeight: 44, justifyContent: 'center' }}
            onPress={() => setShowSnackModal(true)}
          >
            <Cookie size={16} color={colors.warning} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning }}>Snack</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.primarySubtle, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', gap: 4, minHeight: 44, justifyContent: 'center' }}
            onPress={onOpenAddMeal}
          >
            <Utensils size={16} color={colors.primary} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryText }}>Makanan</Text>
          </TouchableOpacity>
        </View>
      </Surface>

      {/* 7. Daily Mission Checklist */}
      <DailyMissionCard
        waterGlasses={waterGlasses}
        stepCount={steps}
        netDeficit={netDeficit}
        proteinGrams={proteinGrams}
        targetProteinGrams={targetProtein}
        todayMealsCount={todayLogs.length}
        onAddWater={() => addWaterGlass()}
      />

      {/* 8. Collapsible Advanced Analytics Section (Energy Gauge & Triple Rings) */}
      <Surface style={{ padding: spacing.sm + 4, marginVertical: spacing.xs }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 }}
          onPress={toggleAdvancedStats}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Flame size={16} color={colors.primary} />
            <Text style={{ ...typography.bodyMedium, color: colors.textPrimary, fontWeight: '700' }}>
              Statistik Energi & Ring Habit
            </Text>
          </View>
          {showAdvancedStats ? <ChevronUp size={18} color={colors.textTertiary} /> : <ChevronDown size={18} color={colors.textTertiary} />}
        </TouchableOpacity>

        {showAdvancedStats && (
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            {energy && (
              <EnergyGauge
                caloriesIn={caloriesIn}
                caloriesOut={energy.totalCaloriesOut}
                dailyBMR={energy.dailyBMR}
                elapsedBMR={energy.elapsedBMR}
                stepCalories={energy.stepCalories}
                netBalance={energy.netBalance}
                targetDeficit={energy.targetDeficit}
                isDeficit={energy.isDeficit}
                isCheatDay={profile?.isCheatDay}
              />
            )}

            <HabitRings
              percentageDeficit={energy?.percentageToGoal || 0}
              snackCount={snackCount || 0}
              waterGlasses={waterGlasses || 0}
            />
          </View>
        )}
      </Surface>

      {/* 9. Today's Meal Timeline (Journal) */}
      <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: 4 }}>
          Makanan Hari Ini ({todayLogs.length})
        </Text>

        {todayLogs.length === 0 ? (
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
                minHeight: 44,
              }}
              onPress={onOpenAddMeal}
            >
              <Plus size={14} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryText }}>
                Catat Makanan Pertama
              </Text>
            </TouchableOpacity>
          </Surface>
        ) : (
          todayLogs.map((log: MealLog) => (
            <MealCard
              key={log.id}
              log={log}
              onEdit={(item) => setEditingLog(item)}
              onDelete={(id) => deleteMealLog(id)}
            />
          ))
        )}
      </View>

      {/* Modals */}
      <SnackModal
        visible={showSnackModal}
        onClose={() => setShowSnackModal(false)}
        onSubmitSnack={handleAddSnackSubmit}
        onDrinkWater={() => addWaterGlass()}
        userApiKey={userApiKey}
      />

      <EditMealModal
        visible={editingLog !== null}
        log={editingLog}
        onClose={() => setEditingLog(null)}
        onSaveUpdate={async (id, updatedFields) => {
          await updateMealLog(id, updatedFields);
        }}
      />
    </ScrollView>
  );
};
