import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useProfile, useWeight } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';
import { WeightChart } from '../components/WeightChart';
import { AddWeightModal } from '../components/AddWeightModal';
import { EditWeightModal } from '../components/EditWeightModal';
import { WeightLog } from '../types';
import { buildWeightSummary, prepareChartData, prepareMAChartData, TREND_INFO, getLatestWeight } from '../utils/weightAnalytics';
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
    () => prepareMAChartData(weightLogs, chartPeriod, 7),
    [weightLogs, chartPeriod]
  );

  const sortedLogs = useMemo(
    () =>
      [...weightLogs]
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
        .slice(0, 20),
    [weightLogs]
  );

  const trendInfo = TREND_INFO[summary.trend];
  const lastWeight = getLatestWeight(weightLogs);

  const handleEdit = (log: WeightLog) => {
    setSelectedLog(log);
    setShowEditModal(true);
  };

  const handleAddSave = (weightKg: number, note?: string) => {
    addWeightLog(weightKg, note);
    setShowAddModal(false);
  };

  const handleEditSave = (id: string, updatedFields: { weightKg?: number; note?: string }) => {
    updateWeightLog(id, updatedFields);
    setShowEditModal(false);
    setSelectedLog(null);
  };

  const handleDelete = (id: string) => {
    deleteWeightLog(id);
    setShowEditModal(false);
    setSelectedLog(null);
  };

  const renderHistoryDiff = (index: number) => {
    if (index === sortedLogs.length - 1) return null;
    const current = sortedLogs[index].weightKg;
    const previous = sortedLogs[index + 1].weightKg;
    const diff = Math.round((current - previous) * 10) / 10;

    return (
      <Text
        style={[
          styles.diffText,
          diff > 0 && styles.textRed,
          diff < 0 && styles.textGreen,
          diff === 0 && styles.textGray,
        ]}
      >
        {diff > 0 ? '+' : ''}{diff === 0 ? '0' : diff.toFixed(1)} kg
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.headerTitle} numberOfLines={1}>PELACAKAN BERAT BADAN</Text>
        <Text style={styles.headerSubtitle}>Pantau progres berat badan dan tren Anda</Text>

        {/* Summary Card */}
        <GlassCard>
          <View style={styles.sectionHeader}>
            <Scale size={16} color="#60A5FA" />
            <Text style={styles.sectionTitle}>RINGKASAN BERAT</Text>
          </View>

          <View style={styles.grid2}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>BERAT TERBARU</Text>
              <Text style={[styles.statValue, { color: '#FFFFFF' }]}>
                {summary.latestWeight !== null ? summary.latestWeight.toFixed(1) : '-'}
              </Text>
              <Text style={styles.statSub}>kg</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>PERUBAHAN</Text>
              <Text
                style={[
                  styles.statValue,
                  summary.changeFromStart !== null && summary.changeFromStart < 0 && styles.textGreen,
                  summary.changeFromStart !== null && summary.changeFromStart > 0 && styles.textRed,
                  (summary.changeFromStart === null || summary.changeFromStart === 0) && styles.textYellow,
                ]}
              >
                {summary.changeFromStart !== null
                  ? `${summary.changeFromStart > 0 ? '+' : ''}${summary.changeFromStart.toFixed(1)}`
                  : '-'}
              </Text>
              <Text style={styles.statSub}>kg dari awal</Text>
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>MA-7 HARI</Text>
              <Text style={[styles.statValue, { color: '#22D3EE' }]}>
                {summary.movingAverage7 !== null ? summary.movingAverage7.toFixed(1) : '-'}
              </Text>
              <Text style={styles.statSub}>kg rata-rata</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>TREN</Text>
              <Text style={[styles.statValue, { color: trendInfo.color }]}>
                {trendInfo.emoji}
              </Text>
              <Text style={[styles.statSub, { color: trendInfo.color }]}>{trendInfo.label}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Progres Menuju {targetKg} kg</Text>
            <View style={styles.progressBarWrapper}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${summary.progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{summary.progressPercent}%</Text>
            </View>
          </View>
        </GlassCard>

        {/* Chart Section */}
        <GlassCard>
          <View style={styles.sectionHeader}>
            <Activity size={16} color="#34D399" />
            <Text style={styles.sectionTitle}>GRAFIK TREN</Text>
          </View>

          {/* Period Selector */}
          <View style={styles.tabContainer}>
            {([7, 30, 90] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.tab, chartPeriod === period && styles.tabActive]}
                onPress={() => setChartPeriod(period)}
              >
                <Text style={[styles.tabText, chartPeriod === period && styles.tabTextActive]}>
                  {period}H
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <WeightChart
            dataPoints={chartData}
            maDataPoints={maChartData}
            targetKg={targetKg}
          />
        </GlassCard>

        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Catat Berat Badan</Text>
        </TouchableOpacity>

        {/* History */}
        <GlassCard>
          <View style={styles.sectionHeader}>
            <Scale size={16} color="#F472B6" />
            <Text style={styles.sectionTitle}>RIWAYAT PENCATATAN</Text>
          </View>

          {sortedLogs.length > 0 ? (
            sortedLogs.map((log, index) => (
              <TouchableOpacity
                key={log.id}
                style={styles.historyRow}
                onPress={() => handleEdit(log)}
              >
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>{formatDateID(log.recordedAt)}</Text>
                  {log.note ? (
                    <Text style={styles.historyNote} numberOfLines={1}>{log.note}</Text>
                  ) : null}
                </View>
                <View style={styles.historyRight}>
                  {renderHistoryDiff(index)}
                  <Text style={styles.historyWeight}>{log.weightKg.toFixed(1)} kg</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Scale size={40} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>Belum ada data berat badan</Text>
              <Text style={styles.emptySubText}>Tekan tombol di atas untuk mulai mencatat</Text>
            </View>
          )}
        </GlassCard>
      </ScrollView>

      {/* Modals */}
      <AddWeightModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddSave}
        lastWeight={lastWeight}
      />

      <EditWeightModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedLog(null);
        }}
        onSave={handleEditSave}
        onDelete={handleDelete}
        weightLog={selectedLog}
      />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
    lineHeight: 18,
  },
  sectionHeader: {
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
    color: '#FFFFFF',
  },
  statSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  textGreen: { color: '#10B981' },
  textRed: { color: '#EF4444' },
  textYellow: { color: '#F59E0B' },
  textGray: { color: 'rgba(255,255,255,0.4)' },
  progressContainer: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    minWidth: 36,
    textAlign: 'right',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  tabText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginVertical: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyLeft: {
    flex: 1,
    marginRight: 12,
  },
  historyDate: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  historyNote: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  diffText: {
    fontSize: 11,
    marginBottom: 2,
  },
  historyWeight: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
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
});
