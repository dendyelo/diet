import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Surface } from './Surface';
import { getFastingStage, formatElapsedTime } from '../utils/habitAnalytics';
import { Flame, Clock, RefreshCw, Zap, Sparkles, Utensils, PlayCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

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
  const { colors, spacing, radius, typography } = useTheme();

  if (!hasMealRecorded) {
    return (
      <Surface style={{ padding: spacing.md, marginVertical: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
          <Clock size={16} color={colors.textTertiary} />
          <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' }} numberOfLines={1}>STATUS PUASA</Text>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs }}>
          <Text style={{ ...typography.bodyMedium, color: colors.textPrimary }} numberOfLines={1}>Belum Ada Sesi Makan Tercatat</Text>
          <Text style={{ ...typography.caption, color: colors.textTertiary, textAlign: 'center', lineHeight: 18 }}>
            Catat makanan pertama hari ini atau tekan tombol di bawah untuk memulai hitungan waktu puasa sekarang.
          </Text>

          {onStartFastingNow && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: radius.md,
                marginTop: spacing.sm,
              }}
              onPress={onStartFastingNow}
            >
              <PlayCircle size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>Mulai Puasa Sekarang</Text>
            </TouchableOpacity>
          )}
        </View>
      </Surface>
    );
  }

  const stage = getFastingStage(elapsedSeconds);
  const time = formatElapsedTime(elapsedSeconds);

  return (
    <Surface style={{ padding: spacing.md, marginVertical: spacing.xs, borderColor: stage.color + '40' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Clock size={16} color={colors.textTertiary} />
          <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' }} numberOfLines={1}>WAKTU BERJALAN SEJAK MAKAN</Text>
        </View>

        <TouchableOpacity onPress={onEditTimePress} style={{ padding: 4 }}>
          <RefreshCw size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Main Timer Display */}
      <View style={{ alignItems: 'center', marginVertical: spacing.xs }}>
        <Text style={{ fontSize: 40, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1 }}>{time.formatted}</Text>
      </View>

      {/* Fasting Stage Info Card */}
      <View style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: spacing.sm + 2, borderWidth: 1, borderColor: colors.divider }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: stage.color }} />
          <Text style={{ ...typography.bodyMedium, color: stage.color }} numberOfLines={1}>{stage.name}</Text>
        </View>
        <Text style={{ ...typography.caption, color: colors.textTertiary, lineHeight: 16 }}>{stage.description}</Text>
      </View>
    </Surface>
  );
};
