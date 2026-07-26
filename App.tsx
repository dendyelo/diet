import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Modal } from 'react-native';
import {
  AppProvider,
  useProfile,
  useMeals,
  useWeight,
  useHealth,
  useAI,
} from './src/context/AppContext';
import { LivingTimelineHome } from './src/screens/LivingTimelineHome';
import { ProgressHubScreen } from './src/screens/ProgressHubScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LoggerScreen } from './src/screens/LoggerScreen';
import { QuickAddMealModal } from './src/components/QuickAddMealModal';
import { AddWeightModal } from './src/components/AddWeightModal';
import { AICoachChatModal } from './src/components/AICoachChatModal';
import { RadialMenuModal } from './src/components/RadialMenuModal';
import { Home, TrendingUp, Plus, User } from 'lucide-react-native';
import { calculateTargetCalories } from './src/utils/calorieCalc';

type TabName = 'home' | 'progress' | 'profile';

const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [showRadialMenu, setShowRadialMenu] = useState<boolean>(false);
  const [showQuickFoodLogger, setShowQuickFoodLogger] = useState<boolean>(false);
  const [showAddWeight, setShowAddWeight] = useState<boolean>(false);
  const [showAICoachChat, setShowAICoachChat] = useState<boolean>(false);

  const { profile } = useProfile();
  const { mealLogs, totalCaloriesIn, addMealLog } = useMeals();
  const { waterGlasses, steps, fastingState, addWaterGlass, resetFastingTimer } = useHealth();
  const { weightLogs, addWeightLog } = useWeight();
  const { userApiKey, parseFoodNutrition } = useAI();

  const handleSelectRadialAction = (action: 'food' | 'water' | 'weight' | 'fasting') => {
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
        resetFastingTimer();
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090B" />
      <View style={styles.screenContainer}>{renderScreen()}</View>

      {/* Simplified 4-Tab Bottom Navigation Bar with Prominent (+) Center Button */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('home')}>
          <Home size={20} color={activeTab === 'home' ? '#10B981' : 'rgba(255, 255, 255, 0.4)'} />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('progress')}>
          <TrendingUp size={20} color={activeTab === 'progress' ? '#10B981' : 'rgba(255, 255, 255, 0.4)'} />
          <Text style={[styles.tabLabel, activeTab === 'progress' && styles.tabLabelActive]}>Progress</Text>
        </TouchableOpacity>

        {/* Center Prominent (+) Action Button */}
        <TouchableOpacity style={styles.plusCenterBtn} onPress={() => setShowRadialMenu(true)} activeOpacity={0.85}>
          <Plus size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
          <User size={20} color={activeTab === 'profile' ? '#10B981' : 'rgba(255, 255, 255, 0.4)'} />
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* Radial Menu Modal */}
      <RadialMenuModal
        visible={showRadialMenu}
        onClose={() => setShowRadialMenu(false)}
        onSelectAction={handleSelectRadialAction}
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

      {/* AI Coach Chat Modal (opened only when user explicitly taps 'Tanya Coach') */}
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
    backgroundColor: '#09090B',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#121215',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 3,
    borderColor: '#09090B',
    elevation: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  tabLabelActive: {
    color: '#10B981',
    fontWeight: 'bold',
  },
});
