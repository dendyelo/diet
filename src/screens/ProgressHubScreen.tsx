import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import {
  useAI,
  useHealth,
  useMeals,
  useProfile,
  useTheme,
} from '../context/AppContext';
import { WeightScreen } from './WeightScreen';
import { AnalyticsScreen } from './AnalyticsScreen';
import { Surface } from '../components/Surface';
import {
  generateWeeklyHabitSummary,
  getTopTrigger,
} from '../utils/habitAnalytics';
import {
  calculateTargetCalories,
  calculateTargetProtein,
} from '../utils/calorieCalc';
import { triggerHaptic } from '../utils/haptics';
import { ContextInsight } from '../components/ContextInsight';
import { WeeklyAIInsight } from '../services/aiService';
import { getLocalDateString } from '../utils/date';

type ProgressTabMode = 'weight' | 'analytics' | 'weekly';

export const ProgressHubScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProgressTabMode>('weight');

  const { profile } = useProfile();
  const { mealLogs } = useMeals();
  const { waterGlasses } = useHealth();
  const {
    connectionStatus,
    generateWeeklyInsight,
    userApiKey,
  } = useAI();
  const { colors, spacing, radius, typography } = useTheme();
  const [weeklyAIInsight, setWeeklyAIInsight] = useState<WeeklyAIInsight | null>(
    null
  );
  const [weeklyAILoading, setWeeklyAILoading] = useState(false);
  const [weeklyAIRefreshToken, setWeeklyAIRefreshToken] = useState(0);
  const lastWeeklyAIKey = useRef<string | null>(null);

  const targetProtein = useMemo(() => calculateTargetProtein(profile), [profile]);
  const targetCalories = useMemo(
    () => calculateTargetCalories(profile),
    [profile]
  );
  const weeklyMealLogs = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const startTime = start.getTime();
    const endTime = now.getTime();

    return mealLogs.filter((meal) => {
      const timestamp = new Date(meal.timestamp).getTime();
      return (
        Number.isFinite(timestamp) &&
        timestamp >= startTime &&
        timestamp <= endTime
      );
    });
  }, [mealLogs]);

  const weeklySummary = useMemo(() => {
    return generateWeeklyHabitSummary(mealLogs, waterGlasses, targetProtein);
  }, [mealLogs, waterGlasses, targetProtein]);
  const daysWithMealData = useMemo(
    () =>
      new Set(
        weeklyMealLogs.map((meal) =>
          getLocalDateString(new Date(meal.timestamp))
        )
      ).size,
    [weeklyMealLogs]
  );
  const weeklySnackCount = useMemo(
    () => weeklyMealLogs.filter((meal) => meal.isSnack).length,
    [weeklyMealLogs]
  );
  const topTrigger = useMemo(
    () => getTopTrigger(weeklyMealLogs),
    [weeklyMealLogs]
  );
  const weeklyAIInput = useMemo(
    () => ({
      habitScore: weeklySummary.habitScore,
      avgDailyCalories: weeklySummary.avgDailyCalories,
      targetCalories,
      proteinCompliancePct: weeklySummary.proteinCompliancePct,
      todayWaterCompliancePct: weeklySummary.waterCompliancePct,
      daysWithMealData,
      snackCount: weeklySnackCount,
      topSnackTrigger: topTrigger?.label || null,
    }),
    [
      daysWithMealData,
      targetCalories,
      topTrigger?.label,
      weeklySnackCount,
      weeklySummary,
    ]
  );
  const weeklyAIKey = useMemo(
    () => JSON.stringify([weeklyAIInput, weeklyAIRefreshToken]),
    [weeklyAIInput, weeklyAIRefreshToken]
  );

  useEffect(() => {
    if (!userApiKey || connectionStatus !== 'connected') {
      lastWeeklyAIKey.current = null;
      setWeeklyAIInsight(null);
      setWeeklyAILoading(false);
      return;
    }
    if (
      activeTab !== 'weekly' ||
      daysWithMealData === 0
    ) {
      setWeeklyAILoading(false);
      return;
    }
    if (lastWeeklyAIKey.current === weeklyAIKey) return;

    let cancelled = false;
    let settled = false;
    const timer = setTimeout(() => {
      lastWeeklyAIKey.current = weeklyAIKey;
      setWeeklyAILoading(true);
      void generateWeeklyInsight(weeklyAIInput)
        .then((insight) => {
          if (!cancelled) setWeeklyAIInsight(insight);
        })
        .catch(() => {
          if (!cancelled) setWeeklyAIInsight(null);
        })
        .finally(() => {
          settled = true;
          if (!cancelled) setWeeklyAILoading(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (!settled && lastWeeklyAIKey.current === weeklyAIKey) {
        lastWeeklyAIKey.current = null;
      }
    };
  }, [
    activeTab,
    connectionStatus,
    daysWithMealData,
    generateWeeklyInsight,
    userApiKey,
    weeklyAIInput,
    weeklyAIKey,
  ]);

  const handleTabChange = (tab: ProgressTabMode) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  const weeklyInsight = weeklySummary.insightSentence.replace(' 🎉', '');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        {([
          ['weight', 'Berat'],
          ['analytics', 'Pola'],
          ['weekly', '7 hari'],
        ] as const).map(([tab, label]) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={{
                flex: 1,
                minHeight: 52,
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomWidth: 2,
                borderBottomColor: isActive ? colors.primary : 'transparent',
                marginBottom: -1,
              }}
              onPress={() => handleTabChange(tab)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityLabel={`Buka progres ${label}`}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={{
                  ...typography.bodyMedium,
                  color: isActive ? colors.textPrimary : colors.textTertiary,
                  fontWeight: isActive ? '700' : '500',
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'weight' && <WeightScreen />}
      {activeTab === 'analytics' && <AnalyticsScreen />}
      {activeTab === 'weekly' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: 120,
            gap: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: spacing.xs }}>
            <Text style={{ ...typography.h1, color: colors.textPrimary }}>Tujuh hari terakhir</Text>
            <Text style={{ ...typography.body, color: colors.textTertiary }}>
              Satu pandangan tenang untuk melihat ritmemu.
            </Text>
          </View>

          {weeklyMealLogs.length === 0 ? (
            <Surface
              style={{
                marginVertical: 0,
                padding: spacing.lg,
                minHeight: 180,
                justifyContent: 'flex-end',
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 3,
                  borderRadius: radius.full,
                  backgroundColor: colors.primary,
                  marginBottom: spacing.lg,
                }}
              />
              <Text style={{ ...typography.h2, color: colors.textPrimary }}>
                Belum ada ritme yang bisa dibaca
              </Text>
              <Text style={{ ...typography.body, color: colors.textSecondary }}>
                Catat makan dan minum seperti biasa. Ringkasan ini akan terbentuk sendiri setelah ada data.
              </Text>
            </Surface>
          ) : (
            <>
              <Surface style={{ marginVertical: 0, padding: spacing.lg, gap: spacing.lg }}>
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ ...typography.body, color: colors.textTertiary }}>Konsistensi minggu ini</Text>
                  <Text
                    style={{
                      fontSize: 54,
                      lineHeight: 60,
                      fontWeight: '300',
                      letterSpacing: -2,
                      color: colors.textPrimary,
                    }}
                  >
                    {weeklySummary.habitScore}
                    <Text style={{ fontSize: 20, color: colors.textTertiary }}> %</Text>
                  </Text>
                </View>

                <View
                  style={{
                    height: 3,
                    borderRadius: radius.full,
                    backgroundColor: colors.surfaceElevated,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, weeklySummary.habitScore))}%`,
                      borderRadius: radius.full,
                      backgroundColor: colors.primary,
                    }}
                  />
                </View>

                <Text style={{ ...typography.body, color: colors.textSecondary }}>
                  {weeklyInsight}
                </Text>
              </Surface>

              <Surface style={{ marginVertical: 0, paddingHorizontal: spacing.lg, paddingVertical: 0 }}>
                {[
                  ['Rata-rata hari tercatat', `${weeklySummary.avgDailyCalories} kcal`],
                  ['Hidrasi hari ini', `${weeklySummary.waterCompliancePct}%`],
                  ['Target protein', `${weeklySummary.proteinCompliancePct}%`],
                ].map(([label, value], index) => (
                  <View
                    key={label}
                    style={{
                      minHeight: 64,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottomWidth: index < 2 ? 1 : 0,
                      borderBottomColor: colors.divider,
                    }}
                  >
                    <Text style={{ ...typography.body, color: colors.textSecondary }}>{label}</Text>
                    <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>{value}</Text>
                  </View>
                ))}
              </Surface>

              {connectionStatus === 'connected' ? (
                <Surface style={{ marginVertical: 0, padding: spacing.lg }}>
                  <ContextInsight
                    label="AI · POLA 7 HARI"
                    headline={weeklyAIInsight?.headline}
                    body={
                      weeklyAIInsight
                        ? `${weeklyAIInsight.body}\nEksperimen: ${weeklyAIInsight.nextExperiment}`
                        : undefined
                    }
                    loading={weeklyAILoading}
                    error={!weeklyAILoading && !weeklyAIInsight}
                    onRefresh={() => {
                      lastWeeklyAIKey.current = null;
                      setWeeklyAIRefreshToken((value) => value + 1);
                    }}
                  />
                </Surface>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};
