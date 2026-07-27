import React, { ReactNode } from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { ProfileProvider, useProfile } from './ProfileContext';
import { MealProvider, useMeals } from './MealContext';
import { WeightProvider, useWeight } from './WeightContext';
import { HealthProvider, useHealth } from './HealthContext';
import { AIProvider, useAI } from './AIContext';

export { ThemeProvider, useTheme, useProfile, useMeals, useWeight, useHealth, useAI };

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <MealProvider>
          <WeightProvider>
            <HealthProvider>
              <AIProvider>{children}</AIProvider>
            </HealthProvider>
          </WeightProvider>
        </MealProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
};

/**
 * Backward-compatible facade hook aggregating all modular contexts
 */
export const useApp = () => {
  const themeCtx = useTheme();
  const profileCtx = useProfile();
  const mealCtx = useMeals();
  const weightCtx = useWeight();
  const healthCtx = useHealth();
  const aiCtx = useAI();

  return {
    // ThemeContext
    themeMode: themeCtx.themeMode,
    setThemeMode: themeCtx.setThemeMode,
    isDark: themeCtx.isDark,
    colors: themeCtx.colors,

    // ProfileContext
    profile: profileCtx.profile,
    updateProfile: profileCtx.updateProfile,
    toggleCheatDay: profileCtx.toggleCheatDay,

    // MealContext
    mealLogs: mealCtx.mealLogs,
    todayLogs: mealCtx.todayLogs,
    totalCaloriesIn: mealCtx.totalCaloriesIn,
    snackCount: mealCtx.snackCount,
    addMealLog: mealCtx.addMealLog,
    updateMealLog: mealCtx.updateMealLog,
    deleteMealLog: mealCtx.deleteMealLog,

    // WeightContext
    weightLogs: weightCtx.weightLogs,
    addWeightLog: weightCtx.addWeightLog,
    updateWeightLog: weightCtx.updateWeightLog,
    deleteWeightLog: weightCtx.deleteWeightLog,

    // HealthContext
    waterGlasses: healthCtx.waterGlasses,
    steps: healthCtx.steps,
    sensorSteps: healthCtx.sensorSteps,
    manualSteps: healthCtx.manualSteps,
    stepTrackingStatus: healthCtx.stepTrackingStatus,
    stepTrackingMessage: healthCtx.stepTrackingMessage,
    elapsedSeconds: healthCtx.elapsedSeconds,
    hoursSinceLastMeal: healthCtx.hoursSinceLastMeal,
    fastingState: healthCtx.fastingState,
    energy: healthCtx.energy,
    activityLogs: healthCtx.activityLogs,
    showWelcomeBackModal: healthCtx.showWelcomeBackModal,
    addWaterGlass: healthCtx.addWaterGlass,
    addStepsManual: healthCtx.addStepsManual,
    addActivityLog: healthCtx.addActivityLog,
    deleteActivityLog: healthCtx.deleteActivityLog,
    resetFastingTimer: healthCtx.resetFastingTimer,
    freshStartToday: healthCtx.freshStartToday,
    dismissWelcomeBackModal: healthCtx.dismissWelcomeBackModal,

    // AIContext
    aiStatus: aiCtx.aiStatus,
    parseFoodNutrition: aiCtx.parseFoodNutrition,
    parseActivity: aiCtx.parseActivity,
    generateDailyInsight: aiCtx.generateDailyInsight,
    generateWeeklyInsight: aiCtx.generateWeeklyInsight,
    sendCoachQuery: aiCtx.sendCoachQuery,
    generateAICoachMessage: aiCtx.generateAICoachMessage,

    // Combined Loading
    isLoading: profileCtx.isLoading || mealCtx.isLoading,
  };
};
