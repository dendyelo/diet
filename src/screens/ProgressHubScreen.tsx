import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useProfile, useMeals, useHealth } from '../context/AppContext';
import { WeightScreen } from './WeightScreen';
import { AnalyticsScreen } from './AnalyticsScreen';
import { GlassCard } from '../components/GlassCard';
import { generateWeeklyHabitSummary } from '../utils/habitAnalytics';
import { calculateTargetProtein } from '../utils/calorieCalc';
import { Scale, BarChart2, Award, Droplets, Utensils, CheckCircle2 } from 'lucide-react-native';

type ProgressTabMode = 'weight' | 'analytics' | 'weekly';

export const ProgressHubScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProgressTabMode>('weight');

  const { profile } = useProfile();
  const { mealLogs } = useMeals();
  const { waterGlasses } = useHealth();

  const targetProtein = useMemo(() => calculateTargetProtein(profile), [profile]);

  // Point 8: Authentic data calculation strictly from real user logs
  const weeklySummary = useMemo(() => {
    return generateWeeklyHabitSummary(mealLogs, waterGlasses, targetProtein);
  }, [mealLogs, waterGlasses, targetProtein]);

  return (
    <View style={styles.container}>
      {/* Top Selector Bar */}
      <View style={styles.topSelectorContainer}>
        <TouchableOpacity
          style={[styles.selectorBtn, activeTab === 'weight' && styles.activeBtn]}
          onPress={() => setActiveTab('weight')}
          activeOpacity={0.7}
        >
          <Scale size={14} color={activeTab === 'weight' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'} />
          <Text style={[styles.selectorText, activeTab === 'weight' && styles.activeText]}>
            Berat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.selectorBtn, activeTab === 'analytics' && styles.activeBtn]}
          onPress={() => setActiveTab('analytics')}
          activeOpacity={0.7}
        >
          <BarChart2 size={14} color={activeTab === 'analytics' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'} />
          <Text style={[styles.selectorText, activeTab === 'analytics' && styles.activeText]}>
            Nutrisi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.selectorBtn, activeTab === 'weekly' && styles.activeBtn]}
          onPress={() => setActiveTab('weekly')}
          activeOpacity={0.7}
        >
          <Award size={14} color={activeTab === 'weekly' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'} />
          <Text style={[styles.selectorText, activeTab === 'weekly' && styles.activeText]}>
            Mingguan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Content */}
      <View style={styles.contentArea}>
        {activeTab === 'weight' && <WeightScreen />}
        {activeTab === 'analytics' && <AnalyticsScreen />}
        {activeTab === 'weekly' && (
          <ScrollView style={styles.weeklyScroll} contentContainerStyle={styles.weeklyContent}>
            {/* Habit Score Card */}
            <GlassCard style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <Award size={20} color="#10B981" />
                <Text style={styles.scoreTitle}>Skor Konsistensi Mingguan</Text>
              </View>
              <Text style={styles.scoreNumber}>{weeklySummary.habitScore}%</Text>
              <Text style={styles.scoreInsight}>{weeklySummary.insightSentence}</Text>
            </GlassCard>

            {/* Metrics Breakdown */}
            <GlassCard style={styles.breakdownCard}>
              <Text style={styles.sectionHeaderTitle}>Rata-Rata Mingguan</Text>

              <View style={styles.metricRow}>
                <View style={styles.iconBox}>
                  <Utensils size={16} color="#10B981" />
                </View>
                <View style={styles.metricTextGroup}>
                  <Text style={styles.metricTitle}>Rata-Rata Kalori Harian</Text>
                  <Text style={styles.metricSub}>Berdasarkan data pencatatan</Text>
                </View>
                <Text style={styles.metricVal}>{weeklySummary.avgDailyCalories} kcal</Text>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.iconBox}>
                  <Droplets size={16} color="#3B82F6" />
                </View>
                <View style={styles.metricTextGroup}>
                  <Text style={styles.metricTitle}>Kepatuhan Hidrasi Air</Text>
                  <Text style={styles.metricSub}>Target 8 gelas per hari</Text>
                </View>
                <Text style={styles.metricVal}>{weeklySummary.waterCompliancePct}%</Text>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.iconBox}>
                  <CheckCircle2 size={16} color="#A855F7" />
                </View>
                <View style={styles.metricTextGroup}>
                  <Text style={styles.metricTitle}>Kepatuhan Target Protein</Text>
                  <Text style={styles.metricSub}>Target {targetProtein}g per hari</Text>
                </View>
                <Text style={styles.metricVal}>{weeklySummary.proteinCompliancePct}%</Text>
              </View>
            </GlassCard>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    paddingTop: 50,
  },
  topSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 4,
  },
  selectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
  },
  activeBtn: {
    backgroundColor: '#10B981',
  },
  selectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
  },
  weeklyScroll: {
    flex: 1,
  },
  weeklyContent: {
    padding: 16,
    gap: 12,
  },
  scoreCard: {
    padding: 20,
    borderRadius: 22,
    alignItems: 'center',
    gap: 8,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
    textTransform: 'uppercase',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  scoreInsight: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  breakdownCard: {
    padding: 16,
    borderRadius: 22,
    gap: 12,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTextGroup: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  metricSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
});
