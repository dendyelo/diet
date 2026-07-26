import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MealLog, TriggerType, NutritionData, FoodItemBreakdown } from '../types';
import { loadMealLogs, saveMealLogs } from '../services/storageService';
import { useProfile } from './ProfileContext';

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

  const todayStr = new Date().toISOString().split('T')[0];

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

    setMealLogs((prevLogs) => {
      const updatedLogs = [newLog, ...prevLogs];
      saveMealLogs(updatedLogs);
      return updatedLogs;
    });

    // Update last meal timestamp for fasting timer reset
    await updateProfile({ lastMealTimestamp: timestamp });
  };

  const updateMealLog = async (id: string, updatedFields: Partial<MealLog>) => {
    setMealLogs((prevLogs) => {
      const updatedLogs = prevLogs.map((log) => {
        if (log.id === id) {
          return { ...log, ...updatedFields };
        }
        return log;
      });
      saveMealLogs(updatedLogs);
      return updatedLogs;
    });
  };

  const deleteMealLog = async (id: string) => {
    let latestTimestampAfterDelete: string | null = null;

    setMealLogs((prevLogs) => {
      const updatedLogs = prevLogs.filter((m) => m.id !== id);
      saveMealLogs(updatedLogs);

      if (updatedLogs.length > 0) {
        // Find latest remaining meal timestamp
        const sorted = [...updatedLogs].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        latestTimestampAfterDelete = sorted[0].timestamp;
      } else {
        latestTimestampAfterDelete = null;
      }

      return updatedLogs;
    });

    // Update profile lastMealTimestamp (null if all meals deleted)
    await updateProfile({ lastMealTimestamp: latestTimestampAfterDelete });
  };

  const todayLogs = mealLogs.filter((log) => log.timestamp && log.timestamp.startsWith(todayStr));
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
