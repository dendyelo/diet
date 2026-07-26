import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MealLog, TriggerType, NutritionData, FoodItemBreakdown } from '../types';
import { loadMealLogs, saveMealLogs } from '../services/storageService';
import { useProfile } from './ProfileContext';
import { getLocalDateString, isSameLocalDay, getLatestMealTimestamp, msUntilMidnight } from '../utils/date';
import { createLocalId } from '../utils/id';

interface MealContextType {
  mealLogs: MealLog[];
  todayLogs: MealLog[];
  totalCaloriesIn: number;
  snackCount: number;
  isLoading: boolean;
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
}

const MealContext = createContext<MealContextType | undefined>(undefined);

export const MealProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { updateProfile } = useProfile();
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [todayStr, setTodayStr] = useState<string>(getLocalDateString());

  // Efficient Midnight Date Rollover Timeout
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleMidnightRollover = () => {
      const delay = msUntilMidnight();
      timer = setTimeout(() => {
        setTodayStr(getLocalDateString());
        scheduleMidnightRollover();
      }, delay);
    };

    scheduleMidnightRollover();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function initMealLogs() {
      setIsLoading(true);
      const loaded = await loadMealLogs();
      setMealLogs(loaded);
      setIsLoading(false);
    }
    initMealLogs();
  }, []);

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
    const collisionProofId = createLocalId('meal');

    const newLog: MealLog = {
      id: collisionProofId,
      timestamp,
      name,
      isSnack,
      trigger,
      nutrition,
      source,
      itemsBreakdown,
    };

    let nextLogs: MealLog[] = [];
    setMealLogs((prevLogs) => {
      nextLogs = [newLog, ...prevLogs];
      return nextLogs;
    });

    const latestTimestamp = getLatestMealTimestamp(nextLogs);
    await saveMealLogs(nextLogs);
    await updateProfile({ lastMealTimestamp: latestTimestamp });
  };

  const updateMealLog = async (id: string, updatedFields: Partial<MealLog>) => {
    let nextLogs: MealLog[] = [];
    setMealLogs((prevLogs) => {
      nextLogs = prevLogs.map((log) => {
        if (log.id === id) {
          return { ...log, ...updatedFields };
        }
        return log;
      });
      return nextLogs;
    });

    const latestTimestamp = getLatestMealTimestamp(nextLogs);
    await saveMealLogs(nextLogs);
    await updateProfile({ lastMealTimestamp: latestTimestamp });
  };

  const deleteMealLog = async (id: string) => {
    let nextLogs: MealLog[] = [];
    setMealLogs((prevLogs) => {
      nextLogs = prevLogs.filter((m) => m.id !== id);
      return nextLogs;
    });

    const latestTimestamp = getLatestMealTimestamp(nextLogs);
    await saveMealLogs(nextLogs);
    await updateProfile({ lastMealTimestamp: latestTimestamp });
  };

  const todayLogs = mealLogs.filter((log) => log.timestamp && isSameLocalDay(log.timestamp, todayStr));
  const totalCaloriesIn = todayLogs.reduce((acc, log) => acc + (log.nutrition?.calories || 0), 0);
  const snackCount = todayLogs.filter((log) => log.isSnack).length;

  return (
    <MealContext.Provider
      value={{
        mealLogs,
        todayLogs,
        totalCaloriesIn,
        snackCount,
        isLoading,
        addMealLog,
        updateMealLog,
        deleteMealLog,
      }}
    >
      {children}
    </MealContext.Provider>
  );
};

export const useMeals = () => {
  const context = useContext(MealContext);
  if (!context) {
    throw new Error('useMeals must be used within a MealProvider');
  }
  return context;
};
