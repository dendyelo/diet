import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useProfile, useMeals, useHealth } from '../context/AppContext';
import { calculateTriggerStats, TRIGGER_OPTIONS } from '../utils/habitAnalytics';
import { GlassCard } from '../components/GlassCard';
import { TriggerOption } from '../types';
import { Flame, AlertTriangle, ShieldCheck } from 'lucide-react-native';

export const AnalyticsScreen: React.FC = () => {
  const { profile } = useProfile();
  const { mealLogs, snackCount } = useMeals();
  const { waterGlasses, steps, fastingState } = useHealth();

  const triggerStats = calculateTriggerStats(mealLogs || []);
  const fastingTargetHours = profile?.fastingTargetHours || 16;
  const isTargetFastingReached = (fastingState?.fastingHours || 0) >= fastingTargetHours;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Screen Header */}
        <Text style={styles.screenTitle} numberOfLines={1}>ANALISIS HABIT & PEMICU NGEMIL</Text>
        <Text style={styles.screenSub}>
          Ketahui pemicu emosional dan stabilitas habit puasa Anda.
        </Text>

        {/* Fasting & Consistency Overview */}
        <GlassCard>
          <View style={styles.sectionHeaderRow}>
            <Flame size={16} color="#F59E0B" />
            <Text style={styles.sectionTitle} numberOfLines={1}>TARGET HARIAN & KONSISTENSI</Text>
          </View>

          <View style={styles.grid2}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel} numberOfLines={1}>PUASA SAAT INI</Text>
              <Text style={[styles.statValue, { color: '#60A5FA' }]} numberOfLines={1}>
                {fastingState?.fastingHours || 0} / {fastingTargetHours} Jam
              </Text>
              <Text style={styles.statSub} numberOfLines={1}>
                {isTargetFastingReached ? '✓ Target Tercapai' : 'Sedang Berjalan'}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel} numberOfLines={1}>TOTAL SNACKING</Text>
              <Text style={[styles.statValue, { color: snackCount > 2 ? '#EF4444' : '#10B981' }]} numberOfLines={1}>
                {snackCount} Kali
              </Text>
              <Text style={styles.statSub} numberOfLines={1}>Hari Ini</Text>
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel} numberOfLines={1}>LANGKAH KAKI</Text>
              <Text style={[styles.statValue, { color: '#34D399' }]} numberOfLines={1}>{steps || 0}</Text>
              <Text style={styles.statSub} numberOfLines={1}>Langkah</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel} numberOfLines={1}>AIR MINUM</Text>
              <Text style={[styles.statValue, { color: '#3B82F6' }]} numberOfLines={1}>{waterGlasses || 0} / 8</Text>
              <Text style={styles.statSub} numberOfLines={1}>Gelas</Text>
            </View>
          </View>
        </GlassCard>

        {/* Emotional Snacking Trigger Heatmap */}
        <GlassCard>
          <View style={styles.sectionHeaderRow}>
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={styles.sectionTitle} numberOfLines={1}>PEMICU NGEMIL EMOSIONAL (HEATMAP)</Text>
          </View>
          <Text style={styles.cardSubText}>
            Pola alasan utama Anda ngemil (Bosan, Stres, Nongkrong, dll).
          </Text>

          {triggerStats.totalSnacks === 0 ? (
            <View style={styles.emptyState}>
              <ShieldCheck size={28} color="#10B981" />
              <Text style={styles.emptyText} numberOfLines={1}>Belum ada data ngemil terdeteksi.</Text>
              <Text style={styles.emptySubText}>
                Pertahankan habit baik ini!
              </Text>
            </View>
          ) : (
            <View style={styles.triggerList}>
              {TRIGGER_OPTIONS.map((option: TriggerOption) => {
                const stat = triggerStats.breakdown.find((b) => b.type === option.type);
                const count = stat ? stat.count : 0;
                const percentage = stat ? stat.percentage : 0;

                return (
                  <View key={option.type} style={styles.triggerRow}>
                    <View style={styles.triggerLabelRow}>
                      <Text style={styles.triggerEmoji}>{option.emoji}</Text>
                      <Text style={styles.triggerName} numberOfLines={1}>{option.label}</Text>
                      <Text style={styles.triggerCount} numberOfLines={1}>
                        {count} kali ({percentage}%)
                      </Text>
                    </View>

                    {/* Progress Bar Heatmap */}
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: option.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.8,
  },
  cardSubText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 14,
    lineHeight: 16,
  },
  grid2: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptySubText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  triggerList: {
    gap: 12,
  },
  triggerRow: {
    marginBottom: 4,
  },
  triggerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  triggerEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  triggerName: {
    fontSize: 12,
    color: '#FFFFFF',
    flex: 1,
  },
  triggerCount: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
