import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GlassCard } from './GlassCard';

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
  const absBalance = Math.abs(netBalance);
  const statusColor = isCheatDay ? '#F59E0B' : isDeficit ? '#10B981' : '#EF4444';
  const statusText = isCheatDay
    ? 'CHEAT DAY MODE'
    : isDeficit
    ? `DEFISIT ${absBalance} KCAL`
    : `SURPLUS ${absBalance} KCAL`;

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
    <GlassCard style={[styles.container, { borderColor: statusColor + '40' }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>ENERGY BALANCE GAUGE</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.badgeText, { color: statusColor }]} numberOfLines={1}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.gaugeWrapper}>
        <Svg width={200} height={115} viewBox="0 0 200 115">
          <Path
            d={getArcPath(startAngle, endAngle)}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Path
            d={getArcPath(startAngle, Math.max(0, fillAngle))}
            fill="none"
            stroke={statusColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>

        <View style={styles.centerTextOverlay}>
          <Text style={styles.netValueText} numberOfLines={1} adjustsFontSizeToFit={true}>
            {isDeficit ? `-${absBalance}` : `+${absBalance}`}
          </Text>
          <Text style={styles.netSubText} numberOfLines={1}>
            {isDeficit ? 'Net Defisit Realtime' : 'Surplus Warning'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel} numberOfLines={1}>KALORI MASUK (IN)</Text>
          <Text style={[styles.statValue, { color: '#60A5FA' }]} numberOfLines={1}>{caloriesIn} kcal</Text>
          <Text style={styles.statSub} numberOfLines={1}>Makanan & Cemilan</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel} numberOfLines={1}>KALORI KELUAR (OUT)</Text>
          <Text style={[styles.statValue, { color: '#34D399' }]} numberOfLines={1}>{caloriesOut} kcal</Text>
          <Text style={styles.statSub} numberOfLines={1}>
            BMR ({elapsedBMR}) • Steps (+{stepCalories})
          </Text>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderWidth: 1,
    padding: 14,
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
    marginRight: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  gaugeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    position: 'relative',
  },
  centerTextOverlay: {
    position: 'absolute',
    top: 32,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  netValueText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  netSubText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statSub: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
