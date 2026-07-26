import React from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { useProfile, useMeals, useHealth, useTheme } from '../context/AppContext';
import { calculateTriggerStats } from '../utils/habitAnalytics';
import { Surface } from '../components/Surface';
import { Flame, AlertTriangle, ShieldCheck } from 'lucide-react-native';

export const AnalyticsScreen: React.FC = () => {
  const { profile } = useProfile();
  const { mealLogs, snackCount } = useMeals();
  const { waterGlasses, steps, fastingState } = useHealth();
  const { colors, spacing, radius, typography } = useTheme();

  const triggerStats = calculateTriggerStats(mealLogs || []);
  const fastingTargetHours = profile?.fastingTargetHours || 16;
  const isTargetFastingReached = (fastingState?.fastingHours || 0) >= fastingTargetHours;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 100 }}>
        {/* Screen Header */}
        <View style={{ marginBottom: spacing.xs }}>
          <Text style={{ ...typography.h1, color: colors.textPrimary }} numberOfLines={1}>Analisis Habit & Pemicu Ngemil</Text>
          <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: 2 }}>
            Ketahui pemicu emosional dan stabilitas habit puasa Anda.
          </Text>
        </View>

        {/* Fasting & Consistency Overview */}
        <Surface style={{ padding: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md }}>
            <Flame size={16} color={colors.warning} />
            <Text style={{ ...typography.caption, fontWeight: '700', color: colors.warning, textTransform: 'uppercase' }} numberOfLines={1}>
              TARGET HARIAN & KONSISTENSI
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surfaceElevated, padding: spacing.sm + 2, borderRadius: radius.sm }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }} numberOfLines={1}>PUASA SAAT INI</Text>
              <Text style={{ ...typography.h2, color: colors.info, marginTop: 4 }} numberOfLines={1}>
                {fastingState?.fastingHours || 0} / {fastingTargetHours} Jam
              </Text>
              <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }} numberOfLines={1}>
                {isTargetFastingReached ? '✓ Target Tercapai' : 'Sedang Berjalan'}
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surfaceElevated, padding: spacing.sm + 2, borderRadius: radius.sm }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }} numberOfLines={1}>TOTAL SNACKING</Text>
              <Text style={{ ...typography.h2, color: snackCount > 2 ? colors.danger : colors.primary, marginTop: 4 }} numberOfLines={1}>
                {snackCount} Kali
              </Text>
              <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }} numberOfLines={1}>Hari Ini</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surfaceElevated, padding: spacing.sm + 2, borderRadius: radius.sm }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }} numberOfLines={1}>LANGKAH KAKI</Text>
              <Text style={{ ...typography.h2, color: colors.primaryText, marginTop: 4 }} numberOfLines={1}>{steps || 0}</Text>
              <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }} numberOfLines={1}>Langkah</Text>
            </View>

            <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surfaceElevated, padding: spacing.sm + 2, borderRadius: radius.sm }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }} numberOfLines={1}>AIR MINUM</Text>
              <Text style={{ ...typography.h2, color: colors.info, marginTop: 4 }} numberOfLines={1}>{waterGlasses || 0} / 8</Text>
              <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }} numberOfLines={1}>Gelas Hari Ini</Text>
            </View>
          </View>
        </Surface>

        {/* Trigger Breakdown */}
        <Surface style={{ padding: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md }}>
            <AlertTriangle size={16} color={colors.warning} />
            <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textPrimary, textTransform: 'uppercase' }}>
              Pemicu Emotional Eating
            </Text>
          </View>

          {triggerStats.totalSnacks === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.md, gap: 6 }}>
              <ShieldCheck size={28} color={colors.primary} />
              <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>Belum Ada Snacking Dicatat</Text>
              <Text style={{ ...typography.caption, color: colors.textTertiary, textAlign: 'center' }}>
                Bagus sekali! Tetap pertahankan kesadaran makan Anda.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {triggerStats.breakdown.map((item) => (
                <View key={item.type} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>
                      {item.emoji} {item.label}
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.textSecondary, fontWeight: '700' }}>
                      {item.count}x ({item.percentage}%)
                    </Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: colors.surfaceElevated, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', backgroundColor: item.color, width: `${item.percentage}%` }} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};
