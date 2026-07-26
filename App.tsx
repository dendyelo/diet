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
import { triggerHaptic } from './src/utils/haptics';
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

  const targetCalories = calculateTargetCalories(profile);
  const calculatedNetDeficit = targetCalories - (totalCaloriesIn || 0);

  const handleTabPress = (tab: TabName) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  const handleCenterPlusPress = () => {
    triggerHaptic('medium');
    setShowQuickActionMenu(true);
  };

  const handleSelectQuickAction = (action: 'food' | 'water' | 'weight' | 'fasting') => {
    triggerHaptic('light');
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

  const latestWeight = weightLogs.length > 0 ? weightLogs[0].weightKg : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Screen Container */}
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && (
          <LivingTimelineHome
            onOpenAddMeal={() => setShowQuickFoodLogger(true)}
            onOpenAddWeight={() => setShowAddWeight(true)}
            onOpenAICoachChat={() => setShowAICoachChat(true)}
          />
        )}
        {activeTab === 'progress' && <ProgressHubScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </View>

      {/* Bottom Floating Navigation Bar */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider, paddingVertical: 8, paddingBottom: 20, alignItems: 'center' }}>
        <TouchableOpacity style={{ flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center' }} onPress={() => handleTabPress('home')} accessibilityRole="tab" accessibilityLabel="Home Timeline">
          <Home size={22} color={activeTab === 'home' ? colors.primary : colors.textTertiary} />
          <Text style={{ fontSize: 10, fontWeight: '700', marginTop: 2, color: activeTab === 'home' ? colors.primary : colors.textTertiary }}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center' }} onPress={() => handleTabPress('progress')} accessibilityRole="tab" accessibilityLabel="Progress Hub">
          <TrendingUp size={22} color={activeTab === 'progress' ? colors.primary : colors.textTertiary} />
          <Text style={{ fontSize: 10, fontWeight: '700', marginTop: 2, color: activeTab === 'progress' ? colors.primary : colors.textTertiary }}>
            Progress
          </Text>
        </TouchableOpacity>

        {/* Center Floating Plus Action Button */}
        <TouchableOpacity style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: -20, borderWidth: 3, borderColor: colors.surface, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 }} onPress={handleCenterPlusPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Tambah Catatan">
          <Plus size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={{ flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center' }} onPress={() => handleTabPress('profile')} accessibilityRole="tab" accessibilityLabel="Profil Pengguna">
          <User size={22} color={activeTab === 'profile' ? colors.primary : colors.textTertiary} />
          <Text style={{ fontSize: 10, fontWeight: '700', marginTop: 2, color: activeTab === 'profile' ? colors.primary : colors.textTertiary }}>
            Profil
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overlays and Modals */}
      <QuickActionMenu
        visible={showQuickActionMenu}
        onClose={() => setShowQuickActionMenu(false)}
        onSelectAction={handleSelectQuickAction}
      />

      <QuickAddMealModal
        visible={showQuickFoodLogger}
        onClose={() => setShowQuickFoodLogger(false)}
        onSaveMeal={async (meal) => {
          await addMealLog(meal.name, meal.isSnack, meal.nutrition, meal.trigger, undefined, meal.source, meal.itemsBreakdown);
        }}
        recentMeals={mealLogs}
        onParseAI={async (text) => {
          const res = await parseFoodNutrition(text);
          return { name: res.name, nutrition: res.nutrition };
        }}
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
        userName={profile?.name || 'Teman Diet'}
        userApiKey={userApiKey}
        userContext={{
          fastingHours: Math.floor((fastingState?.elapsedSeconds || 0) / 3600),
          caloriesIn: totalCaloriesIn || 0,
          netDeficit: calculatedNetDeficit,
          steps: steps || 0,
          waterGlasses: waterGlasses || 0,
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
