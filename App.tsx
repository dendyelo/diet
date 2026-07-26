import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { ChartNoAxesCombined, House, Plus, UserRound } from 'lucide-react-native';
import {
  AppProvider,
  useAI,
  useHealth,
  useMeals,
  useProfile,
  useTheme,
  useWeight,
} from './src/context/AppContext';
import { LivingTimelineHome } from './src/screens/LivingTimelineHome';
import { ProgressHubScreen } from './src/screens/ProgressHubScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { QuickAddMealModal } from './src/components/QuickAddMealModal';
import { AddWeightModal } from './src/components/AddWeightModal';
import { AICoachChatModal } from './src/components/AICoachChatModal';
import { QuickActionMenu } from './src/components/QuickActionMenu';
import { QuickAddActivityModal } from './src/components/QuickAddActivityModal';
import {
  HungerCheckResult,
  HungerCheckScreen,
} from './src/components/HungerCheckScreen';
import { triggerHaptic } from './src/utils/haptics';
import {
  calculateTargetCalories,
  calculateTargetProtein,
} from './src/utils/calorieCalc';
import { decideHunger } from './src/utils/hungerDecision';
import { DailyAIInsight } from './src/services/aiService';

type TabName = 'home' | 'progress' | 'profile';

const CHECK_IN_REOPEN_DELAY_MS = 30 * 60 * 1000;

interface BottomTabButtonProps {
  active: boolean;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  icon: (color: string) => React.ReactNode;
}

const BottomTabButton: React.FC<BottomTabButtonProps> = ({
  active,
  label,
  accessibilityLabel,
  onPress,
  icon,
}) => {
  const { colors, typography } = useTheme();
  const color = active ? colors.textPrimary : colors.textTertiary;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        active && { backgroundColor: colors.surfaceElevated },
        { opacity: pressed ? 0.58 : 1 },
      ]}
    >
      {icon(color)}
      {active ? (
        <Text style={[typography.caption, { color, fontWeight: '600' }]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
};

const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);
  const [showQuickFoodLogger, setShowQuickFoodLogger] = useState(false);
  const [quickLoggerIsSnack, setQuickLoggerIsSnack] = useState(false);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAICoachChat, setShowAICoachChat] = useState(false);
  const [coachStarterPrompt, setCoachStarterPrompt] = useState<string | null>(
    null
  );
  const [showHungerCheck, setShowHungerCheck] = useState(true);
  const [lastCheckIn, setLastCheckIn] = useState<HungerCheckResult | null>(null);
  const [dailyAIInsight, setDailyAIInsight] = useState<DailyAIInsight | null>(null);
  const [isDailyAIInsightLoading, setIsDailyAIInsightLoading] = useState(false);
  const [dailyAIRefreshToken, setDailyAIRefreshToken] = useState(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundStartedAt = useRef<number | null>(null);
  const lastAIRequestKey = useRef<string | null>(null);

  const { profile, isLoading: isProfileLoading } = useProfile();
  const {
    mealLogs,
    todayLogs,
    totalCaloriesIn,
    snackCount,
    isLoading: areMealsLoading,
    addMealLog,
  } = useMeals();
  const {
    waterGlasses,
    steps,
    fastingState,
    energy,
    addWaterGlass,
    resetFastingTimer,
    stepTrackingStatus,
    addActivityLog,
  } = useHealth();
  const { weightLogs, addWeightLog } = useWeight();
  const {
    userApiKey,
    connectionStatus,
    parseFoodNutrition,
    parseActivity,
    generateDailyInsight,
  } = useAI();
  const { colors, isDark, typography } = useTheme();

  const targetCalories = calculateTargetCalories(profile);
  const targetProtein = calculateTargetProtein(profile);
  const maintenanceCalories = energy.adjustedMaintenance;
  const aiMaintenanceCalories =
    Math.round(maintenanceCalories / 25) * 25;
  const aiCaloriesOutSoFar =
    Math.round(energy.totalCaloriesOut / 25) * 25;
  const calorieBudgetRemaining = targetCalories - (totalCaloriesIn || 0);
  const isDataLoading = isProfileLoading || areMealsLoading;
  const todayProteinGrams = useMemo(
    () =>
      todayLogs.reduce(
        (total, meal) => total + (meal.nutrition.proteinGrams || 0),
        0
      ),
    [todayLogs]
  );
  const stepsBucket = Math.floor((steps || 0) / 1000);
  const recentMealContext = useMemo(
    () =>
      todayLogs.slice(0, 5).map((meal) => ({
        name: meal.name,
        calories: meal.nutrition.calories,
        proteinGrams: meal.nutrition.proteinGrams,
        isSnack: meal.isSnack,
      })),
    [todayLogs]
  );
  const liveHungerDecision = useMemo(() => {
    if (!lastCheckIn) return null;

    return decideHunger({
      answer: lastCheckIn.answer,
      signal: lastCheckIn.signal,
      intent: lastCheckIn.intent,
      caloriesIn: totalCaloriesIn || 0,
      targetCalories,
      maintenanceCalories,
      snackCount: snackCount || 0,
      fastingHours: fastingState.fastingHours || 0,
    });
  }, [
    fastingState.fastingHours,
    lastCheckIn,
    maintenanceCalories,
    snackCount,
    targetCalories,
    totalCaloriesIn,
  ]);
  const hungerContext = useMemo(
    () =>
      lastCheckIn && liveHungerDecision
        ? {
            answer: lastCheckIn.answer,
            signal: lastCheckIn.signal,
            intent: lastCheckIn.intent,
            decisionKind: liveHungerDecision.kind,
          }
        : null,
    [lastCheckIn, liveHungerDecision]
  );
  const dailyInsightInput = useMemo(
    () => ({
      name: profile.name || 'Teman',
      currentHour: new Date().getHours(),
      caloriesIn: totalCaloriesIn || 0,
      targetCalories,
      maintenanceCalories: aiMaintenanceCalories,
      caloriesOutSoFar: aiCaloriesOutSoFar,
      remainingCalories: calorieBudgetRemaining,
      proteinGrams: todayProteinGrams,
      targetProteinGrams: targetProtein,
      waterGlasses: waterGlasses || 0,
      steps: stepsBucket * 1000,
      fastingHours: fastingState.fastingHours || 0,
      snackCount: snackCount || 0,
      recentMeals: recentMealContext,
      lastHungerCheck: hungerContext,
    }),
    [
      calorieBudgetRemaining,
      fastingState.fastingHours,
      hungerContext,
      profile.name,
      recentMealContext,
      snackCount,
      stepsBucket,
      targetCalories,
      targetProtein,
      aiMaintenanceCalories,
      aiCaloriesOutSoFar,
      todayProteinGrams,
      totalCaloriesIn,
      waterGlasses,
    ]
  );
  const dailyAIRequestKey = useMemo(
    () => JSON.stringify([dailyInsightInput, dailyAIRefreshToken]),
    [dailyAIRefreshToken, dailyInsightInput]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appState.current;

      if (nextState === 'background') {
        backgroundStartedAt.current = Date.now();
      }

      if (
        nextState === 'active' &&
        (previousState === 'background' || previousState === 'inactive') &&
        backgroundStartedAt.current !== null &&
        Date.now() - backgroundStartedAt.current >= CHECK_IN_REOPEN_DELAY_MS
      ) {
        setShowHungerCheck(true);
      }

      if (nextState === 'active') {
        backgroundStartedAt.current = null;
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!userApiKey || connectionStatus !== 'connected') {
      lastAIRequestKey.current = null;
      setDailyAIInsight(null);
      setIsDailyAIInsightLoading(false);
      return;
    }
    if (showHungerCheck) {
      setIsDailyAIInsightLoading(false);
      return;
    }
    if (lastAIRequestKey.current === dailyAIRequestKey) return;

    let cancelled = false;
    let settled = false;
    const timer = setTimeout(() => {
      lastAIRequestKey.current = dailyAIRequestKey;
      setIsDailyAIInsightLoading(true);

      void generateDailyInsight(dailyInsightInput)
        .then((insight) => {
          if (!cancelled) setDailyAIInsight(insight);
        })
        .catch(() => {
          if (!cancelled) setDailyAIInsight(null);
        })
        .finally(() => {
          settled = true;
          if (!cancelled) setIsDailyAIInsightLoading(false);
        });
    }, 650);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (
        !settled &&
        lastAIRequestKey.current === dailyAIRequestKey
      ) {
        lastAIRequestKey.current = null;
      }
    };
  }, [
    connectionStatus,
    dailyAIRequestKey,
    dailyInsightInput,
    generateDailyInsight,
    showHungerCheck,
    userApiKey,
  ]);

  const refreshDailyAIInsight = useCallback(() => {
    lastAIRequestKey.current = null;
    setDailyAIRefreshToken((value) => value + 1);
  }, []);

  const handleTabPress = (tab: TabName) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  const openFoodLogger = (isSnack = false) => {
    setQuickLoggerIsSnack(isSnack);
    setShowQuickFoodLogger(true);
  };

  const openAICoach = (starterPrompt?: string) => {
    setCoachStarterPrompt(starterPrompt || null);
    setShowAICoachChat(true);
  };

  const handleCenterPlusPress = () => {
    triggerHaptic('medium');
    setShowQuickActionMenu(true);
  };

  const handleSelectQuickAction = (
    action: 'food' | 'activity' | 'water' | 'weight' | 'fasting'
  ) => {
    triggerHaptic('light');
    switch (action) {
      case 'food':
        openFoodLogger(false);
        break;
      case 'activity':
        setShowAddActivity(true);
        break;
      case 'water':
        addWaterGlass();
        break;
      case 'weight':
        setShowAddWeight(true);
        break;
      case 'fasting':
        if (fastingState.elapsedSeconds > 0) {
          const hours = (fastingState.elapsedSeconds / 3600).toFixed(1);
          Alert.alert(
            'Akhiri sesi puasa?',
            `Sesi ini sudah berjalan ${hours} jam.`,
            [
              { text: 'Batal', style: 'cancel' },
              {
                text: 'Akhiri',
                style: 'destructive',
                onPress: () => resetFastingTimer(null),
              },
            ]
          );
        } else {
          resetFastingTimer(new Date().toISOString());
        }
        break;
    }
  };

  const handleCheckInComplete = (
    result: HungerCheckResult | null,
    nextAction?: 'food' | 'snack'
  ) => {
    if (result) {
      setLastCheckIn(result);
    }
    setShowHungerCheck(false);

    if (nextAction) {
      setTimeout(() => openFoodLogger(nextAction === 'snack'), 280);
    }
  };

  const latestWeight = weightLogs.length > 0 ? weightLogs[0].weightKg : null;

  if (isDataLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={[styles.loadingOrb, { backgroundColor: colors.primarySubtle }]}>
          <View style={[styles.loadingOrbCore, { backgroundColor: colors.primary }]} />
        </View>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          Menyiapkan check-in…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.safeMain, { backgroundColor: colors.background }]}
      >
        <View style={styles.screenContainer}>
          {activeTab === 'home' && (
            <LivingTimelineHome
              lastCheckIn={lastCheckIn}
              aiInsight={dailyAIInsight}
              aiInsightEnabled={connectionStatus === 'connected'}
              aiInsightLoading={isDailyAIInsightLoading}
              onRefreshAIInsight={refreshDailyAIInsight}
              onOpenHungerCheck={() => setShowHungerCheck(true)}
              onOpenAddMeal={() => openFoodLogger(false)}
              onOpenAddWeight={() => setShowAddWeight(true)}
              onOpenAddActivity={() => setShowAddActivity(true)}
              onOpenAICoachChat={openAICoach}
            />
          )}
          {activeTab === 'progress' && <ProgressHubScreen />}
          {activeTab === 'profile' && <ProfileScreen />}
        </View>

        <SafeAreaView
          edges={['bottom']}
          style={[styles.navSafeArea, { backgroundColor: colors.background }]}
        >
          <View
            style={[
              styles.navBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <BottomTabButton
              active={activeTab === 'home'}
              label="Hari ini"
              accessibilityLabel="Buka halaman hari ini"
              onPress={() => handleTabPress('home')}
              icon={(color) => <House size={19} strokeWidth={1.8} color={color} />}
            />
            <BottomTabButton
              active={activeTab === 'progress'}
              label="Progres"
              accessibilityLabel="Buka halaman progres"
              onPress={() => handleTabPress('progress')}
              icon={(color) => (
                <ChartNoAxesCombined size={19} strokeWidth={1.8} color={color} />
              )}
            />
            <BottomTabButton
              active={activeTab === 'profile'}
              label="Saya"
              accessibilityLabel="Buka halaman profil"
              onPress={() => handleTabPress('profile')}
              icon={(color) => (
                <UserRound size={19} strokeWidth={1.8} color={color} />
              )}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tambah catatan"
              onPress={handleCenterPlusPress}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Plus size={20} strokeWidth={1.9} color={colors.onPrimary} />
            </Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaView>

      <QuickActionMenu
        visible={showQuickActionMenu}
        onClose={() => setShowQuickActionMenu(false)}
        onSelectAction={handleSelectQuickAction}
      />

      <QuickAddMealModal
        visible={showQuickFoodLogger}
        defaultIsSnack={quickLoggerIsSnack}
        onClose={() => setShowQuickFoodLogger(false)}
        onSaveMeal={(meal) =>
          addMealLog(
            meal.name,
            meal.isSnack,
            meal.nutrition,
            meal.trigger,
            undefined,
            meal.source,
            meal.itemsBreakdown
          )
        }
        recentMeals={mealLogs}
        onParseAI={async (text) => {
          const response = await parseFoodNutrition(text);
          return {
            name: response.name,
            nutrition: response.nutrition,
            itemsBreakdown: response.itemsBreakdown,
            aiNotes: response.aiNotes,
            confidence: response.confidence,
            isOnlineAI: response.isOnlineAI,
          };
        }}
      />

      <QuickAddActivityModal
        visible={showAddActivity}
        weightKg={profile.weightKg}
        sensorConnected={stepTrackingStatus === 'connected'}
        onClose={() => setShowAddActivity(false)}
        onParse={parseActivity}
        onSave={addActivityLog}
      />

      <AddWeightModal
        visible={showAddWeight}
        onClose={() => setShowAddWeight(false)}
        onSave={async (weightKg, note) => {
          triggerHaptic('medium');
          await addWeightLog(weightKg, note);
          setShowAddWeight(false);
        }}
        lastWeight={latestWeight}
      />

      <AICoachChatModal
        visible={showAICoachChat}
        onClose={() => setShowAICoachChat(false)}
        userName={profile.name || 'Teman Diet'}
        userApiKey={userApiKey}
        connectionStatus={connectionStatus}
        starterPrompt={coachStarterPrompt}
        userContext={{
          fastingHours: Math.floor(fastingState.elapsedSeconds / 3600),
          caloriesIn: totalCaloriesIn || 0,
          netDeficit: calorieBudgetRemaining,
          targetCalories,
          maintenanceCalories,
          caloriesOutSoFar: energy.totalCaloriesOut,
          remainingCalories: calorieBudgetRemaining,
          proteinGrams: todayProteinGrams,
          targetProteinGrams: targetProtein,
          snackCount: snackCount || 0,
          steps: steps || 0,
          waterGlasses: waterGlasses || 0,
          recentMeals: recentMealContext,
          lastHungerCheck: hungerContext,
        }}
      />

      {showHungerCheck && (
        <HungerCheckScreen
          caloriesIn={totalCaloriesIn || 0}
          targetCalories={targetCalories}
          maintenanceCalories={maintenanceCalories}
          snackCount={snackCount || 0}
          fastingHours={fastingState.fastingHours || 0}
          onAddWater={addWaterGlass}
          onComplete={handleCheckInComplete}
        />
      )}
    </View>
  );

};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeMain: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  navSafeArea: {
    paddingHorizontal: 12,
  },
  navBar: {
    height: 64,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  tabButton: {
    flex: 1,
    height: 48,
    minWidth: 48,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  loadingOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOrbCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppProvider>
        <MainNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
