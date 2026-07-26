import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { GlassCard } from './GlassCard';
import { Flame, Cookie, Droplet } from 'lucide-react-native';

interface HabitRingsProps {
  percentageDeficit: number;
  snackCount: number;
  maxSnacksAllowed?: number;
  waterGlasses: number;
  targetWaterGlasses?: number;
}

export const HabitRings: React.FC<HabitRingsProps> = ({
  percentageDeficit,
  snackCount,
  maxSnacksAllowed = 2,
  waterGlasses,
  targetWaterGlasses = 8,
}) => {
  // Calculate percentage progress for each ring
  const p1 = Math.min(100, Math.max(0, percentageDeficit));
  const p2 = Math.min(
    100,
    Math.max(0, Math.round(((maxSnacksAllowed - Math.min(maxSnacksAllowed, snackCount)) / maxSnacksAllowed) * 100))
  );
  const p3 = Math.min(100, Math.round((waterGlasses / targetWaterGlasses) * 100));

  const size = 120;
  const center = size / 2;

  const renderRing = (radius: number, strokeWidth: number, percentage: number, color: string) => {
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color + '20'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </>
    );
  };

  return (
    <GlassCard style={styles.container}>
      <Text style={styles.title}>CINCIN KEBIASAAN HARIAN</Text>

      <View style={styles.contentRow}>
        <View style={styles.ringWrapper}>
          <Svg width={size} height={size}>
            {/* Outer Ring: Deficit */}
            {renderRing(50, 8, p1, '#10B981')}
            {/* Middle Ring: Snack Control */}
            {renderRing(38, 8, p2, '#F59E0B')}
            {/* Inner Ring: Hydration */}
            {renderRing(26, 8, p3, '#3B82F6')}
          </Svg>
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendRow}>
            <View style={[styles.iconBox, { backgroundColor: '#10B98120' }]}>
              <Flame size={14} color="#10B981" />
            </View>
            <View>
              <Text style={styles.legendTitle}>Target Defisit Kalori</Text>
              <Text style={[styles.legendValue, { color: '#10B981' }]}>{p1}% Tercapai</Text>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
              <Cookie size={14} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.legendTitle}>Kontrol Ngemil</Text>
              <Text style={[styles.legendValue, { color: '#F59E0B' }]}>
                {snackCount} / {maxSnacksAllowed} Cemilan
              </Text>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={[styles.iconBox, { backgroundColor: '#3B82F620' }]}>
              <Droplet size={14} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.legendTitle}>Target Hidrasi Air</Text>
              <Text style={[styles.legendValue, { color: '#3B82F6' }]}>
                {waterGlasses} / {targetWaterGlasses} Gelas
              </Text>
            </View>
          </View>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendTitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  legendValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
