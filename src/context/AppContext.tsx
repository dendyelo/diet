import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, MealLog, TriggerType, NutritionData, FoodItemBreakdown } from '../types';
import {
  DEFAULT_PROFILE,
  loadUserProfile,
  saveUserProfile,
  loadMealLogs,
  saveMealLogs,
  loadWaterGlasses,
  saveWaterGlasses,
  loadStepCount,
  saveStepCount,
} from '../services/storageService';
import { getTodayStepCount, subscribeStepCount } from '../services/healthSync';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

interface AppContextType {
  profile: UserProfile;
  mealLogs: MealLog[];
  waterGlasses: number;
  steps: number;
  elapsedSeconds: number;
  isLoading: boolean;
  showWelcomeBackModal: boolean;
  dismissWelcomeBackModal: () => void;
  updateProfile: (newProfile: Partial<UserProfile>) => Promise<void>;
  addMealLog: (
    name: string,
    isSnack: boolean,
    nutrition: NutritionData,
    trigger?: TriggerType,
    customTimestamp?: string,
    source?: 'ai' | 'manual',
    itemsBreakdown?: FoodItemBreakdown[]
  ) => Promise<void>;
  updateMealLog: (id: string, updatedFields: Partial<MealLog>) => Promise<void>;
  deleteMealLog: (id: string) => Promise<void>;
  addWaterGlass: () => Promise<void>;
  addStepsManual: (addedSteps: number) => Promise<void>;
  resetFastingTimer: (timestamp?: string) => Promise<void>;
  toggleCheatDay: () => Promise<void>;
  freshStartToday: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [waterGlasses, setWaterGlasses] = useState<number>(0);
  const [steps, setSteps] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showWelcomeBackModal, setShowWelcomeBackModal] = useState<boolean>(false);

  const todayStr = getTodayString();

  // Load initial data from AsyncStorage
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const loadedProfile = await loadUserProfile();
      const loadedLogs = await loadMealLogs();
      const loadedWater = await loadWaterGlasses(todayStr);
      const loadedSteps = await loadStepCount(todayStr);

      setProfile(loadedProfile);
      setMealLogs(loadedLogs);
      setWaterGlasses(loadedWater);
      setSteps(loadedSteps);

      // Check if user has been inactive for > 36 hours (Lupa Berhari-hari recovery trigger)
      const lastMealTime = new Date(loadedProfile.lastMealTimestamp).getTime();
      const nowTime = new Date().getTime();
      const hoursDiff = (nowTime - lastMealTime) / (1000 * 60 * 60);

      if (hoursDiff > 36) {
        setShowWelcomeBackModal(true);
      }

      setIsLoading(false);
    }

    init();
  }, []);

  // Real-time Fasting Clock Timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      if (profile.lastMealTimestamp) {
        const lastTime = new Date(profile.lastMealTimestamp).getTime();
        const now = new Date().getTime();
        const diffInSec = Math.max(0, Math.floor((now - lastTime) / 1000));
        setElapsedSeconds(diffInSec);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [profile.lastMealTimestamp]);

  // Sync Pedometer steps accurately without cumulative exponential sum
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let baseSteps = 0;

    async function syncPedometer() {
      const status = await getTodayStepCount();
      if (status.isAvailable) {
        baseSteps = status.stepCount;
        setSteps(baseSteps);
        saveStepCount(todayStr, baseSteps);

        sub = subscribeStepCount((sessionSteps) => {
          // Expo Pedometer watchStepCount returns cumulative steps since watch started
          const totalSteps = baseSteps + sessionSteps;
          setSteps(totalSteps);
          saveStepCount(todayStr, totalSteps);
        });
      }
    }

    syncPedometer();

    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [todayStr]);

  const updateProfile = async (newProfile: Partial<UserProfile>) => {
    const updated = { ...profile, ...newProfile };
    setProfile(updated);
    await saveUserProfile(updated);
  };

  const addMealLog = async (
    name: string,
    isSnack: boolean,
    nutrition: NutritionData,
    trigger?: TriggerType,
    customTimestamp?: string,
    source: 'ai' | 'manual' = 'ai',
    itemsBreakdown?: FoodItemBreakdown[]
  ) => {
    const timestamp = customTimestamp || new Date().toISOString();
    const newLog: MealLog = {
      id: Date.now().toString(),
      timestamp,
      name,
      isSnack,
      trigger,
      nutrition,
      source,
      itemsBreakdown,
    };

    const updatedLogs = [newLog, ...mealLogs];
    setMealLogs(updatedLogs);
    await saveMealLogs(updatedLogs);

    // Update last meal timestamp for fasting timer
    const updatedProfile = { ...profile, lastMealTimestamp: timestamp };
    setProfile(updatedProfile);
    await saveUserProfile(updatedProfile);
  };

  const updateMealLog = async (id: string, updatedFields: Partial<MealLog>) => {
    const updatedLogs = mealLogs.map((log) => {
      if (log.id === id) {
        return { ...log, ...updatedFields };
      }
      return log;
    });

    setMealLogs(updatedLogs);
    await saveMealLogs(updatedLogs);
  };

  const deleteMealLog = async (id: string) => {
    const updatedLogs = mealLogs.filter((m) => m.id !== id);
    setMealLogs(updatedLogs);
    await saveMealLogs(updatedLogs);
  };

  const addWaterGlass = async () => {
    const updated = waterGlasses + 1;
    setWaterGlasses(updated);
    await saveWaterGlasses(todayStr, updated);
  };

  const addStepsManual = async (addedSteps: number) => {
    const updated = steps + addedSteps;
    setSteps(updated);
    await saveStepCount(todayStr, updated);
  };

  const resetFastingTimer = async (timestamp?: string) => {
    const newTime = timestamp || new Date().toISOString();
    const updated = { ...profile, lastMealTimestamp: newTime };
    setProfile(updated);
    await saveUserProfile(updated);
  };

  const toggleCheatDay = async () => {
    const updated = { ...profile, isCheatDay: !profile.isCheatDay };
    setProfile(updated);
    await saveUserProfile(updated);
  };

  const freshStartToday = async () => {
    setShowWelcomeBackModal(false);
    await resetFastingTimer(new Date().toISOString());
  };

  const dismissWelcomeBackModal = () => {
    setShowWelcomeBackModal(false);
  };

  return (
    <AppContext.Provider
      value={{
        profile,
        mealLogs,
        waterGlasses,
        steps,
        elapsedSeconds,
        isLoading,
        showWelcomeBackModal,
        dismissWelcomeBackModal,
        updateProfile,
        addMealLog,
        updateMealLog,
        deleteMealLog,
        addWaterGlass,
        addStepsManual,
        resetFastingTimer,
        toggleCheatDay,
        freshStartToday,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
