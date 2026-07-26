import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useApp } from '../context/AppContext';
import { calculateTriggerStats } from '../utils/habitAnalytics';
import { GlassCard } from '../components/GlassCard';
import { PieChart, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react-native';

export const AnalyticsScreen: React.FC = () => {
  const { mealLogs } = useApp();

  const triggerStats = calculateTriggerStats(mealLogs);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>ANALISIS KEBIASAAN & PEMICU</Text>
        <Text style={styles.screenSub}>
          Memahami pemicu emosional di balik keinginan ngemil dan pola defisit kalori Anda.
        </Text>

        {/* Snacking Heatmap Breakdown */}
        <GlassCard>
          <View style={styles.cardHeader}>
            <PieChart size={18} color="#F59E0B" />
            <Text style={styles.cardTitle}>PETA PEMICU NGEMIL (HEATMAP)</Text>
          </View>

          <Text style={styles.totalSnacksText}>
            Total Cemilan Tercatat: <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>{triggerStats.totalSnacks}</Text>
          </Text>

          {triggerStats.totalSnacks === 0 ? (
            <Text style={styles.emptyText}>Belum ada cemilan dengan pemicu tercatat.</Text>
          ) : (
            triggerStats.breakdown.map((item) => (
              <View key={item.type} style={styles.triggerRow}>
                <View style={styles.triggerLeft}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                  <View>
                    <Text style={styles.triggerName}>{item.label}</Text>
                    <Text style={styles.triggerCount}>
                      {item.count} Kali ({item.percentage}%)
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${item.percentage}%`, backgroundColor: item.color },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </GlassCard>

        {/* Smart Habit Advice based on Top Trigger */}
        <GlassCard style={styles.adviceCard}>
          <View style={styles.cardHeader}>
            <Sparkles size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: '#10B981' }]}>REKOMENDASI PINTAR</Text>
          </View>

          <Text style={styles.adviceText}>
            💡 Sebagian besar cemilan dipicu oleh <Text style={{ fontWeight: 'bold', color: '#60A5FA' }}>Bosan saat Kerja (🥱)</Text>.
            Cobalah menyiapkan teh hijau hangat tanpa gula atau buah potong (seperti apel/semangka) di meja kerja Anda untuk menggantikan cemilan tinggi kalori!
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
    padding: 16,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
    lineHeight: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1.1,
  },
  totalSnacksText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  triggerRow: {
    marginVertical: 8,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  emoji: {
    fontSize: 20,
  },
  triggerName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  triggerCount: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  adviceCard: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  adviceText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
});
