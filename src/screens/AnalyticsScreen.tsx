import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useApp } from '../context/AppContext';
import { calculateTriggerStats } from '../utils/habitAnalytics';
import { GlassCard } from '../components/GlassCard';
import { PieChart, TrendingUp, Sparkles, Award } from 'lucide-react-native';

export const AnalyticsScreen: React.FC = () => {
  const { mealLogs = [], fastingState, profile } = useApp();

  const triggerStats = calculateTriggerStats(mealLogs || []);

  const totalMealCalories = (mealLogs || []).reduce((acc, log) => acc + (log.nutrition?.calories || 0), 0);
  const snackLogsCount = (mealLogs || []).filter((m) => m.isSnack).length;

  const topTrigger = triggerStats.breakdown.length > 0 ? triggerStats.breakdown[0] : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Screen Header */}
        <Text style={styles.screenTitle} numberOfLines={1}>ANALISIS KEBIASAAN & PEMICU</Text>
        <Text style={styles.screenSub}>
          Memahami pemicu emosional di balik keinginan ngemil dan efisiensi defisit kalori Anda.
        </Text>

        {/* Daily Calorie Summary Cards */}
        <View style={styles.grid2}>
          <GlassCard style={styles.miniCard}>
            <TrendingUp size={16} color="#60A5FA" />
            <Text style={styles.miniLabel} numberOfLines={1}>TOTAL KALORI HARI INI</Text>
            <Text style={[styles.miniValue, { color: '#60A5FA' }]} numberOfLines={1}>
              {totalMealCalories} kcal
            </Text>
            <Text style={styles.miniSub} numberOfLines={1}>{(mealLogs || []).length} Kali Makan/Cemil</Text>
          </GlassCard>

          <GlassCard style={styles.miniCard}>
            <Award size={16} color="#10B981" />
            <Text style={styles.miniLabel} numberOfLines={1}>PUASA TERLAKSANA</Text>
            <Text style={[styles.miniValue, { color: '#10B981' }]} numberOfLines={1}>
              {fastingState?.fastingHours || 0} Jam
            </Text>
            <Text style={styles.miniSub} numberOfLines={1}>Target: {profile?.fastingTargetHours || 16} Jam</Text>
          </GlassCard>
        </View>

        {/* Snacking Heatmap Breakdown */}
        <GlassCard style={{ marginVertical: 8 }}>
          <View style={styles.cardHeader}>
            <PieChart size={18} color="#F59E0B" />
            <Text style={styles.cardTitle} numberOfLines={1}>PETA PEMICU NGEMIL (HEATMAP)</Text>
          </View>

          <Text style={styles.totalSnacksText} numberOfLines={1}>
            Total Cemilan Tercatat: <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>{snackLogsCount}</Text>
          </Text>

          {triggerStats.totalSnacks === 0 ? (
            <Text style={styles.emptyText}>Belum ada cemilan dengan pemicu emosional tercatat hari ini.</Text>
          ) : (
            triggerStats.breakdown.map((item) => (
              <View key={item.type} style={styles.triggerRow}>
                <View style={styles.triggerLeft}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.triggerHeaderRow}>
                      <Text style={styles.triggerName} numberOfLines={1}>{item.label}</Text>
                      <Text style={styles.triggerCount} numberOfLines={1}>
                        {item.count}x ({item.percentage}%)
                      </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.max(5, item.percentage)}%`, backgroundColor: item.color },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </GlassCard>

        {/* Smart Habit Advice based on Top Trigger */}
        <GlassCard style={styles.adviceCard}>
          <View style={styles.cardHeader}>
            <Sparkles size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: '#10B981' }]} numberOfLines={1}>REKOMENDASI PINTAR HABIT</Text>
          </View>

          <Text style={styles.adviceText}>
            💡 {topTrigger ? (
              <>Sebagian besar cemilan Anda dipicu oleh <Text style={{ fontWeight: 'bold', color: '#F59E0B' }}>{topTrigger.label} ({topTrigger.emoji})</Text>. Cobalah minum 1 gelas air hangat atau teh tanpa gula terlebih dahulu untuk mengecek apakah haus terselubung!</>
            ) : (
              <>Pola ngemil Anda hari ini sangat terkontrol! Pertahankan hidrasi 8 gelas air putih dan jaga jendela makan puasa Anda tetap hijau 🟢.</>
            )}
          </Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
    lineHeight: 16,
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  miniCard: {
    flex: 1,
    padding: 12,
  },
  miniLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 6,
    marginBottom: 2,
  },
  miniValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  miniSub: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    flex: 1,
  },
  totalSnacksText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  triggerRow: {
    marginVertical: 6,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 22,
  },
  triggerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  triggerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  triggerCount: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  adviceCard: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    marginVertical: 8,
  },
  adviceText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
});
