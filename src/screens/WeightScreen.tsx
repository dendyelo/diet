import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
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
import { Scale, Plus, Activity } from 'lucide-react-native';

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

  const summary = useMemo(
    () => buildWeightSummary(weightLogs, targetKg),
    [weightLogs, targetKg]
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 100 }}>
        {/* Header */}
        <View style={{ marginBottom: spacing.xs }}>
          <Text style={{ ...typography.h1, color: colors.textPrimary }}>Pelacakan Berat Badan</Text>
          <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: 2 }}>Pantau progres dan tren berat badan Anda</Text>
        </View>

        {/* Ringkasan Berat */}
        <Surface style={{ padding: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md }}>
            <Scale size={16} color={colors.primary} />
            <Text style={{ ...typography.caption, fontWeight: '700', color: colors.primaryText, textTransform: 'uppercase' }}>
              Ringkasan Berat
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surfaceElevated, padding: spacing.sm + 2, borderRadius: radius.sm }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>BERAT TERBARU</Text>
              <Text style={{ ...typography.h1, color: colors.textPrimary, marginTop: 4 }}>
                {latestW !== null ? `${latestW.toFixed(1)} kg` : '-'}
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surfaceElevated, padding: spacing.sm + 2, borderRadius: radius.sm }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>PERUBAHAN</Text>
              <Text style={{ ...typography.h1, color: getChangeColor(summary.changeFromStart, true), marginTop: 4 }}>
                {summary.changeFromStart !== null ? `${summary.changeFromStart > 0 ? '+' : ''}${summary.changeFromStart.toFixed(1)} kg` : '-'}
              </Text>
            </View>
          </View>

          {/* Progres Target */}
          <Text style={{ ...typography.caption, color: colors.textTertiary, marginBottom: 4 }}>Progres Menuju Target ({targetKg} kg)</Text>
          <View style={{ height: 8, backgroundColor: colors.surfaceElevated, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', backgroundColor: colors.primary, width: `${Math.min(100, Math.max(0, summary.progressPercent))}%` }} />
          </View>
        </Surface>

        {/* Chart Card */}
        <Surface style={{ padding: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color={colors.primary} />
              <Text style={{ ...typography.caption, fontWeight: '700', color: colors.primaryText, textTransform: 'uppercase' }}>Grafik Tren</Text>
            </View>

            <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, padding: 2 }}>
              {([7, 30, 90] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm - 4, backgroundColor: chartPeriod === p ? colors.primary : 'transparent' }}
                  onPress={() => setChartPeriod(p)}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: chartPeriod === p ? '#FFFFFF' : colors.textTertiary }}>{p}H</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <WeightChart dataPoints={chartData} maDataPoints={maChartData} targetKg={targetKg} />
        </Surface>

        {/* Catat Berat Button */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md }}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Catat Berat Badan</Text>
        </TouchableOpacity>

        {/* Riwayat */}
        <Surface style={{ padding: spacing.md }}>
          <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: spacing.sm }}>
            Riwayat Pencatatan
          </Text>

          {weightLogs.slice(0, 20).map((log) => (
            <TouchableOpacity
              key={log.id}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider }}
              onPress={() => handleOpenEdit(log)}
            >
              <View>
                <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }}>{formatDateID(log.recordedAt)}</Text>
                {log.note ? <Text style={{ ...typography.caption, color: colors.textTertiary, fontStyle: 'italic', marginTop: 2 }}>{log.note}</Text> : null}
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>{log.weightKg.toFixed(1)} kg</Text>
            </TouchableOpacity>
          ))}
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
    </SafeAreaView>
  );
};
