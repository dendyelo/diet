import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useProfile, useMeals, useHealth, useTheme } from '../context/AppContext';
import { WeightScreen } from './WeightScreen';
import { AnalyticsScreen } from './AnalyticsScreen';
import { Surface } from '../components/Surface';
import { generateWeeklyHabitSummary } from '../utils/habitAnalytics';
import { calculateTargetProtein } from '../utils/calorieCalc';
import { Scale, BarChart2, Award, Droplets, Utensils, CheckCircle2, Sparkles } from 'lucide-react-native';
import { triggerHaptic } from '../utils/haptics';

type ProgressTabMode = 'weight' | 'analytics' | 'weekly';

export const ProgressHubScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProgressTabMode>('weight');

  const { profile } = useProfile();
  const { mealLogs } = useMeals();
  const { waterGlasses } = useHealth();
  const { colors, spacing, radius, typography } = useTheme();

  const targetProtein = useMemo(() => calculateTargetProtein(profile), [profile]);

  const weeklySummary = useMemo(() => {
    return generateWeeklyHabitSummary(mealLogs, waterGlasses, targetProtein);
  }, [mealLogs, waterGlasses, targetProtein]);

  const handleTabChange = (tab: ProgressTabMode) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 50 }}>
      {/* Top Selector Bar */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surfaceElevated,
          marginHorizontal: spacing.md,
          marginBottom: spacing.sm,
          borderRadius: radius.md,
          padding: 4,
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 10,
            borderRadius: radius.sm,
            backgroundColor: activeTab === 'weight' ? colors.primary : 'transparent',
            minHeight: 44,
          }}
          onPress={() => handleTabChange('weight')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Tab Progres Berat Badan"
        >
          <Scale size={14} color={activeTab === 'weight' ? '#FFFFFF' : colors.textTertiary} />
          <Text style={{ fontSize: 12, fontWeight: activeTab === 'weight' ? '700' : '600', color: activeTab === 'weight' ? '#FFFFFF' : colors.textTertiary }}>
            Berat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 10,
            borderRadius: radius.sm,
            backgroundColor: activeTab === 'analytics' ? colors.primary : 'transparent',
            minHeight: 44,
          }}
          onPress={() => handleTabChange('analytics')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Tab Analisis Habit"
        >
          <BarChart2 size={14} color={activeTab === 'analytics' ? '#FFFFFF' : colors.textTertiary} />
          <Text style={{ fontSize: 12, fontWeight: activeTab === 'analytics' ? '700' : '600', color: activeTab === 'analytics' ? '#FFFFFF' : colors.textTertiary }}>
            Analisis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 10,
            borderRadius: radius.sm,
            backgroundColor: activeTab === 'weekly' ? colors.primary : 'transparent',
            minHeight: 44,
          }}
          onPress={() => handleTabChange('weekly')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityLabel="Tab Ringkasan Mingguan"
        >
          <Award size={14} color={activeTab === 'weekly' ? '#FFFFFF' : colors.textTertiary} />
          <Text style={{ fontSize: 12, fontWeight: activeTab === 'weekly' ? '700' : '600', color: activeTab === 'weekly' ? '#FFFFFF' : colors.textTertiary }}>
            Mingguan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Render Selected View */}
      {activeTab === 'weight' && <WeightScreen />}
      {activeTab === 'analytics' && <AnalyticsScreen />}
      {activeTab === 'weekly' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 100 }}>
          <View>
            <Text style={{ ...typography.h2, color: colors.textPrimary }}>Ringkasan Habit 7 Hari</Text>
            <Text style={{ ...typography.caption, color: colors.textTertiary }}>Konsistensi dan pencapaian kebiasaan sehatmu minggu ini.</Text>
          </View>

          {mealLogs.length === 0 ? (
            <Surface style={{ alignItems: 'center', padding: spacing.lg, gap: spacing.sm, marginVertical: spacing.md }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs }}>
                <Sparkles size={32} color={colors.primary} />
              </View>
              <Text style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center' }}>
                Belum Ada Data Mingguan
              </Text>
              <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                Mulailah mencatat makanan dan air minum harianmu. Ringkasan habit dan konsistensi 7 hari akan otomatis terbentuk di sini.
              </Text>
            </Surface>
          ) : (
            <>
              {/* Score Banner */}
              <Surface style={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ ...typography.caption, color: colors.textTertiary, textTransform: 'uppercase' }}>Skor Habit Minggu Ini</Text>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: colors.primary }}>
                    {weeklySummary.habitScore}%
                  </Text>
                </View>
                <View style={{ backgroundColor: colors.primarySubtle, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryText }}>
                    Pencapaian Konsisten
                  </Text>
                </View>
              </Surface>

              {/* Habit Metrics Card */}
              <Surface style={{ padding: spacing.md, gap: spacing.sm }}>
                <Text style={{ ...typography.h3, color: colors.textPrimary }}>Pencapaian Habit</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Utensils size={18} color={colors.primary} />
                    <Text style={{ ...typography.body, color: colors.textSecondary }}>Rata-rata Kalori Harian</Text>
                  </View>
                  <Text style={{ ...typography.bodyMedium, fontWeight: '700', color: colors.textPrimary }}>
                    {weeklySummary.avgDailyCalories} kcal
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: colors.divider }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Droplets size={18} color={colors.info} />
                    <Text style={{ ...typography.body, color: colors.textSecondary }}>Tingkat Hidrasi Air</Text>
                  </View>
                  <Text style={{ ...typography.bodyMedium, fontWeight: '700', color: colors.textPrimary }}>
                    {weeklySummary.waterCompliancePct}%
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: colors.divider }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={18} color={colors.success} />
                    <Text style={{ ...typography.body, color: colors.textSecondary }}>Tingkat Capaian Protein</Text>
                  </View>
                  <Text style={{ ...typography.bodyMedium, fontWeight: '700', color: colors.textPrimary }}>
                    {weeklySummary.proteinCompliancePct}%
                  </Text>
                </View>
              </Surface>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};
