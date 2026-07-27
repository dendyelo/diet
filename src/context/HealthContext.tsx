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
import {
  calculateActivitySummary,
  calculateEnergyBalance,
} from '../utils/calorieCalc';
import { getLocalDateString, msUntilMidnight } from '../utils/date';
import { ActivityLog } from '../types';
import { calculateNarratedActivityCalories } from '../utils/activityCalc';
import { calculateMealGapSeconds } from '../utils/fasting';

interface FastingState {
  elapsedSeconds: number;
  fastingHours: number;
  hasMealRecorded: boolean;
  isFastingActive: boolean;
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
  hoursSinceLastMeal: number;
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
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());
  const [showWelcomeBackModal, setShowWelcomeBackModal] = useState<boolean>(false);
  const [hydratedHealthDate, setHydratedHealthDate] = useState<string | null>(null);

  const waterGlassesRef = useRef<number>(waterGlasses);
  const manualStepsRef = useRef<number>(manualSteps);
  const sensorStepsRef = useRef<number>(sensorSteps);
  const activityLogsRef = useRef<ActivityLog[]>(activityLogs);
  const activityMutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    waterGlassesRef.current = waterGlasses;
  }, [waterGlasses]);
  useEffect(() => {
    manualStepsRef.current = manualSteps;
  }, [manualSteps]);
  useEffect(() => {
    sensorStepsRef.current = sensorSteps;
  }, [sensorSteps]);
  useEffect(() => {
    activityLogsRef.current = activityLogs;
  }, [activityLogs]);

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
      activityLogsRef.current = loadedActivities;
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

  // One shared clock keeps fasting, time-since-meal, and accrued energy current.
  useEffect(() => {
    const interval = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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
    const run = activityMutationQueueRef.current.then(async () => {
      const nextLogs = [nextLog, ...activityLogsRef.current];
      activityLogsRef.current = nextLogs;
      setActivityLogs(nextLogs);
      await saveActivityLogs(todayStr, nextLogs);
    });
    activityMutationQueueRef.current = run.catch(() => undefined);
    await run;
  };

  const deleteActivityLog = async (id: string) => {
    const run = activityMutationQueueRef.current.then(async () => {
      const nextLogs = activityLogsRef.current.filter((item) => item.id !== id);
      activityLogsRef.current = nextLogs;
      setActivityLogs(nextLogs);
      await saveActivityLogs(todayStr, nextLogs);
    });
    activityMutationQueueRef.current = run.catch(() => undefined);
    await run;
  };

  const resetFastingTimer = async (timestamp?: string | null) => {
    const newTime = timestamp === null ? null : timestamp || new Date().toISOString();
    await updateProfile({ fastingStartedAt: newTime });
  };

  const freshStartToday = async () => {
    setShowWelcomeBackModal(false);
  };

  const dismissWelcomeBackModal = () => {
    setShowWelcomeBackModal(false);
  };

  const steps = sensorSteps + manualSteps;
  const hasMealRecorded = profile.lastMealTimestamp !== null && profile.lastMealTimestamp !== undefined;
  const lastMealTimestampMs = hasMealRecorded
    ? new Date(profile.lastMealTimestamp!).getTime()
    : Number.NaN;
  const hasValidLastMeal =
    hasMealRecorded && Number.isFinite(lastMealTimestampMs);
  const elapsedSeconds = calculateMealGapSeconds(
    profile.lastMealTimestamp,
    currentTimeMs
  );
  const fastingHours = Math.floor(elapsedSeconds / 3600);
  const hoursSinceLastMeal = hasMealRecorded
    ? Math.max(
        0,
        (currentTimeMs - new Date(profile.lastMealTimestamp!).getTime()) / 3600000
      )
    : 0;
  const fastingState: FastingState = {
    elapsedSeconds,
    fastingHours,
    hasMealRecorded,
    isFastingActive: hasValidLastMeal,
  };

  const currentStepActivity = calculateActivitySummary(profile, steps);
  const loggedActivityCalories = calculateNarratedActivityCalories(
    activityLogs,
    currentStepActivity.activityBonusCalories
  );
  const energy = calculateEnergyBalance(
    profile,
    totalCaloriesIn,
    steps,
    new Date(currentTimeMs),
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
        hoursSinceLastMeal,
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
