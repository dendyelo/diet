import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useProfile } from './ProfileContext';
import { useMeals } from './MealContext';
import {
  loadWaterGlasses,
  saveWaterGlasses,
  loadStepRecord,
  saveStepRecord,
  loadActivityLogs,
  saveActivityLogs,
} from '../services/storageService';
import { getTodayStepCount, subscribeStepCount } from '../services/healthSync';
import { calculateEnergyBalance } from '../utils/calorieCalc';
import { getLocalDateString, msUntilMidnight } from '../utils/date';
import { ActivityLog } from '../types';

interface FastingState {
  elapsedSeconds: number;
  fastingHours: number;
  isFastingTargetReached: boolean;
  hasMealRecorded: boolean;
}

interface EnergyState {
  dailyBMR: number;
  baseMaintenance: number;
  adjustedMaintenance: number;
  elapsedBaseMaintenance: number;
  elapsedMaintenanceProgressPct: number;
  elapsedBMR: number;
  activityCalories: number;
  stepCalories: number;
  activityBonusCalories: number;
  loggedActivityCalories: number;
  baselineSteps: number;
  bonusSteps: number;
  stepGoal: number;
  stepProgressPct: number;
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
  stepTrackingStatus: 'checking' | 'connected' | 'unavailable';
  stepTrackingMessage: string;
  elapsedSeconds: number;
  fastingState: FastingState;
  energy: EnergyState;
  activityLogs: ActivityLog[];
  showWelcomeBackModal: boolean;
  addWaterGlass: () => Promise<void>;
  addStepsManual: (addedSteps: number) => Promise<void>;
  addActivityLog: (
    activity: Omit<ActivityLog, 'id' | 'timestamp'>
  ) => Promise<void>;
  deleteActivityLog: (id: string) => Promise<void>;
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
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stepTrackingStatus, setStepTrackingStatus] = useState<
    'checking' | 'connected' | 'unavailable'
  >('checking');
  const [stepTrackingMessage, setStepTrackingMessage] = useState(
    'Menghubungkan sensor langkah…'
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showWelcomeBackModal, setShowWelcomeBackModal] = useState<boolean>(false);
  const [hydratedHealthDate, setHydratedHealthDate] = useState<string | null>(null);

  const waterGlassesRef = useRef<number>(waterGlasses);
  const manualStepsRef = useRef<number>(manualSteps);
  const sensorStepsRef = useRef<number>(sensorSteps);
  useEffect(() => {
    waterGlassesRef.current = waterGlasses;
  }, [waterGlasses]);
  useEffect(() => {
    manualStepsRef.current = manualSteps;
  }, [manualSteps]);
  useEffect(() => {
    sensorStepsRef.current = sensorSteps;
  }, [sensorSteps]);

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

  // Hydrate persisted daily data before the pedometer is allowed to sync.
  useEffect(() => {
    let cancelled = false;
    setHydratedHealthDate(null);

    async function initHealthData() {
      const [loadedWater, stepRecord, loadedActivities] = await Promise.all([
        loadWaterGlasses(todayStr),
        loadStepRecord(todayStr),
        loadActivityLogs(todayStr),
      ]);

      if (cancelled) return;

      waterGlassesRef.current = loadedWater;
      setWaterGlasses(loadedWater);
      sensorStepsRef.current = stepRecord.sensorSteps;
      manualStepsRef.current = stepRecord.manualSteps;
      setSensorSteps(stepRecord.sensorSteps);
      setManualSteps(stepRecord.manualSteps);
      setActivityLogs(loadedActivities);
      setHydratedHealthDate(todayStr);
    }

    initHealthData();

    return () => {
      cancelled = true;
    };
  }, [todayStr]);

  useEffect(() => {
    if (profile.lastMealTimestamp) {
      const lastMealTime = new Date(profile.lastMealTimestamp).getTime();
      const nowTime = new Date().getTime();
      const hoursDiff = (nowTime - lastMealTime) / (1000 * 60 * 60);

      if (hoursDiff > 36) {
        setShowWelcomeBackModal(true);
      }
    }
  }, [profile.lastMealTimestamp]);

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

  // Start sensor sync only after the matching day's stored base has hydrated.
  useEffect(() => {
    if (hydratedHealthDate !== todayStr) return;

    let sub: { remove: () => void } | null = null;
    let baseSteps = 0;
    let cancelled = false;

    async function syncPedometer() {
      setStepTrackingStatus('checking');
      setStepTrackingMessage('Menghubungkan sensor langkah…');
      const status = await getTodayStepCount();
      if (cancelled) return;
      if (!status.isAvailable) {
        setStepTrackingStatus('unavailable');
        setStepTrackingMessage(
          status.error || 'Sensor langkah belum tersedia di perangkat ini.'
        );
        return;
      }

      setStepTrackingStatus('connected');
      setStepTrackingMessage(
        status.historicalCountAvailable
          ? 'Langkah hari ini tersinkron dari perangkat.'
          : 'Langkah diperbarui selama aplikasi aktif.'
      );

      baseSteps = status.historicalCountAvailable
        ? status.stepCount
        : sensorStepsRef.current;
      sensorStepsRef.current = baseSteps;
      setSensorSteps(baseSteps);
      await saveStepRecord(todayStr, {
        sensorSteps: baseSteps,
        manualSteps: manualStepsRef.current,
      });

      if (cancelled) return;

      sub = subscribeStepCount((sessionSteps) => {
        if (cancelled) return;

        const totalSensor = baseSteps + sessionSteps;
        sensorStepsRef.current = totalSensor;
        setSensorSteps(totalSensor);
        void saveStepRecord(todayStr, {
          sensorSteps: totalSensor,
          manualSteps: manualStepsRef.current,
        });
      });
    }

    syncPedometer();

    return () => {
      cancelled = true;
      if (sub && sub.remove) sub.remove();
    };
  }, [todayStr, hydratedHealthDate]);

  const addWaterGlass = async () => {
    const nextWater = waterGlassesRef.current + 1;
    waterGlassesRef.current = nextWater;
    setWaterGlasses(nextWater);
    await saveWaterGlasses(todayStr, nextWater);
  };

  const addStepsManual = async (addedSteps: number) => {
    const validAdded = Math.max(0, addedSteps);
    const nextManual = manualStepsRef.current + validAdded;
    manualStepsRef.current = nextManual;
    setManualSteps(nextManual);
    await saveStepRecord(todayStr, {
      sensorSteps: sensorStepsRef.current,
      manualSteps: nextManual,
    });
  };

  const addActivityLog = async (
    activity: Omit<ActivityLog, 'id' | 'timestamp'>
  ) => {
    const nextLog: ActivityLog = {
      ...activity,
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    const nextLogs = [nextLog, ...activityLogs];
    setActivityLogs(nextLogs);
    await saveActivityLogs(todayStr, nextLogs);
  };

  const deleteActivityLog = async (id: string) => {
    const nextLogs = activityLogs.filter((item) => item.id !== id);
    setActivityLogs(nextLogs);
    await saveActivityLogs(todayStr, nextLogs);
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

  const loggedActivityCalories = activityLogs.reduce(
    (total, item) => total + item.creditedCalories,
    0
  );
  const energy = calculateEnergyBalance(
    profile,
    totalCaloriesIn,
    steps,
    new Date(),
    loggedActivityCalories
  );

  return (
    <HealthContext.Provider
      value={{
        waterGlasses,
        sensorSteps,
        manualSteps,
        steps,
        stepTrackingStatus,
        stepTrackingMessage,
        elapsedSeconds,
        fastingState,
        energy,
        activityLogs,
        showWelcomeBackModal,
        addWaterGlass,
        addStepsManual,
        addActivityLog,
        deleteActivityLog,
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
