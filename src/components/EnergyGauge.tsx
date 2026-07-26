import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Surface } from './Surface';
import { useTheme } from '../context/ThemeContext';

interface EnergyGaugeProps {
  caloriesIn: number;
  caloriesOut: number;
  dailyBMR?: number;
  elapsedBMR?: number;
  stepCalories?: number;
  netBalance: number;
  targetDeficit: number;
  isDeficit: boolean;
  isCheatDay?: boolean;
}

export const EnergyGauge: React.FC<EnergyGaugeProps> = ({
  caloriesIn,
  caloriesOut,
  dailyBMR = 1600,
  elapsedBMR = 800,
  stepCalories = 0,
  netBalance,
  targetDeficit,
  isDeficit,
  isCheatDay = false,
}) => {
  const { colors, spacing, radius: themeRadius, typography } = useTheme();

  const absBalance = Math.abs(netBalance);
  const statusColor = isCheatDay ? colors.warning : isDeficit ? colors.primary : colors.danger;
  const statusText = isCheatDay
    ? 'CHEAT DAY MODE'
    : isDeficit
    ? `DEFISIT ${absBalance} KCAL`
    : `LEBIH ${absBalance} KKAL`;

  // SVG Gauge Calculations
  const radius = 80;
  const strokeWidth = 14;
  const center = 100;
  const startAngle = Math.PI;
  const endAngle = 0;

  const ratio = caloriesOut > 0 ? Math.min(1.5, caloriesIn / caloriesOut) : 0;
  const fillAngle = startAngle - ratio * Math.PI;

  const getArcPath = (start: number, end: number) => {
    const x1 = center + radius * Math.cos(start);
    const y1 = center - radius * Math.sin(start);
    const x2 = center + radius * Math.cos(end);
    const y2 = center - radius * Math.sin(end);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <Surface style={{ padding: spacing.md, borderColor: statusColor + '40', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: spacing.sm }}>
        <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' }} numberOfLines={1}>
          ENERGY BALANCE GAUGE
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: statusColor + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: themeRadius.sm }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor }} numberOfLines={1}>{statusText}</Text>
        </View>
      </View>

      <View style={{ height: 110, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Svg width={200} height={110} viewBox="0 0 200 110">
          {/* Track background */}
          <Path
            d={getArcPath(startAngle, endAngle)}
            stroke={colors.surfaceElevated}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          {/* Fill Arc */}
          <Path
            d={getArcPath(startAngle, fillAngle)}
            stroke={statusColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        <View style={{ position: 'absolute', top: 50, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.textPrimary }}>
            {netBalance >= 0 ? `-${netBalance}` : `+${Math.abs(netBalance)}`}
          </Text>
          <Text style={{ fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {netBalance >= 0 ? 'Kalori belum terpenuhi' : 'Kalori berlebih'}
          </Text>
        </View>
      </View>

      {/* Breakdown Grid */}
      <View style={{ flexDirection: 'row', width: '100%', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, gap: spacing.sm }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: colors.textTertiary }}>MASUK (MAKAN)</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.warning }}>{caloriesIn} kcal</Text>
        </View>

        <View style={{ width: 1, backgroundColor: colors.divider }} />

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: colors.textTertiary }}>KELUAR (BMR+ACT)</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{caloriesOut} kcal</Text>
        </View>
      </View>
    </Surface>
  );
};
