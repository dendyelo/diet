import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WeightLog } from '../types';
import { loadWeightLogs, saveWeightLogs } from '../services/storageService';
import { useProfile } from './ProfileContext';
import { createLocalId } from '../utils/id';
import { getLatestWeight } from '../utils/weightAnalytics';

interface WeightContextType {
  weightLogs: WeightLog[];
  isLoading: boolean;
  addWeightLog: (weightKg: number, note?: string, recordedAt?: string) => Promise<void>;
  updateWeightLog: (id: string, updatedFields: Partial<WeightLog>) => Promise<void>;
  deleteWeightLog: (id: string) => Promise<void>;
}

const WeightContext = createContext<WeightContextType | undefined>(undefined);

export const WeightProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { updateProfile } = useProfile();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initWeightLogs() {
      setIsLoading(true);
      const loaded = await loadWeightLogs();
      setWeightLogs(loaded);
      setIsLoading(false);
    }
    initWeightLogs();
  }, []);

  const syncProfileWeight = async (logs: WeightLog[]) => {
    const latest = getLatestWeight(logs);
    if (latest !== null) {
      await updateProfile({ weightKg: latest });
    }
  };

  const addWeightLog = async (weightKg: number, note?: string, recordedAt?: string) => {
    const newLog: WeightLog = {
      id: createLocalId('weight'),
      weightKg: Math.round(weightKg * 10) / 10,
      recordedAt: recordedAt || new Date().toISOString(),
      note: note?.trim() || undefined,
    };

    let nextLogs: WeightLog[] = [];
    setWeightLogs((prevLogs) => {
      nextLogs = [newLog, ...prevLogs];
      return nextLogs;
    });

    await saveWeightLogs(nextLogs);
    await syncProfileWeight(nextLogs);
  };

  const updateWeightLog = async (id: string, updatedFields: Partial<WeightLog>) => {
    let nextLogs: WeightLog[] = [];
    setWeightLogs((prevLogs) => {
      nextLogs = prevLogs.map((log) => {
        if (log.id === id) {
          return { ...log, ...updatedFields };
        }
        return log;
      });
      return nextLogs;
    });

    await saveWeightLogs(nextLogs);
    await syncProfileWeight(nextLogs);
  };

  const deleteWeightLog = async (id: string) => {
    let nextLogs: WeightLog[] = [];
    setWeightLogs((prevLogs) => {
      nextLogs = prevLogs.filter((log) => log.id !== id);
      return nextLogs;
    });

    await saveWeightLogs(nextLogs);
    if (nextLogs.length > 0) {
      await syncProfileWeight(nextLogs);
    }
  };

  return (
    <WeightContext.Provider
      value={{
        weightLogs,
        isLoading,
        addWeightLog,
        updateWeightLog,
        deleteWeightLog,
      }}
    >
      {children}
    </WeightContext.Provider>
  );
};

export const useWeight = () => {
  const context = useContext(WeightContext);
  if (!context) {
    throw new Error('useWeight must be used within a WeightProvider');
  }
  return context;
};
