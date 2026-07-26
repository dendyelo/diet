import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from './GlassCard';
import { getFastingStage, formatElapsedTime } from '../utils/habitAnalytics';
import { Flame, Clock, RefreshCw, Zap, Sparkles, Utensils, PlayCircle } from 'lucide-react-native';

interface EatingTimerProps {
  elapsedSeconds: number;
  hasMealRecorded?: boolean;
  onEditTimePress: () => void;
  onStartFastingNow?: () => void;
}

export const EatingTimer: React.FC<EatingTimerProps> = ({
  elapsedSeconds,
  hasMealRecorded = true,
  onEditTimePress,
  onStartFastingNow,
}) => {
  if (!hasMealRecorded) {
    return (
      <GlassCard style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.timerTitleRow}>
            <Clock size={16} color="rgba(255, 255, 255, 0.7)" />
            <Text style={styles.title} numberOfLines={1}>STATUS PUASA</Text>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle} numberOfLines={1}>Belum Ada Sesi Makan Tercatat</Text>
          <Text style={styles.emptyDesc}>
            Catat makanan pertama hari ini atau tekan tombol di bawah untuk memulai hitungan waktu puasa sekarang.
          </Text>

          {onStartFastingNow && (
            <TouchableOpacity style={styles.startBtn} onPress={onStartFastingNow}>
              <PlayCircle size={16} color="#FFFFFF" />
              <Text style={styles.startBtnText} numberOfLines={1}>Mulai Puasa Sekarang</Text>
            </TouchableOpacity>
          )}
        </View>
      </GlassCard>
    );
  }

  const elapsedHours = elapsedSeconds / 3600;
  const stage = getFastingStage(elapsedHours);
  const time = formatElapsedTime(elapsedSeconds);

  const renderStageIcon = () => {
    switch (stage.id) {
      case 'digesting':
        return <Utensils size={18} color={stage.color} />;
      case 'post_absorptive':
        return <Clock size={18} color={stage.color} />;
      case 'glycogen_depletion':
        return <Flame size={18} color={stage.color} />;
      case 'fat_adaptation':
        return <Zap size={18} color={stage.color} />;
      case 'autofagi':
        return <Sparkles size={18} color={stage.color} />;
      default:
        return <Clock size={18} color={stage.color} />;
    }
  };

  return (
    <GlassCard style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.timerTitleRow}>
          <Clock size={16} color="rgba(255, 255, 255, 0.7)" />
          <Text style={styles.title} numberOfLines={1}>WAKTU SEJAK MAKAN TERAKHIR</Text>
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={onEditTimePress}>
          <RefreshCw size={12} color="#60A5FA" />
          <Text style={styles.editText} numberOfLines={1}>Edit Jam</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.clockRow}>
        <Text style={styles.clockText}>{time.formatted}</Text>
        <Text style={styles.clockSub} numberOfLines={1}>Jam : Menit : Detik</Text>
      </View>

      <View style={[styles.stageBadgeContainer, { backgroundColor: stage.color + '18' }]}>
        <View style={styles.stageTitleRow}>
          {renderStageIcon()}
          <Text style={[styles.stageName, { color: stage.color }]} numberOfLines={1}>{stage.name}</Text>
        </View>
        <Text style={styles.stageDesc}>{stage.description}</Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  editText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#60A5FA',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  startBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  clockRow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  clockText: {
    fontSize: 38,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  clockSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
    letterSpacing: 1,
  },
  stageBadgeContainer: {
    padding: 12,
    borderRadius: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stageName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stageDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
});
