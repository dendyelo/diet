import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useMeals, useHealth, useTheme } from '../context/AppContext';
import { calculateTriggerStats } from '../utils/habitAnalytics';
import { Surface } from '../components/Surface';

export const AnalyticsScreen: React.FC = () => {
  const { mealLogs, snackCount } = useMeals();
  const { waterGlasses, steps, fastingState } = useHealth();
  const { colors, spacing, radius, typography } = useTheme();

  const triggerStats = calculateTriggerStats(mealLogs || []);
  const fastingHours = fastingState?.fastingHours || 0;
  const fastingMinutes = Math.floor(
    ((fastingState?.elapsedSeconds || 0) % 3600) / 60
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
          <Text style={{ ...typography.h1, color: colors.textPrimary }}>Pola</Text>
          <Text style={{ ...typography.body, color: colors.textTertiary }}>
            Lihat hubungan antara jeda makan, hidrasi, dan keinginan ngemil.
          </Text>
        </View>

        <Surface style={{ marginVertical: 0, padding: spacing.lg, gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ ...typography.body, color: colors.textTertiary }}>Jeda sejak makan terakhir</Text>
            <Text
              style={{
                fontSize: 54,
                lineHeight: 60,
                fontWeight: '300',
                letterSpacing: -2,
                color: colors.textPrimary,
              }}
            >
              {fastingHours}
              <Text style={{ fontSize: 20, color: colors.textTertiary }}>
                 jam {fastingMinutes} menit
              </Text>
            </Text>
            <Text style={{ ...typography.caption, color: colors.textTertiary }}>
              Dihitung otomatis dari waktu asupan terbaru.
            </Text>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
            {[
              {
                label: 'Ngemil hari ini',
                value: `${snackCount} kali`,
                color: snackCount > 2 ? colors.danger : colors.textPrimary,
              },
              {
                label: 'Langkah',
                value: `${steps || 0}`,
                color: colors.textPrimary,
              },
              {
                label: 'Air minum',
                value: `${waterGlasses || 0} dari 8 gelas`,
                color: colors.textPrimary,
              },
            ].map((item, index) => (
              <View
                key={item.label}
                style={{
                  minHeight: 58,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottomWidth: index < 2 ? 1 : 0,
                  borderBottomColor: colors.divider,
                }}
              >
                <Text style={{ ...typography.body, color: colors.textSecondary }}>{item.label}</Text>
                <Text style={{ ...typography.bodyMedium, color: item.color }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </Surface>

        <Surface style={{ marginVertical: 0, padding: spacing.lg, gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>Pemicu ngemil</Text>
            <Text style={{ ...typography.caption, color: colors.textTertiary }}>
              Berdasarkan catatan ngemil yang memiliki pemicu.
            </Text>
          </View>

          {triggerStats.totalSnacks === 0 ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.divider,
                paddingTop: spacing.lg,
                gap: spacing.xs,
              }}
            >
              <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>
                Belum ada pola yang terbentuk
              </Text>
              <Text style={{ ...typography.body, color: colors.textTertiary }}>
                Catat pemicu saat ngemil agar pola emosional dan fisik bisa dibedakan.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.lg }}>
              {triggerStats.breakdown.map((item) => (
                <View key={item.type} style={{ gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ ...typography.body, color: colors.textSecondary }}>
                      {item.label}
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.textPrimary }}>
                      {item.count} · {item.percentage}%
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 3,
                      backgroundColor: colors.surfaceElevated,
                      borderRadius: radius.full,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        backgroundColor: item.color,
                        borderRadius: radius.full,
                        width: `${item.percentage}%`,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Surface>
      </ScrollView>
    </View>
  );
};
