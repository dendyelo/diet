import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useHealth,
  useMeals,
  useProfile,
  useTheme,
} from '../context/AppContext';
import { Surface } from '../components/Surface';
import { MealCard } from '../components/MealCard';
import { EditMealModal } from '../components/EditMealModal';
import {
  calculateTargetCalories,
  calculateTargetProtein,
} from '../utils/calorieCalc';
import { formatElapsedTime } from '../utils/habitAnalytics';
import { MealLog } from '../types';
import { HungerCheckResult } from '../components/HungerCheckScreen';
import { triggerHaptic } from '../utils/haptics';
import { decideHunger } from '../utils/hungerDecision';
import { ContextInsight } from '../components/ContextInsight';
import { DailyAIInsight } from '../services/aiService';

interface LivingTimelineHomeProps {
  lastCheckIn: HungerCheckResult | null;
  aiInsight: DailyAIInsight | null;
  aiInsightEnabled: boolean;
  aiInsightLoading: boolean;
  onRefreshAIInsight: () => void;
  onOpenHungerCheck: () => void;
  onOpenAddMeal: () => void;
  onOpenAddWeight: () => void;
  onOpenAddActivity: () => void;
  onOpenAICoachChat: (starterPrompt?: string) => void;
}

const formatToday = () => {
  const value = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const Metric: React.FC<{
  value: string;
  label: string;
  progress: number;
}> = ({
  value,
  label,
  progress,
}) => {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.metric, { backgroundColor: colors.surface }]}>
      <Text style={[typography.h2, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[typography.caption, { color: colors.textTertiary }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.metricTrack, { backgroundColor: colors.surfaceElevated }]}>
        <View
          style={[
            styles.metricFill,
            {
              backgroundColor: colors.success,
              width: `${Math.min(100, Math.max(0, progress))}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.detailRow}>
      <Text style={[typography.caption, { color: colors.textTertiary }]}>
        {label}
      </Text>
      <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
};

export const LivingTimelineHome: React.FC<LivingTimelineHomeProps> = ({
  lastCheckIn,
  aiInsight,
  aiInsightEnabled,
  aiInsightLoading,
  onRefreshAIInsight,
  onOpenHungerCheck,
  onOpenAddMeal,
  onOpenAddWeight,
  onOpenAddActivity,
  onOpenAICoachChat,
}) => {
  const { profile } = useProfile();
  const {
    todayLogs,
    totalCaloriesIn,
    snackCount,
    updateMealLog,
    deleteMealLog,
  } = useMeals();
  const {
    fastingState,
    hoursSinceLastMeal,
    steps,
    stepTrackingStatus,
    stepTrackingMessage,
    waterGlasses,
    energy,
    addWaterGlass,
    activityLogs,
    deleteActivityLog,
  } = useHealth();
  const { colors, spacing, radius, typography } = useTheme();
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const targetCalories = useMemo(
    () => calculateTargetCalories(profile),
    [profile]
  );
  const targetProtein = useMemo(
    () => calculateTargetProtein(profile),
    [profile]
  );
  const maintenanceCalories = energy.adjustedMaintenance;
  const caloriesIn = totalCaloriesIn || 0;
  const caloriesOutSoFar = Math.round(energy.totalCaloriesOut);
  const remainingCalories = targetCalories - caloriesIn;
  const overTargetCalories = Math.max(0, -remainingCalories);
  const calorieZone =
    caloriesIn > maintenanceCalories
      ? 'above_maintenance'
      : caloriesIn > targetCalories
        ? 'above_plan'
        : 'within_plan';
  const calorieChartMax = Math.max(
    1,
    maintenanceCalories,
    caloriesIn > maintenanceCalories ? Math.round(caloriesIn * 1.08) : 0,
    caloriesOutSoFar > maintenanceCalories
      ? Math.round(caloriesOutSoFar * 1.08)
      : 0
  );
  const plannedProgress = Math.min(
    100,
    (Math.min(caloriesIn, targetCalories) / calorieChartMax) * 100
  );
  const abovePlanStart = (targetCalories / calorieChartMax) * 100;
  const abovePlanProgress =
    (Math.max(0, Math.min(caloriesIn, maintenanceCalories) - targetCalories) /
      calorieChartMax) *
    100;
  const aboveNeedStart = (maintenanceCalories / calorieChartMax) * 100;
  const aboveNeedProgress =
    (Math.max(0, caloriesIn - maintenanceCalories) / calorieChartMax) * 100;
  const targetMarkerPosition = Math.min(
    100,
    Math.max(0, (targetCalories / calorieChartMax) * 100)
  );
  const needMarkerPosition = Math.min(
    100,
    Math.max(0, (maintenanceCalories / calorieChartMax) * 100)
  );
  const caloriesOutMarkerPosition = Math.min(
    100,
    Math.max(0, (caloriesOutSoFar / calorieChartMax) * 100)
  );
  const targetLabelPosition = Math.min(
    94,
    Math.max(6, targetMarkerPosition)
  );
  const caloriesOutLabelPosition = Math.min(
    94,
    Math.max(6, caloriesOutMarkerPosition)
  );
  const proteinGrams = useMemo(
    () =>
      todayLogs.reduce(
        (total, meal) => total + (meal.nutrition.proteinGrams || 0),
        0
      ),
    [todayLogs]
  );

  const elapsedSeconds = fastingState.elapsedSeconds || 0;
  const hoursSinceLastMealBucket =
    Math.floor(Math.max(0, hoursSinceLastMeal) * 4) / 4;
  const fastingFormatted = formatElapsedTime(elapsedSeconds);

  const liveCheckInDecision = useMemo(() => {
    if (!lastCheckIn) return null;

    return decideHunger({
      answer: lastCheckIn.answer,
      signal: lastCheckIn.signal,
      intent: lastCheckIn.intent,
      caloriesIn,
      targetCalories,
      maintenanceCalories,
      waterGlasses,
      snackCount,
      fastingHours: hoursSinceLastMealBucket,
    });
  }, [
    caloriesIn,
    hoursSinceLastMealBucket,
    lastCheckIn,
    maintenanceCalories,
    snackCount,
    targetCalories,
    waterGlasses,
  ]);

  const currentRecommendation = useMemo(() => {
    if (liveCheckInDecision) {
      return {
        eyebrow: liveCheckInDecision.status,
        title: liveCheckInDecision.headline,
        detail: liveCheckInDecision.body,
        action:
          liveCheckInDecision.kind === 'water'
            ? ('water' as const)
            : liveCheckInDecision.kind === 'none'
              ? ('check' as const)
              : ('food' as const),
      };
    }

    if (calorieZone === 'above_maintenance') {
      return {
        eyebrow: 'SARAN SEKARANG',
        title: 'Asupan melebihi kebutuhan hari ini.',
        detail: 'Periksa rasa lapar sebelum memilih makanan berikutnya. Angka adalah konteks, bukan larangan untuk makan.',
        action: 'check' as const,
      };
    }

    if (calorieZone === 'above_plan') {
      return {
        eyebrow: 'KONTEKS HARI INI',
        title: 'Rencana makan hari ini terlewati.',
        detail: 'Kebutuhan tubuh belum tentu terlewati. Jika benar-benar lapar, periksa rasa lapar untuk menentukan porsi.',
        action: 'check' as const,
      };
    }

    return {
      eyebrow: 'SARAN SEKARANG',
      title: 'Pertahankan pola dietmu.',
      detail: 'Kamu masih dalam batas rencana. Tidak perlu menghabiskan sisa kalori—makan berikutnya saat lapar.',
      action: 'check' as const,
    };
  }, [
    calorieZone,
    liveCheckInDecision,
  ]);

  const handleRecommendationAction = () => {
    if (currentRecommendation.action === 'water') {
      triggerHaptic('success');
      addWaterGlass();
      return;
    }
    if (currentRecommendation.action === 'food') {
      onOpenAddMeal();
      return;
    }
    onOpenHungerCheck();
  };

  const calorieSummary = useMemo(() => {
    if (calorieZone === 'above_maintenance') {
      return {
        label: 'ASUPAN DI ATAS KEBUTUHAN',
        description: `Kamu makan ${caloriesIn.toLocaleString('id-ID')} kkal dan tubuh sudah membakar ${caloriesOutSoFar.toLocaleString('id-ID')} kkal. Asupanmu ${overTargetCalories.toLocaleString('id-ID')} kkal di atas batas diet ${targetCalories.toLocaleString('id-ID')} kkal.`,
      };
    }

    if (calorieZone === 'above_plan') {
      return {
        label: 'BATAS DIET TERLEWATI',
        description: `Kamu makan ${caloriesIn.toLocaleString('id-ID')} kkal dan tubuh sudah membakar ${caloriesOutSoFar.toLocaleString('id-ID')} kkal. Asupanmu ${overTargetCalories.toLocaleString('id-ID')} kkal di atas batas diet ${targetCalories.toLocaleString('id-ID')} kkal.`,
      };
    }

    return {
      label: 'MASIH DALAM BATAS DIET',
      description: `Kamu makan ${caloriesIn.toLocaleString('id-ID')} kkal dan tubuh sudah membakar ${caloriesOutSoFar.toLocaleString('id-ID')} kkal. Asupanmu masih ${Math.max(0, remainingCalories).toLocaleString('id-ID')} kkal di bawah batas diet ${targetCalories.toLocaleString('id-ID')} kkal.`,
    };
  }, [
    caloriesIn,
    caloriesOutSoFar,
    calorieZone,
    overTargetCalories,
    remainingCalories,
    targetCalories,
  ]);

  const activityCopy = useMemo(() => {
    if (energy.stepProgressPct >= 100) {
      return {
        headline: 'Target langkah tercapai.',
        detail:
          energy.activityBonusCalories > 0
            ? `${energy.bonusSteps.toLocaleString('id-ID')} langkah tambahan membakar sekitar ${energy.activityBonusCalories.toLocaleString('id-ID')} kkal tanpa mengubah batas diet.`
            : `Kamu sudah mencapai sasaran ${energy.stepGoal.toLocaleString('id-ID')} langkah hari ini.`,
      };
    }

    if (steps <= energy.baselineSteps) {
      return {
        headline: 'Aktivitas sedang terkumpul.',
        detail: 'Langkah tercatat otomatis sebagai energi keluar dan tidak menaikkan batas diet.',
      };
    }

    return {
      headline: 'Langkah dasar sudah terlewati.',
      detail: `${energy.bonusSteps.toLocaleString('id-ID')} langkah tambahan meningkatkan kebutuhan energi sekitar ${energy.activityBonusCalories.toLocaleString('id-ID')} kkal.`,
    };
  }, [
    energy.activityBonusCalories,
    energy.baselineSteps,
    energy.bonusSteps,
    energy.stepProgressPct,
    steps,
  ]);

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              {formatToday()}
            </Text>
            <Text style={[typography.h1, { color: colors.textPrimary }]}>
              Hari ini
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mulai check-in lapar"
            onPress={onOpenHungerCheck}
            style={({ pressed }) => [
              styles.checkButton,
              {
                borderColor: colors.divider,
                backgroundColor: pressed ? colors.surfacePressed : colors.surface,
              },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Check-in
            </Text>
          </Pressable>
        </View>

        <Surface style={styles.energyHero}>
          <View style={styles.heroTopline}>
            <Text style={[typography.overline, { color: colors.textTertiary }]}>
              {calorieSummary.label}
            </Text>
          </View>
          <View style={styles.energyNumberRow}>
            <Text style={[typography.display, styles.energyNumber, { color: colors.textPrimary }]}>
              {caloriesIn.toLocaleString('id-ID')}
            </Text>
            <Text style={[typography.body, { color: colors.textTertiary }]}>kkal dimakan</Text>
          </View>
          <Text style={[typography.body, styles.heroDescription, { color: colors.textSecondary }]}>
            {calorieSummary.description}
          </Text>
          <View style={styles.calorieChart}>
            <Text
              style={[
                typography.caption,
                styles.markerValue,
                {
                  color: colors.textSecondary,
                  left: `${targetLabelPosition}%`,
                },
              ]}
            >
              {targetCalories.toLocaleString('id-ID')}
            </Text>
            <View
              accessibilityLabel={`Posisi rencana diet. ${caloriesIn.toLocaleString('id-ID')} dimakan, ${caloriesOutSoFar.toLocaleString('id-ID')} energi keluar sejauh ini, batas rencana ${targetCalories.toLocaleString('id-ID')}, kebutuhan sekitar ${maintenanceCalories.toLocaleString('id-ID')} kilokalori.`}
              style={[
                styles.progressTrack,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${plannedProgress}%`,
                  },
                ]}
              />
              {abovePlanProgress > 0 ? (
                <View
                  style={[
                    styles.progressZone,
                    {
                      left: `${abovePlanStart}%`,
                      width: `${abovePlanProgress}%`,
                      backgroundColor: colors.warning,
                    },
                  ]}
                />
              ) : null}
              {aboveNeedProgress > 0 ? (
                <View
                  style={[
                    styles.progressZone,
                    {
                      left: `${aboveNeedStart}%`,
                      width: `${aboveNeedProgress}%`,
                      backgroundColor: colors.danger,
                    },
                  ]}
                />
              ) : null}
              <View
                style={[
                  styles.targetMarker,
                  {
                    backgroundColor: colors.textSecondary,
                    left: `${targetMarkerPosition}%`,
                  },
                ]}
              />
              {caloriesIn > maintenanceCalories ? (
                <View
                  style={[
                    styles.needMarker,
                    {
                      backgroundColor: colors.danger,
                      left: `${needMarkerPosition}%`,
                    },
                  ]}
                />
              ) : null}
              <View
                style={[
                  styles.caloriesOutMarker,
                  {
                    backgroundColor: colors.info,
                    left: `${caloriesOutMarkerPosition}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                typography.caption,
                styles.markerValue,
                styles.caloriesOutValue,
                {
                  color: colors.info,
                  left: `${caloriesOutLabelPosition}%`,
                },
              ]}
            >
              {caloriesOutSoFar.toLocaleString('id-ID')}
            </Text>
          </View>
          {caloriesIn > targetCalories ? (
            <View style={styles.zoneLegend}>
              <View style={[styles.zoneDot, { backgroundColor: colors.primary }]} />
              <Text style={[typography.caption, { color: colors.textTertiary }]}>
                Dalam rencana
              </Text>
              <View
                style={[
                  styles.zoneDot,
                  {
                    backgroundColor:
                      caloriesIn > maintenanceCalories
                        ? colors.danger
                        : colors.warning,
                  },
                ]}
              />
              <Text style={[typography.caption, { color: colors.textTertiary }]}>
                {caloriesIn > maintenanceCalories
                  ? 'Melebihi kebutuhan'
                  : 'Di atas rencana'}
              </Text>
            </View>
          ) : null}
        </Surface>

        <Surface style={styles.metricStrip}>
          <Metric
            value={`${Math.round(proteinGrams)} / ${targetProtein}g`}
            label="Protein"
            progress={(proteinGrams / Math.max(1, targetProtein)) * 100}
          />
          <Metric
            value={`${waterGlasses} / 8`}
            label="Gelas air"
            progress={(waterGlasses / 8) * 100}
          />
        </Surface>

        <Surface
          style={[
            styles.recommendation,
            {
              backgroundColor:
                currentRecommendation.action === 'water'
                  ? colors.infoSubtle
                  : colors.primarySubtle,
              borderColor:
                currentRecommendation.action === 'water'
                  ? colors.infoSubtle
                  : colors.primarySubtle,
            },
          ]}
        >
          <Text
            style={[
              typography.overline,
              {
                color:
                  currentRecommendation.action === 'water'
                    ? colors.info
                    : colors.primaryText,
              },
            ]}
          >
            {currentRecommendation.eyebrow}
          </Text>
          <Text
            style={[
              typography.h2,
              styles.recommendationTitle,
              { color: colors.textPrimary },
            ]}
          >
            {currentRecommendation.title}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {currentRecommendation.detail}
          </Text>
          <View style={styles.recommendationActions}>
            <Pressable
              accessibilityRole="button"
              onPress={handleRecommendationAction}
              style={({ pressed }) => [
                styles.primaryAction,
                {
                  backgroundColor:
                    currentRecommendation.action === 'water'
                      ? colors.info
                      : colors.primary,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color:
                      currentRecommendation.action === 'water'
                        ? colors.onInfo
                        : colors.onPrimary,
                    fontWeight: '600',
                  },
                ]}
              >
                {currentRecommendation.action === 'water'
                  ? '+ 1 gelas air'
                  : currentRecommendation.action === 'food'
                    ? 'Catat makan'
                    : 'Check-in lagi'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buka AI coach"
              onPress={() => onOpenAICoachChat()}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text style={[typography.caption, { color: colors.textTertiary }]}>
                Tanya coach
              </Text>
            </Pressable>
          </View>
          {aiInsightEnabled ? (
            <ContextInsight
              label="AI · FOKUS NUTRISI"
              headline={aiInsight?.headline}
              body={aiInsight?.body}
              loading={aiInsightLoading}
              error={!aiInsightLoading && !aiInsight}
              onOpen={() => onOpenAICoachChat(aiInsight?.suggestedPrompt)}
              onRefresh={onRefreshAIInsight}
            />
          ) : null}
        </Surface>

        <Surface style={styles.activityCard}>
          <View style={styles.activityTopline}>
            <Text style={[typography.overline, { color: colors.textTertiary }]}>
              AKTIVITAS
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              {stepTrackingStatus === 'connected'
                ? 'Sensor aktif'
                : stepTrackingStatus === 'checking'
                  ? 'Menghubungkan sensor'
                  : 'Sensor belum aktif'}
            </Text>
          </View>
          <View style={styles.activityNumberRow}>
            <Text style={[typography.display, styles.activityNumber, { color: colors.textPrimary }]}>
              {steps.toLocaleString('id-ID')}
            </Text>
            <Text style={[typography.caption, styles.activityGoal, { color: colors.textTertiary }]}>
              dari {energy.stepGoal.toLocaleString('id-ID')} langkah
            </Text>
          </View>
          <View
            style={[
              styles.activityProgressTrack,
              { backgroundColor: colors.surfaceElevated },
            ]}
          >
            <View
              style={[
                styles.activityProgressFill,
                {
                  width: `${energy.stepProgressPct}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
            {activityCopy.detail}
          </Text>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            Sekitar {energy.stepCalories.toLocaleString('id-ID')} kkal dari langkah hari ini.
          </Text>
          {stepTrackingStatus !== 'connected' ? (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              {stepTrackingMessage}
            </Text>
          ) : null}
          {activityLogs.length > 0 ? (
            <View style={[styles.loggedActivities, { borderTopColor: colors.divider }]}>
              <View style={styles.loggedActivityHeader}>
                <Text style={[typography.overline, { color: colors.textTertiary }]}>
                  AKTIVITAS DICERITAKAN
                </Text>
                <Text style={[typography.caption, { color: colors.primaryText }]}>
                  +{energy.loggedActivityCalories.toLocaleString('id-ID')} kkal
                </Text>
              </View>
              {activityLogs.slice(0, 3).map((activity) => (
                <View key={activity.id} style={styles.loggedActivityRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
                      {activity.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>
                      {activity.durationMinutes} menit · estimasi {activity.estimatedCalories} kkal
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Hapus aktivitas ${activity.name}`}
                    hitSlop={8}
                    onPress={() => deleteActivityLog(activity.id)}
                  >
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>
                      Hapus
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ceritakan aktivitas kepada AI"
            onPress={onOpenAddActivity}
            style={({ pressed }) => [
              styles.activityAction,
              {
                borderColor: colors.divider,
                opacity: pressed ? 0.55 : 1,
              },
            ]}
          >
            <Text style={[typography.bodyMedium, { color: colors.primaryText }]}>
              Ceritakan aktivitas
            </Text>
          </Pressable>
        </Surface>

        <Surface style={styles.detailCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetails }}
            onPress={() => {
              triggerHaptic('light');
              setShowDetails((value) => !value);
            }}
            style={styles.detailToggle}
          >
            <View style={styles.fastingCopy}>
              <Text style={[typography.overline, { color: colors.textTertiary }]}>
                JEDA MAKAN
              </Text>
              <Text style={[typography.h3, { color: colors.textPrimary }]}>
                {fastingState.isFastingActive
                  ? `${fastingFormatted.hours} jam ${fastingFormatted.minutes} menit`
                  : 'Belum ada makanan'}
              </Text>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>
                {fastingState.isFastingActive
                  ? 'Dihitung otomatis sejak makanan terakhir. Makan berikutnya tetap mengikuti rasa lapar.'
                  : 'Catat makanan untuk memulai hitungan otomatis.'}
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              {showDetails ? 'Tutup' : 'Lihat detail'}
            </Text>
          </Pressable>

          {showDetails ? (
            <View style={[styles.detailRows, { borderTopColor: colors.divider }]}>
              <DetailRow
                label="Energi keluar sejauh ini"
                value={`${Math.round(energy.totalCaloriesOut).toLocaleString('id-ID')} kkal`}
              />
              <DetailRow
                label="Perkiraan kebutuhan harian"
                value={`${maintenanceCalories.toLocaleString('id-ID')} kkal`}
              />
              <DetailRow
                label="Bonus aktivitas"
                value={`+${(energy.activityBonusCalories + energy.loggedActivityCalories).toLocaleString('id-ID')} kkal`}
              />
              <DetailRow
                label="Snack hari ini"
                value={`${snackCount} kali`}
              />
              <DetailRow
                label="Berat & target"
                value={`${profile.weightKg.toFixed(1)} → ${profile.targetWeightKg.toFixed(1)} kg`}
              />
              <Pressable
                onPress={onOpenAddWeight}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Text style={[typography.caption, { color: colors.primaryText }]}>
                  Catat berat baru
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Surface>

        <View style={styles.journalHeader}>
          <View>
            <Text style={[typography.h2, { color: colors.textPrimary }]}>
              Jurnal makan
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              {todayLogs.length} catatan hari ini
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tambah makanan"
            onPress={onOpenAddMeal}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={[typography.bodyMedium, { color: colors.primaryText }]}>
              Tambah
            </Text>
          </Pressable>
        </View>

        {todayLogs.length === 0 ? (
          <View
            style={[
              styles.emptyJournal,
              { borderTopColor: colors.divider, borderBottomColor: colors.divider },
            ]}
          >
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              Belum ada makanan yang dicatat.
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Catat seperlunya agar saran berikutnya makin relevan.
            </Text>
          </View>
        ) : (
          <View style={styles.mealList}>
            {todayLogs.map((log) => (
              <MealCard
                key={log.id}
                log={log}
                onEdit={setEditingLog}
                onDelete={deleteMealLog}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <EditMealModal
        visible={editingLog !== null}
        log={editingLog}
        onClose={() => setEditingLog(null)}
        onSaveUpdate={async (id, updatedFields) => {
          await updateMealLog(id, updatedFields);
        }}
      />
    </>
  );

};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerCopy: {
    gap: 2,
  },
  checkButton: {
    minHeight: 44,
    borderWidth: 0,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  energyHero: {
    padding: 24,
    borderRadius: 24,
  },
  heroTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  energyNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    marginTop: 12,
  },
  energyNumber: {
    fontSize: 48,
    lineHeight: 54,
  },
  calorieChart: {
    position: 'relative',
    marginTop: 18,
    paddingTop: 20,
    paddingBottom: 20,
  },
  progressTrack: {
    position: 'relative',
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
  markerValue: {
    position: 'absolute',
    top: 0,
    width: 84,
    marginLeft: -42,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  caloriesOutValue: {
    top: 29,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressZone: {
    position: 'absolute',
    top: 0,
    height: '100%',
  },
  targetMarker: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 11,
    borderRadius: 1,
  },
  needMarker: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 11,
    borderRadius: 1,
  },
  caloriesOutMarker: {
    position: 'absolute',
    top: -5,
    height: 18,
    width: 3,
    borderRadius: 2,
    transform: [{ translateX: -1.5 }],
  },
  heroDescription: {
    marginTop: 2,
  },
  zoneLegend: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  zoneDot: {
    width: 7,
    height: 7,
    marginLeft: 4,
    borderRadius: 4,
  },
  metricStrip: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 0,
    gap: 10,
    backgroundColor: 'transparent',
  },
  metric: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    gap: 3,
  },
  metricTrack: {
    width: '100%',
    height: 4,
    marginTop: 7,
    overflow: 'hidden',
    borderRadius: 2,
  },
  metricFill: {
    height: '100%',
    borderRadius: 2,
  },
  recommendation: {
    padding: 24,
    borderRadius: 24,
  },
  recommendationTitle: {
    marginTop: 8,
    marginBottom: 7,
  },
  recommendationActions: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  primaryAction: {
    minHeight: 46,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCard: {
    padding: 18,
    gap: 12,
  },
  activityTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  activityNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityNumber: {
    fontSize: 40,
    lineHeight: 46,
  },
  activityGoal: {
    flexShrink: 1,
  },
  activityProgressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  activityProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  loggedActivities: {
    marginTop: 2,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  loggedActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  loggedActivityRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  detailCard: {
    padding: 16,
  },
  detailToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  fastingCopy: {
    flex: 1,
    gap: 3,
  },
  detailRows: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 14,
    gap: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  journalHeader: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyJournal: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 22,
    gap: 5,
  },
  mealList: {
    gap: 8,
  },
});
