import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Surface } from './Surface';
import { Flame, Cookie, Droplet } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

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
  const { colors, spacing, radius, typography } = useTheme();

  const p1 = Math.min(100, Math.max(0, percentageDeficit));
  const p2 = Math.min(
    100,
    Math.max(0, Math.round(((maxSnacksAllowed - Math.min(maxSnacksAllowed, snackCount)) / maxSnacksAllowed) * 100))
  );
  const p3 = Math.min(100, Math.round((waterGlasses / targetWaterGlasses) * 100));

  const size = 120;
  const center = size / 2;

  const renderRing = (r: number, strokeWidth: number, percentage: number, color: string) => {
    const circumference = 2 * Math.PI * r;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={colors.divider}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
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
    <Surface style={{ padding: spacing.md, marginVertical: spacing.xs }}>
      <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: spacing.sm }}>
        TRIPLE HABIT RINGS
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
        <Svg width={size} height={size}>
          {renderRing(50, 10, p1, colors.primary)}
          {renderRing(36, 10, p2, colors.warning)}
          {renderRing(22, 10, p3, colors.info)}
        </Svg>

        <View style={{ gap: spacing.xs + 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Flame size={14} color={colors.primary} />
            <Text style={{ ...typography.caption, color: colors.textPrimary, fontWeight: '600' }}>Defisit Kalori ({p1}%)</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Cookie size={14} color={colors.warning} />
            <Text style={{ ...typography.caption, color: colors.textPrimary, fontWeight: '600' }}>Kontrol Snack ({snackCount}/{maxSnacksAllowed})</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Droplet size={14} color={colors.info} />
            <Text style={{ ...typography.caption, color: colors.textPrimary, fontWeight: '600' }}>Air Minum ({waterGlasses}/{targetWaterGlasses})</Text>
          </View>
        </View>
      </View>
    </Surface>
  );
};
