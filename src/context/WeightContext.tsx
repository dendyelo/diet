import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { WeightLog } from '../types';
import { loadWeightLogs, saveWeightLogs } from '../services/storageService';
import { useProfile } from './ProfileContext';
import { createLocalId } from '../utils/id';
import { getLatestWeight } from '../utils/weightAnalytics';

/**
 * Restricted update type — prevents ID mutation and enforces explicit fields
 */
export interface WeightLogUpdate {
  weightKg?: number;
  recordedAt?: string;
  note?: string;
}

interface WeightContextType {
  weightLogs: WeightLog[];
  isLoading: boolean;
  addWeightLog: (weightKg: number, note?: string, recordedAt?: string) => Promise<void>;
  updateWeightLog: (id: string, updatedFields: WeightLogUpdate) => Promise<void>;
  /** Returns false and does nothing if this is the only remaining log */
  deleteWeightLog: (id: string) => Promise<boolean>;
}

const WeightContext = createContext<WeightContextType | undefined>(undefined);

/**
 * Sanitize weight value: round to 1 decimal, clamp 20-300
 */
function sanitizeWeight(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Math.max(20, Math.min(300, rounded));
}

/**
 * Validate an ISO timestamp string
 */
function isValidTimestamp(ts: string): boolean {
  return !Number.isNaN(new Date(ts).getTime());
}

export const WeightProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { updateProfile } = useProfile();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const weightLogsRef = useRef<WeightLog[]>([]);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    async function initWeightLogs() {
      setIsLoading(true);
      const loaded = await loadWeightLogs();
      weightLogsRef.current = loaded;
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
      weightKg: sanitizeWeight(weightKg),
      recordedAt: (recordedAt && isValidTimestamp(recordedAt)) ? recordedAt : new Date().toISOString(),
      note: note?.trim() || undefined,
    };

    const run = mutationQueueRef.current.then(async () => {
      const nextLogs = [newLog, ...weightLogsRef.current];
      weightLogsRef.current = nextLogs;
      setWeightLogs(nextLogs);

      await saveWeightLogs(nextLogs);
      await syncProfileWeight(nextLogs);
    });
    mutationQueueRef.current = run.catch(() => undefined);
    await run;
  };

  const updateWeightLog = async (id: string, updatedFields: WeightLogUpdate) => {
    const run = mutationQueueRef.current.then(async () => {
      const nextLogs = weightLogsRef.current.map((log) => {
        if (log.id !== id) return log;

        const updated = { ...log };

        // Sanitize each field individually
        if (updatedFields.weightKg !== undefined) {
          updated.weightKg = sanitizeWeight(updatedFields.weightKg);
        }
        if (updatedFields.recordedAt !== undefined) {
          if (isValidTimestamp(updatedFields.recordedAt)) {
            updated.recordedAt = updatedFields.recordedAt;
          }
          // silently ignore invalid timestamp
        }
        if (updatedFields.note !== undefined) {
          updated.note = updatedFields.note.trim() || undefined;
        }

        return updated;
      });
      weightLogsRef.current = nextLogs;
      setWeightLogs(nextLogs);

      await saveWeightLogs(nextLogs);
      await syncProfileWeight(nextLogs);
    });
    mutationQueueRef.current = run.catch(() => undefined);
    await run;
  };

  /**
   * Delete a weight log. Returns false if deletion is blocked
   * (cannot delete the only remaining log).
   */
  const deleteWeightLog = async (id: string): Promise<boolean> => {
    let deleted = false;
    const run = mutationQueueRef.current.then(async () => {
      if (weightLogsRef.current.length <= 1) return;

      const nextLogs = weightLogsRef.current.filter((log) => log.id !== id);
      if (nextLogs.length === weightLogsRef.current.length) return;

      deleted = true;
      weightLogsRef.current = nextLogs;
      setWeightLogs(nextLogs);

      await saveWeightLogs(nextLogs);
      await syncProfileWeight(nextLogs);
    });
    mutationQueueRef.current = run.catch(() => undefined);
    await run;
    return deleted;
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
