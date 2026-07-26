import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Alert } from 'react-native';
import {
  AppProvider,
  useProfile,
  useMeals,
  useWeight,
  useHealth,
  useAI,
  useTheme,
} from './src/context/AppContext';
import { LivingTimelineHome } from './src/screens/LivingTimelineHome';
import { ProgressHubScreen } from './src/screens/ProgressHubScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { QuickAddMealModal } from './src/components/QuickAddMealModal';
import { AddWeightModal } from './src/components/AddWeightModal';
import { AICoachChatModal } from './src/components/AICoachChatModal';
import { QuickActionMenu } from './src/components/QuickActionMenu';
import { Home, TrendingUp, Plus, User } from 'lucide-react-native';
import { calculateTargetCalories } from './src/utils/calorieCalc';

type TabName = 'home' | 'progress' | 'profile';

const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [showQuickActionMenu, setShowQuickActionMenu] = useState<boolean>(false);
  const [showQuickFoodLogger, setShowQuickFoodLogger] = useState<boolean>(false);
  const [showAddWeight, setShowAddWeight] = useState<boolean>(false);
  const [showAICoachChat, setShowAICoachChat] = useState<boolean>(false);

  const { profile } = useProfile();
  const { mealLogs, totalCaloriesIn, addMealLog } = useMeals();
  const { waterGlasses, steps, fastingState, addWaterGlass, resetFastingTimer } = useHealth();
  const { weightLogs, addWeightLog } = useWeight();
  const { userApiKey, parseFoodNutrition } = useAI();
  const { colors, isDark } = useTheme();

  const handleSelectQuickAction = (action: 'food' | 'water' | 'weight' | 'fasting') => {
    switch (action) {
      case 'food':
        setShowQuickFoodLogger(true);
        break;
      case 'water':
        addWaterGlass();
        break;
      case 'weight':
        setShowAddWeight(true);
        break;
      case 'fasting':
        if (fastingState && fastingState.elapsedSeconds > 0) {
          const hours = (fastingState.elapsedSeconds / 3600).toFixed(1);
          Alert.alert(
            'Akhiri Puasa?',
            `Sesi puasa saat ini sudah berjalan ${hours} jam. Apakah Anda yakin ingin mengakhiri puasa?`,
            [
              { text: 'Batal', style: 'cancel' },
              { text: 'Akhiri Puasa', style: 'destructive', onPress: () => resetFastingTimer(null) },
            ]
          );
        } else {
          resetFastingTimer(new Date().toISOString());
        }
        break;
    }
  };

  const latestWeight = weightLogs.length > 0 ? weightLogs[0].weightKg : profile.weightKg;
  const targetCalories = calculateTargetCalories(profile);
  const caloriesIn = totalCaloriesIn || 0;
  const netDeficit = targetCalories - caloriesIn;

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <LivingTimelineHome
            onOpenAddMeal={() => setShowQuickFoodLogger(true)}
            onOpenAddWeight={() => setShowAddWeight(true)}
            onOpenAICoachChat={() => setShowAICoachChat(true)}
          />
        );
      case 'progress':
        return <ProgressHubScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return (
          <LivingTimelineHome
            onOpenAddMeal={() => setShowQuickFoodLogger(true)}
            onOpenAddWeight={() => setShowAddWeight(true)}
            onOpenAICoachChat={() => setShowAICoachChat(true)}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.screenContainer}>{renderScreen()}</View>

      {/* Simplified 4-Tab Bottom Navigation Bar with Dynamic Theme Support */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('home')}>
          <Home size={20} color={activeTab === 'home' ? colors.primary : colors.textTertiary} />
          <Text style={[styles.tabLabel, { color: activeTab === 'home' ? colors.primary : colors.textTertiary }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('progress')}>
          <TrendingUp size={20} color={activeTab === 'progress' ? colors.primary : colors.textTertiary} />
          <Text style={[styles.tabLabel, { color: activeTab === 'progress' ? colors.primary : colors.textTertiary }]}>Progress</Text>
        </TouchableOpacity>

        {/* Center Prominent (+) Action Button */}
        <TouchableOpacity
          style={[styles.plusCenterBtn, { backgroundColor: colors.primary, borderColor: colors.background }]}
          onPress={() => setShowQuickActionMenu(true)}
          activeOpacity={0.85}
        >
          <Plus size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
          <User size={20} color={activeTab === 'profile' ? colors.primary : colors.textTertiary} />
          <Text style={[styles.tabLabel, { color: activeTab === 'profile' ? colors.primary : colors.textTertiary }]}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Action Menu Modal */}
      <QuickActionMenu
        visible={showQuickActionMenu}
        onClose={() => setShowQuickActionMenu(false)}
        onSelectAction={handleSelectQuickAction}
      />

      {/* Quick Add Food Logger Modal (3-second logging) */}
      <QuickAddMealModal
        visible={showQuickFoodLogger}
        onClose={() => setShowQuickFoodLogger(false)}
        recentMeals={mealLogs}
        onSaveMeal={(meal) =>
          addMealLog(meal.name, meal.isSnack, meal.nutrition, meal.trigger, undefined, meal.source, meal.itemsBreakdown)
        }
        onParseAI={async (text) => {
          const res = await parseFoodNutrition(text);
          return { name: res.name, nutrition: res.nutrition };
        }}
      />

      {/* Add Weight Modal */}
      <AddWeightModal
        visible={showAddWeight}
        onClose={() => setShowAddWeight(false)}
        onSave={(wKg, note) => {
          addWeightLog(wKg, note);
          setShowAddWeight(false);
        }}
        lastWeight={latestWeight}
      />

      {/* AI Coach Chat Modal */}
      <AICoachChatModal
        visible={showAICoachChat}
        onClose={() => setShowAICoachChat(false)}
        userName={profile.name || 'Teman'}
        userApiKey={userApiKey}
        userContext={{
          fastingHours: fastingState ? Math.round(fastingState.elapsedSeconds / 3600) : 0,
          caloriesIn,
          netDeficit,
          steps,
          waterGlasses,
        }}
      />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainNavigator />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  plusCenterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 3,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
