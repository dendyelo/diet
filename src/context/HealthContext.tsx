import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useProfile } from './ProfileContext';
import { useMeals } from './MealContext';
import {
  loadWaterGlasses,
  saveWaterGlasses,
  loadStepRecord,
  saveStepRecord,
} from '../services/storageService';
import { getTodayStepCount, subscribeStepCount } from '../services/healthSync';
import { calculateEnergyBalance } from '../utils/calorieCalc';
import { getLocalDateString, msUntilMidnight } from '../utils/date';

interface FastingState {
  elapsedSeconds: number;
  fastingHours: number;
  isFastingTargetReached: boolean;
  hasMealRecorded: boolean;
}

interface EnergyState {
  dailyBMR: number;
  elapsedBMR: number;
  stepCalories: number;
  totalCaloriesOut: number;
  totalCaloriesIn: number;
  netBalance: number;
  targetDeficit: number;
  isDeficit: boolean;
  percentageToGoal: number;
}

interface HealthContextType {
  waterGlasses: number;
  sensorSteps: number;
  manualSteps: number;
  steps: number;
  elapsedSeconds: number;
  fastingState: FastingState;
  energy: EnergyState;
  showWelcomeBackModal: boolean;
  addWaterGlass: () => Promise<void>;
  addStepsManual: (addedSteps: number) => Promise<void>;
  resetFastingTimer: (timestamp?: string | null) => Promise<void>;
  freshStartToday: () => Promise<void>;
  dismissWelcomeBackModal: () => void;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export const HealthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, updateProfile } = useProfile();
  const { totalCaloriesIn } = useMeals();

  const [todayStr, setTodayStr] = useState<string>(getLocalDateString());
  const [waterGlasses, setWaterGlasses] = useState<number>(0);
  const [sensorSteps, setSensorSteps] = useState<number>(0);
  const [manualSteps, setManualSteps] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showWelcomeBackModal, setShowWelcomeBackModal] = useState<boolean>(false);

  const manualStepsRef = useRef<number>(manualSteps);
  useEffect(() => {
    manualStepsRef.current = manualSteps;
  }, [manualSteps]);

  // Efficient Midnight Date Rollover Timeout
  useEffect(() => {
    let timer: NodeJS.Timeout;
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

  // Initial load for water glasses & step record
  useEffect(() => {
    async function initHealthData() {
      const loadedWater = await loadWaterGlasses(todayStr);
      const stepRecord = await loadStepRecord(todayStr);

      setWaterGlasses(loadedWater);
      setSensorSteps(stepRecord.sensorSteps);
      setManualSteps(stepRecord.manualSteps);

      if (profile.lastMealTimestamp) {
        const lastMealTime = new Date(profile.lastMealTimestamp).getTime();
        const nowTime = new Date().getTime();
        const hoursDiff = (nowTime - lastMealTime) / (1000 * 60 * 60);

        if (hoursDiff > 36) {
          setShowWelcomeBackModal(true);
        }
      }
    }
    initHealthData();
  }, [todayStr, profile.lastMealTimestamp]);

  // Real-time Fasting Clock Timer tick (Every 1 second)
  useEffect(() => {
    const updateClock = () => {
      if (!profile.lastMealTimestamp) {
        setElapsedSeconds(0);
        return;
      }
      const lastTime = new Date(profile.lastMealTimestamp).getTime();
      const now = new Date().getTime();
      const diffInSec = Math.max(0, Math.floor((now - lastTime) / 1000));
      setElapsedSeconds(diffInSec);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, [profile.lastMealTimestamp]);

  // Sync Pedometer sensor steps strictly with [todayStr] dependency
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let baseSteps = 0;

    async function syncPedometer() {
      const status = await getTodayStepCount();
      if (status.isAvailable) {
        baseSteps = status.stepCount;
        setSensorSteps(baseSteps);
        await saveStepRecord(todayStr, { sensorSteps: baseSteps, manualSteps: manualStepsRef.current });

        sub = subscribeStepCount(async (sessionSteps) => {
          const totalSensor = baseSteps + sessionSteps;
          setSensorSteps(totalSensor);
          await saveStepRecord(todayStr, { sensorSteps: totalSensor, manualSteps: manualStepsRef.current });
        });
      }
    }

    syncPedometer();

    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [todayStr]);

  const addWaterGlass = async () => {
    const updated = waterGlasses + 1;
    setWaterGlasses(updated);
    await saveWaterGlasses(todayStr, updated);
  };

  const addStepsManual = async (addedSteps: number) => {
    const validAdded = Math.max(0, addedSteps);
    const updatedManual = manualSteps + validAdded;
    setManualSteps(updatedManual);
    await saveStepRecord(todayStr, { sensorSteps, manualSteps: updatedManual });
  };

  const resetFastingTimer = async (timestamp?: string | null) => {
    const newTime = timestamp === null ? null : timestamp || new Date().toISOString();
    await updateProfile({ lastMealTimestamp: newTime });
  };

  const freshStartToday = async () => {
    setShowWelcomeBackModal(false);
    await resetFastingTimer(new Date().toISOString());
  };

  const dismissWelcomeBackModal = () => {
    setShowWelcomeBackModal(false);
  };

  const steps = sensorSteps + manualSteps;
  const hasMealRecorded = profile.lastMealTimestamp !== null && profile.lastMealTimestamp !== undefined;
  const fastingHours = hasMealRecorded ? Math.floor(elapsedSeconds / 3600) : 0;
  const fastingState: FastingState = {
    elapsedSeconds: hasMealRecorded ? elapsedSeconds : 0,
    fastingHours,
    isFastingTargetReached: hasMealRecorded && fastingHours >= (profile.fastingTargetHours || 16),
    hasMealRecorded,
  };

  const energy = calculateEnergyBalance(profile, totalCaloriesIn, steps);

  return (
    <HealthContext.Provider
      value={{
        waterGlasses,
        sensorSteps,
        manualSteps,
        steps,
        elapsedSeconds,
        fastingState,
        energy,
        showWelcomeBackModal,
        addWaterGlass,
        addStepsManual,
        resetFastingTimer,
        freshStartToday,
        dismissWelcomeBackModal,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
};
