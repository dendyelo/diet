import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useProfile, useMeals, useHealth, useTheme } from '../context/AppContext';
import { WeightScreen } from './WeightScreen';
import { AnalyticsScreen } from './AnalyticsScreen';
import { Surface } from '../components/Surface';
import { generateWeeklyHabitSummary } from '../utils/habitAnalytics';
import { calculateTargetProtein } from '../utils/calorieCalc';
import { Scale, BarChart2, Award, Droplets, Utensils, CheckCircle2 } from 'lucide-react-native';

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
          }}
          onPress={() => setActiveTab('weight')}
          activeOpacity={0.7}
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
          }}
          onPress={() => setActiveTab('analytics')}
          activeOpacity={0.7}
        >
          <BarChart2 size={14} color={activeTab === 'analytics' ? '#FFFFFF' : colors.textTertiary} />
          <Text style={{ fontSize: 12, fontWeight: activeTab === 'analytics' ? '700' : '600', color: activeTab === 'analytics' ? '#FFFFFF' : colors.textTertiary }}>
            Nutrisi
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
          }}
          onPress={() => setActiveTab('weekly')}
          activeOpacity={0.7}
        >
          <Award size={14} color={activeTab === 'weekly' ? '#FFFFFF' : colors.textTertiary} />
          <Text style={{ fontSize: 12, fontWeight: activeTab === 'weekly' ? '700' : '600', color: activeTab === 'weekly' ? '#FFFFFF' : colors.textTertiary }}>
            Mingguan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'weight' && <WeightScreen />}
        {activeTab === 'analytics' && <AnalyticsScreen />}
        {activeTab === 'weekly' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
            {/* Habit Score Card */}
            <Surface style={{ padding: 20, alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Award size={20} color={colors.primary} />
                <Text style={{ ...typography.caption, fontWeight: '700', color: colors.primaryText, textTransform: 'uppercase' }}>
                  Skor Konsistensi Mingguan
                </Text>
              </View>
              <Text style={{ fontSize: 48, fontWeight: '900', color: colors.textPrimary, marginVertical: 4 }}>
                {weeklySummary.habitScore}%
              </Text>
              <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }}>
                {weeklySummary.insightSentence}
              </Text>
            </Surface>

            {/* Metrics Breakdown */}
            <Surface style={{ padding: spacing.md, gap: spacing.sm }}>
              <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Rata-Rata Mingguan
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }}>
                  <Utensils size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>Rata-Rata Kalori Harian</Text>
                  <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: 2 }}>Berdasarkan data pencatatan</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{weeklySummary.avgDailyCalories} kcal</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }}>
                  <Droplets size={16} color={colors.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>Kepatuhan Hidrasi Air</Text>
                  <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: 2 }}>Target 8 gelas per hari</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{weeklySummary.waterCompliancePct}%</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} color={colors.weight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>Kepatuhan Target Protein</Text>
                  <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: 2 }}>Target {targetProtein}g per hari</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{weeklySummary.proteinCompliancePct}%</Text>
              </View>
            </Surface>
          </ScrollView>
        )}
      </View>
    </View>
  );
};
