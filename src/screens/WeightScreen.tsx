import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useProfile, useWeight, useTheme } from '../context/AppContext';
import { Surface } from '../components/Surface';
import { WeightChart } from '../components/WeightChart';
import { AddWeightModal } from '../components/AddWeightModal';
import { EditWeightModal } from '../components/EditWeightModal';
import { WeightLog } from '../types';
import {
  buildWeightSummary,
  prepareChartData,
  prepareMAChartData,
  getTrendInfo,
  getChangeColor,
} from '../utils/weightAnalytics';
import { Plus } from 'lucide-react-native';

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
];

function formatDateID(isoString: string) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES_ID[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export const WeightScreen: React.FC = () => {
  const { profile } = useProfile();
  const { weightLogs, addWeightLog, updateWeightLog, deleteWeightLog } = useWeight();
  const { colors, spacing, radius, typography } = useTheme();

  const [chartPeriod, setChartPeriod] = useState<7 | 30 | 90>(30);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WeightLog | null>(null);

  const targetKg = profile?.targetWeightKg ?? 65;

  // Explicit newest-first sorting for list
  const sortedLogs = useMemo(() => {
    return [...weightLogs].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
  }, [weightLogs]);

  const summary = useMemo(
    () => buildWeightSummary(weightLogs, targetKg),
    [weightLogs, targetKg]
  );

  const trendInfo = useMemo(
    () => getTrendInfo(summary.trend, summary.isGainGoal, colors),
    [summary.trend, summary.isGainGoal, colors]
  );

  const changeColor = useMemo(
    () => getChangeColor(summary.changeFromStart, summary.isGainGoal, colors),
    [summary.changeFromStart, summary.isGainGoal, colors]
  );

  const chartData = useMemo(
    () => prepareChartData(weightLogs, chartPeriod),
    [weightLogs, chartPeriod]
  );

  const maChartData = useMemo(
    () => prepareMAChartData(weightLogs, chartPeriod),
    [weightLogs, chartPeriod]
  );

  const latestW = summary.latestWeight;

  const handleOpenEdit = (log: WeightLog) => {
    setSelectedLog(log);
    setShowEditModal(true);
  };

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
          <Text style={{ ...typography.h1, color: colors.textPrimary }}>Berat</Text>
          <Text style={{ ...typography.body, color: colors.textTertiary }}>
            Perubahan kecil lebih berarti daripada satu angka.
          </Text>
        </View>

        <Surface style={{ marginVertical: 0, padding: spacing.lg, gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ ...typography.body, color: colors.textTertiary }}>Terbaru</Text>
            <Text
              style={{
                fontSize: 54,
                lineHeight: 60,
                fontWeight: '300',
                letterSpacing: -2,
                color: colors.textPrimary,
              }}
            >
              {latestW !== null ? latestW.toFixed(1) : '—'}
              {latestW !== null ? (
                <Text style={{ fontSize: 20, color: colors.textTertiary }}> kg</Text>
              ) : null}
            </Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                Menuju {targetKg} kg
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                {summary.progressPercent}%
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
                  backgroundColor: colors.primary,
                  borderRadius: radius.full,
                  width: `${Math.min(100, Math.max(0, summary.progressPercent))}%`,
                }}
              />
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
            {[
              {
                label: 'Sejak mulai',
                value:
                  summary.changeFromStart !== null
                    ? `${summary.changeFromStart > 0 ? '+' : ''}${summary.changeFromStart.toFixed(1)} kg`
                    : '—',
                color: changeColor,
              },
              {
                label: 'Rata-rata 7 hari',
                value:
                  summary.movingAverage7 !== null
                    ? `${summary.movingAverage7.toFixed(1)} kg`
                    : '—',
                color: colors.textPrimary,
              },
              {
                label: 'Arah tren',
                value: trendInfo.label,
                color: trendInfo.color,
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

        <Surface style={{ marginVertical: 0, paddingHorizontal: 0, paddingVertical: spacing.lg, overflow: 'hidden' }}>
          <View
            style={{
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.md,
              gap: spacing.md,
            }}
          >
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>Tren</Text>
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              {([7, 30, 90] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={{
                    minHeight: 44,
                    justifyContent: 'center',
                    borderBottomWidth: 1,
                    borderBottomColor: chartPeriod === p ? colors.primary : 'transparent',
                  }}
                  onPress={() => setChartPeriod(p)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: chartPeriod === p }}
                  accessibilityLabel={`Tampilkan tren ${p} hari`}
                >
                  <Text
                    style={{
                      ...typography.caption,
                      color: chartPeriod === p ? colors.textPrimary : colors.textTertiary,
                    }}
                  >
                    {p} hari
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <WeightChart dataPoints={chartData} maDataPoints={maChartData} targetKg={targetKg} />
        </Surface>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            backgroundColor: colors.primary,
            borderRadius: radius.full,
            minHeight: 50,
          }}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Catat berat baru"
        >
          <Plus size={17} color={colors.onPrimary} strokeWidth={2} />
          <Text style={{ ...typography.bodyMedium, color: colors.onPrimary }}>Catat berat</Text>
        </TouchableOpacity>

        <Surface style={{ marginVertical: 0, paddingHorizontal: spacing.lg, paddingVertical: 0 }}>
          <View
            style={{
              minHeight: 64,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: sortedLogs.length > 0 ? 1 : 0,
              borderBottomColor: colors.divider,
            }}
          >
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>Riwayat</Text>
            <Text style={{ ...typography.caption, color: colors.textTertiary }}>
              {sortedLogs.length} catatan
            </Text>
          </View>

          {sortedLogs.length === 0 ? (
            <View style={{ paddingVertical: spacing.lg, gap: spacing.xs }}>
              <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>
                Belum ada catatan
              </Text>
              <Text style={{ ...typography.body, color: colors.textTertiary }}>
                Catatan pertamamu akan muncul di sini.
              </Text>
            </View>
          ) : (
            sortedLogs.slice(0, 20).map((log, index) => {
              const prevLog = sortedLogs[index + 1];
              const changeDelta = prevLog ? Math.round((log.weightKg - prevLog.weightKg) * 10) / 10 : null;
              const deltaColor = getChangeColor(changeDelta, summary.isGainGoal, colors);

              return (
                <TouchableOpacity
                  key={log.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: spacing.md,
                    borderBottomWidth: index < Math.min(sortedLogs.length, 20) - 1 ? 1 : 0,
                    borderBottomColor: colors.divider,
                    minHeight: 64,
                  }}
                  onPress={() => handleOpenEdit(log)}
                  activeOpacity={0.65}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit berat ${log.weightKg.toFixed(1)} kilogram, ${formatDateID(log.recordedAt)}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>{formatDateID(log.recordedAt)}</Text>
                    {log.note ? (
                      <Text
                        style={{ ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs }}
                        numberOfLines={1}
                      >
                        {log.note}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>
                      {log.weightKg.toFixed(1)} kg
                    </Text>
                    {changeDelta !== null ? (
                      <Text style={{ ...typography.caption, color: deltaColor, marginTop: spacing.xs }}>
                        {changeDelta > 0 ? `+${changeDelta.toFixed(1)}` : `${changeDelta.toFixed(1)}`} kg
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </Surface>
      </ScrollView>

      <AddWeightModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={(wKg, note) => {
          addWeightLog(wKg, note);
          setShowAddModal(false);
        }}
        lastWeight={latestW}
      />

      <EditWeightModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedLog(null);
        }}
        onSave={(id, updated) => {
          updateWeightLog(id, updated);
          setShowEditModal(false);
          setSelectedLog(null);
        }}
        onDelete={async (id) => {
          const res = await deleteWeightLog(id);
          if (res) {
            setShowEditModal(false);
            setSelectedLog(null);
          }
          return res;
        }}
        weightLog={selectedLog}
        isOnlyLog={weightLogs.length <= 1}
      />
    </View>
  );
};
