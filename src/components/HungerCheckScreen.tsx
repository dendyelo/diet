import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUp } from 'lucide-react-native';
import { useTheme } from '../context/AppContext';
import {
  decideHunger,
  EatingIntent,
  HungerCheckAnswer,
  HungerDecision,
  HungerSignal,
} from '../utils/hungerDecision';
import { triggerHaptic } from '../utils/haptics';

export interface HungerCheckResult {
  answer: HungerCheckAnswer;
  signal: HungerSignal;
  intent: EatingIntent;
  decision: HungerDecision;
  checkedAt: string;
}

interface HungerCheckScreenProps {
  caloriesIn: number;
  targetCalories: number;
  maintenanceCalories: number;
  snackCount: number;
  fastingHours: number;
  onAddWater: () => Promise<void>;
  onComplete: (
    result: HungerCheckResult | null,
    nextAction?: 'food' | 'snack'
  ) => void;
}

type CheckStep = 'answer' | 'signal' | 'intent' | 'result';
const useNativeDriver = Platform.OS !== 'web';

const formatClock = (date: Date) => {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

interface ChoiceButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  align?: 'left' | 'center';
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({
  label,
  selected,
  onPress,
  align = 'center',
}) => {
  const { colors, radius, typography } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        align === 'left' ? styles.stackedChoice : styles.inlineChoice,
        {
          borderRadius: radius.sm,
          borderColor: selected ? colors.primary : colors.divider,
          backgroundColor: selected ? colors.primarySubtle : colors.surface,
          opacity: pressed ? 0.68 : 1,
        },
      ]}
    >
      <Text
        style={[
          typography.bodyMedium,
          {
            color: selected ? colors.primaryText : colors.textPrimary,
            textAlign: align,
            fontWeight: '500',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const HungerCheckScreen: React.FC<HungerCheckScreenProps> = ({
  caloriesIn,
  targetCalories,
  maintenanceCalories,
  snackCount,
  fastingHours,
  onAddWater,
  onComplete,
}) => {
  const { colors, isDark, radius, typography } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [step, setStep] = useState<CheckStep>('answer');
  const [answer, setAnswer] = useState<HungerCheckAnswer | null>(null);
  const [signal, setSignal] = useState<HungerSignal>(null);
  const [intent, setIntent] = useState<EatingIntent>(null);
  const [decision, setDecision] = useState<HungerDecision | null>(null);
  const [waterAdded, setWaterAdded] = useState(false);

  const defaultBudget = Math.max(0, Math.round(targetCalories - caloriesIn));
  const budgetLabel =
    caloriesIn > maintenanceCalories
      ? `${Math.round(caloriesIn - maintenanceCalories).toLocaleString('id-ID')} kkal melebihi kebutuhan harian`
      : caloriesIn > targetCalories
        ? 'Rencana makan terlewati'
        : `${defaultBudget.toLocaleString('id-ID')} kkal dalam rencana`;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      orbScale.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.045,
          duration: 1800,
          useNativeDriver,
        }),
        Animated.timing(orbScale, {
          toValue: 1,
          duration: 1800,
          useNativeDriver,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [orbScale, reduceMotion]);

  const buildResult = useCallback(
    (
      selectedAnswer: HungerCheckAnswer,
      selectedSignal: HungerSignal,
      selectedIntent: EatingIntent
    ) => {
      const nextDecision = decideHunger({
        answer: selectedAnswer,
        signal: selectedSignal,
        intent: selectedIntent,
        caloriesIn,
        targetCalories,
        maintenanceCalories,
        snackCount,
        fastingHours,
      });

      setAnswer(selectedAnswer);
      setSignal(selectedSignal);
      setIntent(selectedIntent);
      setDecision(nextDecision);
      setStep('result');
      triggerHaptic(nextDecision.kind === 'water' ? 'medium' : 'light');
    },
    [
      caloriesIn,
      fastingHours,
      maintenanceCalories,
      snackCount,
      targetCalories,
    ]
  );

  const result: HungerCheckResult | null = useMemo(() => {
    if (!answer || !decision) return null;
    return {
      answer,
      signal,
      intent,
      decision,
      checkedAt: new Date().toISOString(),
    };
  }, [answer, decision, intent, signal]);

  const finish = useCallback(
    (nextAction?: 'food' | 'snack') => {
      triggerHaptic('medium');
      Animated.timing(translateY, {
        toValue: -Math.max(screenHeight, 760),
        duration: reduceMotion ? 1 : 260,
        useNativeDriver,
      }).start(() => onComplete(result, nextAction));
    },
    [onComplete, reduceMotion, result, screenHeight, translateY]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          return (
            Math.abs(gesture.dy) > 8 &&
            Math.abs(gesture.dy) > Math.abs(gesture.dx)
          );
        },
        onPanResponderMove: (_, gesture) => {
          translateY.setValue(gesture.dy < 0 ? gesture.dy : gesture.dy * 0.06);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -76 || gesture.vy < -0.65) {
            finish();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            damping: 18,
            stiffness: 180,
            mass: 0.8,
            useNativeDriver,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver,
          }).start();
        },
      }),
    [finish, translateY]
  );

  const handleAnswer = (selected: HungerCheckAnswer) => {
    triggerHaptic('light');
    setAnswer(selected);
    if (selected === 'hungry') {
      setStep('signal');
      return;
    }

    buildResult(selected, null, null);
  };

  const handleSignal = (selected: Exclude<HungerSignal, null>) => {
    triggerHaptic('light');
    setSignal(selected);
    if (selected === 'physical') {
      setStep('intent');
      return;
    }

    buildResult('hungry', selected, 'snack');
  };

  const handleIntent = (selected: Exclude<EatingIntent, null>) => {
    setIntent(selected);
    buildResult('hungry', 'physical', selected);
  };

  const resetCheck = () => {
    triggerHaptic('light');
    setAnswer(null);
    setSignal(null);
    setIntent(null);
    setDecision(null);
    setWaterAdded(false);
    setStep('answer');
  };

  const recordWater = async () => {
    if (waterAdded) return;
    await onAddWater();
    setWaterAdded(true);
    triggerHaptic('success');
  };

  const gradientColors = isDark
    ? (['#0B0D0E', '#101711', '#0B0D0E'] as const)
    : (['#F5F5F2', '#EDF4E6', '#F2F4F1'] as const);

  return (
    <Animated.View
      style={[styles.fill, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LinearGradient colors={gradientColors} style={styles.fill}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topBar}>
            <Text style={[typography.overline, { color: colors.textTertiary }]}>
              CHECK-IN · {formatClock(new Date())}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {budgetLabel}
            </Text>
          </View>

          <View style={styles.content}>
            <Animated.View
              style={[
                styles.orbOuter,
                {
                  backgroundColor: isDark
                    ? 'rgba(201, 244, 122, 0.07)'
                    : 'rgba(123, 224, 180, 0.16)',
                  borderColor: isDark
                    ? 'rgba(201, 244, 122, 0.13)'
                    : 'rgba(8, 122, 87, 0.10)',
                  transform: [{ scale: orbScale }],
                },
              ]}
            >
              <LinearGradient
                colors={
                  isDark
                    ? (['#D9FF91', '#6AAE70'] as const)
                    : (['#9CE6BD', '#087A57'] as const)
                }
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.orb}
              >
                <View
                  style={[
                    styles.orbCore,
                    { backgroundColor: isDark ? '#182018' : '#F8FFF9' },
                  ]}
                />
              </LinearGradient>
            </Animated.View>

            {step === 'answer' && (
              <View style={styles.questionBlock}>
                <Text style={[typography.display, styles.centerText, { color: colors.textPrimary }]}>
                  Apa kamu lapar?
                </Text>
                <Text style={[typography.body, styles.supportingText, { color: colors.textSecondary }]}>
                  Dengarkan tubuhmu. Catatan hari ini akan membantu menentukan langkah berikutnya.
                </Text>
                <View style={styles.primaryChoices}>
                  <ChoiceButton
                    label="Ya, lapar"
                    selected={false}
                    onPress={() => handleAnswer('hungry')}
                  />
                  <ChoiceButton
                    label="Ragu"
                    selected={false}
                    onPress={() => handleAnswer('unsure')}
                  />
                  <ChoiceButton
                    label="Tidak"
                    selected={false}
                    onPress={() => handleAnswer('not_hungry')}
                  />
                </View>
              </View>
            )}

            {step === 'signal' && (
              <View style={styles.questionBlock}>
                <Text style={[typography.h1, styles.centerText, { color: colors.textPrimary }]}>
                  Yang paling terasa?
                </Text>
                <Text style={[typography.body, styles.supportingText, { color: colors.textSecondary }]}>
                  Tidak ada jawaban yang salah.
                </Text>
                <View style={styles.stackedChoices}>
                  <ChoiceButton
                    label="Perut kosong atau energi turun"
                    selected={signal === 'physical'}
                    onPress={() => handleSignal('physical')}
                    align="left"
                  />
                  <ChoiceButton
                    label="Ingin rasa tertentu"
                    selected={signal === 'specific_craving'}
                    onPress={() => handleSignal('specific_craving')}
                    align="left"
                  />
                  <ChoiceButton
                    label="Bosan atau sedang stres"
                    selected={signal === 'emotion'}
                    onPress={() => handleSignal('emotion')}
                    align="left"
                  />
                </View>
              </View>
            )}

            {step === 'intent' && (
              <View style={styles.questionBlock}>
                <Text style={[typography.h1, styles.centerText, { color: colors.textPrimary }]}>
                  Kamu ingin apa?
                </Text>
                <Text style={[typography.body, styles.supportingText, { color: colors.textSecondary }]}>
                  Saran mempertimbangkan rasa lapar, rencana makan, dan kebutuhan harianmu.
                </Text>
                <View style={styles.primaryChoices}>
                  <ChoiceButton
                    label="Makan"
                    selected={intent === 'meal'}
                    onPress={() => handleIntent('meal')}
                  />
                  <ChoiceButton
                    label="Ngemil"
                    selected={intent === 'snack'}
                    onPress={() => handleIntent('snack')}
                  />
                </View>
              </View>
            )}

            {step === 'result' && decision && (
              <View style={styles.resultBlock}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        decision.kind === 'water'
                          ? colors.infoSubtle
                          : colors.primarySubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.overline,
                      {
                        color:
                          decision.kind === 'water'
                            ? colors.info
                            : colors.primaryText,
                      },
                    ]}
                  >
                    {decision.status}
                  </Text>
                </View>
                <Text style={[typography.display, styles.centerText, { color: colors.textPrimary }]}>
                  {decision.headline}
                </Text>
                <Text style={[typography.body, styles.supportingText, { color: colors.textSecondary }]}>
                  {decision.body}
                </Text>

                <View style={styles.resultActions}>
                  {decision.kind === 'water' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Catat satu gelas air"
                      disabled={waterAdded}
                      onPress={recordWater}
                      style={({ pressed }) => [
                        styles.resultButton,
                        {
                          backgroundColor: waterAdded
                            ? colors.infoSubtle
                            : colors.info,
                          opacity: pressed ? 0.78 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.bodyMedium,
                          {
                            color: waterAdded ? colors.info : colors.onInfo,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {waterAdded ? '1 gelas · tercatat' : '+ 1 gelas air'}
                      </Text>
                    </Pressable>
                  ) : null}

                  {decision.kind === 'meal' || decision.kind === 'small_meal' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Masuk dan catat makanan"
                      onPress={() => finish('food')}
                      style={({ pressed }) => [
                        styles.resultButton,
                        {
                          backgroundColor: colors.primary,
                          opacity: pressed ? 0.78 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.bodyMedium,
                          { color: colors.onPrimary, fontWeight: '600' },
                        ]}
                      >
                        Masuk & catat makan
                      </Text>
                    </Pressable>
                  ) : null}

                  {decision.kind === 'snack' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Masuk dan catat snack"
                      onPress={() => finish('snack')}
                      style={({ pressed }) => [
                        styles.resultButton,
                        {
                          backgroundColor: colors.primary,
                          opacity: pressed ? 0.78 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.bodyMedium,
                          { color: colors.onPrimary, fontWeight: '600' },
                        ]}
                      >
                        Masuk & catat snack
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ubah jawaban check-in"
                    onPress={resetCheck}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
                  >
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>
                      Ubah jawaban
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka halaman hari ini"
            accessibilityHint="Ketuk atau geser layar ke atas"
            onPress={() => finish()}
            style={({ pressed }) => [
              styles.swipeArea,
              {
                borderColor: colors.divider,
                backgroundColor: pressed ? colors.surfacePressed : colors.surface,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.textDisabled }]} />
            <View style={styles.swipeLabelRow}>
              <ArrowUp size={15} strokeWidth={1.8} color={colors.textTertiary} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Geser ke atas untuk melihat hari ini
              </Text>
            </View>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    </Animated.View>
  );

};

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 18,
  },
  orbOuter: {
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  orb: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    opacity: 0.88,
  },
  questionBlock: {
    width: '100%',
    maxWidth: 460,
    alignItems: 'center',
  },
  resultBlock: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  supportingText: {
    textAlign: 'center',
    maxWidth: 390,
    marginTop: 12,
  },
  primaryChoices: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
  },
  stackedChoices: {
    width: '100%',
    gap: 8,
    marginTop: 26,
  },
  choice: {
    minHeight: 52,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineChoice: {
    flex: 1,
  },
  stackedChoice: {
    width: '100%',
  },
  statusPill: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultActions: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
    marginTop: 26,
  },
  resultButton: {
    width: '100%',
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeArea: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  swipeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
