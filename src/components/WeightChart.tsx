import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

export interface WeightChartProps {
  dataPoints: { dateLabel: string; dateStr: string; weightKg: number }[];
  maDataPoints: { dateLabel: string; dateStr: string; weightKg: number }[];
  targetKg: number;
}

export const WeightChart: React.FC<WeightChartProps> = ({
  dataPoints,
  maDataPoints,
  targetKg,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  // Assume a typical padding for the container. The user can wrap this in a GlassCard.
  const chartWidth = windowWidth - 32;
  const chartHeight = 200;

  const padding = { left: 45, right: 15, top: 15, bottom: 30 };

  const {
    minY,
    maxY,
    yRange,
    hasData,
    dailyPoints,
    maPoints,
    yGridLines,
    xLabels,
  } = useMemo(() => {
    if (dataPoints.length === 0) {
      return { hasData: false };
    }

    const allWeights = [
      ...dataPoints.map((d) => d.weightKg),
      ...maDataPoints.map((d) => d.weightKg),
      targetKg,
    ];

    const actualMin = Math.min(...allWeights);
    const actualMax = Math.max(...allWeights);

    const minY = actualMin - 1;
    const maxY = actualMax + 1;
    const yRange = maxY - minY || 1; // Prevent division by zero

    // Prepare Daily Points with normalized X (0 to 1)
    const dailyPoints = dataPoints.map((dp, index) => {
      const normalizedX =
        dataPoints.length > 1 ? index / (dataPoints.length - 1) : 0.5;
      return {
        ...dp,
        normalizedX,
      };
    });

    // Prepare MA Points mapped to the same X axis
    const maPoints = maDataPoints
      .map((ma) => {
        const matchingIndex = dataPoints.findIndex(
          (dp) => dp.dateStr === ma.dateStr
        );
        if (matchingIndex === -1) return null;
        const normalizedX =
          dataPoints.length > 1
            ? matchingIndex / (dataPoints.length - 1)
            : 0.5;
        return {
          ...ma,
          normalizedX,
        };
      })
      .filter(Boolean) as { weightKg: number; normalizedX: number }[];

    // Y Grid Lines (e.g., 5 evenly spaced lines)
    const yGridLines = [];
    for (let i = 0; i <= 4; i++) {
      yGridLines.push(minY + (yRange * i) / 4);
    }

    // X Labels (max 7)
    const maxLabels = 7;
    const step = Math.ceil(dataPoints.length / maxLabels);
    const xLabels = dataPoints
      .map((dp, index) => ({
        label: dp.dateLabel,
        normalizedX:
          dataPoints.length > 1 ? index / (dataPoints.length - 1) : 0.5,
        index,
      }))
      .filter((_, i) => i % step === 0 || i === dataPoints.length - 1);

    // Remove duplicates if the last element was added twice
    const uniqueXLabels = xLabels.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.index === item.index)
    );

    return {
      minY,
      maxY,
      yRange,
      hasData: true,
      dailyPoints,
      maPoints,
      yGridLines,
      xLabels: uniqueXLabels,
    };
  }, [dataPoints, maDataPoints, targetKg]);

  if (!hasData || !dailyPoints || dailyPoints.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height: chartHeight }]}>
        <Text style={styles.emptyText}>Belum ada data</Text>
      </View>
    );
  }

  const getX = (normalizedX: number) =>
    padding.left +
    normalizedX * (chartWidth - padding.left - padding.right);

  const getY = (val: number) =>
    padding.top +
    ((maxY! - val) / yRange!) * (chartHeight - padding.top - padding.bottom);

  // Path generators
  const getLinePath = (
    pts: { weightKg: number; normalizedX: number }[]
  ) => {
    if (pts.length === 0) return '';
    return pts
      .map((p, i) =>
        i === 0
          ? `M ${getX(p.normalizedX)},${getY(p.weightKg)}`
          : `L ${getX(p.normalizedX)},${getY(p.weightKg)}`
      )
      .join(' ');
  };

  const dailyPath = getLinePath(dailyPoints);
  const maPath = getLinePath(maPoints!);

  // Gradient area path
  const firstPt = dailyPoints[0];
  const lastPt = dailyPoints[dailyPoints.length - 1];
  const areaBottomY = chartHeight - padding.bottom;
  const areaPath = `
    ${dailyPath}
    L ${getX(lastPt.normalizedX)},${areaBottomY}
    L ${getX(firstPt.normalizedX)},${areaBottomY}
    Z
  `;

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3B82F6" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <G>
          {/* Y-axis grid and labels */}
          {yGridLines?.map((val, i) => {
            const y = getY(val);
            return (
              <G key={`y-${i}`}>
                <Line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
                <SvgText
                  x={padding.left - 8}
                  y={y + 4} // center text vertically
                  fill="rgba(255,255,255,0.5)"
                  fontSize="10"
                  textAnchor="end"
                >
                  {val.toFixed(1)}
                </SvgText>
              </G>
            );
          })}

          {/* X-axis labels */}
          {xLabels?.map((labelObj, i) => (
            <SvgText
              key={`x-${i}`}
              x={getX(labelObj.normalizedX)}
              y={chartHeight - 10}
              fill="rgba(255,255,255,0.5)"
              fontSize="10"
              textAnchor="middle"
            >
              {labelObj.label}
            </SvgText>
          ))}
        </G>

        {/* Target Line */}
        <Line
          x1={padding.left}
          y1={getY(targetKg)}
          x2={chartWidth - padding.right}
          y2={getY(targetKg)}
          stroke="#F59E0B"
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Gradient Fill */}
        <Path d={areaPath} fill="url(#gradientFill)" />

        {/* Moving Average Line */}
        {maPath ? (
          <Path
            d={maPath}
            stroke="#10B981"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 4"
          />
        ) : null}

        {/* Daily Weight Line */}
        <Path d={dailyPath} stroke="#3B82F6" strokeWidth="2" fill="none" />

        {/* Daily Weight Data Points */}
        {dailyPoints.map((dp, i) => (
          <Circle
            key={`pt-${i}`}
            cx={getX(dp.normalizedX)}
            cy={getY(dp.weightKg)}
            r="3"
            fill="#3B82F6"
            stroke="#09090B"
            strokeWidth="1.5"
          />
        ))}
      </Svg>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>Berat Harian</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, styles.dashedIndicator, { borderColor: '#10B981' }]} />
          <Text style={styles.legendText}>MA-7</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, styles.dashedIndicator, { borderColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Target</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dashedIndicator: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  legendText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
});
