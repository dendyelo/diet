import React, { ReactNode } from 'react';
import { ProfileProvider, useProfile } from './ProfileContext';
import { MealProvider, useMeals } from './MealContext';
import { HealthProvider, useHealth } from './HealthContext';
import { AIProvider, useAI } from './AIContext';

export { useProfile, useMeals, useHealth, useAI };

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ProfileProvider>
      <MealProvider>
        <HealthProvider>
          <AIProvider>{children}</AIProvider>
        </HealthProvider>
      </MealProvider>
    </ProfileProvider>
  );
};

/**
 * Backward-compatible facade hook aggregating all 4 modular contexts
 */
export const useApp = () => {
  const profileCtx = useProfile();
  const mealCtx = useMeals();
  const healthCtx = useHealth();
  const aiCtx = useAI();

  return {
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

    // HealthContext
    waterGlasses: healthCtx.waterGlasses,
    steps: healthCtx.steps,
    sensorSteps: healthCtx.sensorSteps,
    manualSteps: healthCtx.manualSteps,
    elapsedSeconds: healthCtx.elapsedSeconds,
    fastingState: healthCtx.fastingState,
    energy: healthCtx.energy,
    showWelcomeBackModal: healthCtx.showWelcomeBackModal,
    addWaterGlass: healthCtx.addWaterGlass,
    addStepsManual: healthCtx.addStepsManual,
    resetFastingTimer: healthCtx.resetFastingTimer,
    freshStartToday: healthCtx.freshStartToday,
    dismissWelcomeBackModal: healthCtx.dismissWelcomeBackModal,

    // AIContext
    aiStatus: aiCtx.aiStatus,
    parseFoodNutrition: aiCtx.parseFoodNutrition,
    generateAICoachMessage: aiCtx.generateAICoachMessage,

    // Combined Loading
    isLoading: profileCtx.isLoading || mealCtx.isLoading,
  };
};
