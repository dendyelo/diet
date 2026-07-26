import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  parseFoodNutritionWithAI,
  generateAICoachMessageWithAI,
  getAIStatus,
  testGeminiAPIConnection,
  AIFoodResult,
  AICoachResponse,
  AIStatus,
} from '../services/aiService';
import {
  getGeminiApiKey,
  saveGeminiApiKey,
  deleteGeminiApiKey,
  migrateApiKeyFromAsyncStorage,
} from '../services/secretStorageService';
import { AIConnectionStatus } from '../types';

interface AIContextType {
  aiStatus: AIStatus;
  userApiKey: string;
  connectionStatus: AIConnectionStatus;
  updateApiKey: (key: string) => Promise<void>;
  deleteApiKey: () => Promise<void>;
  testConnection: () => Promise<AIConnectionStatus>;
  parseFoodNutrition: (foodInput: string) => Promise<AIFoodResult>;
  generateAICoachMessage: (userData: {
    name: string;
    fastingHours: number;
    caloriesIn: number;
    netDeficit: number;
    steps: number;
    waterGlasses: number;
    currentHour: number;
  }) => Promise<AICoachResponse | null>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<AIConnectionStatus>('not_configured');

  useEffect(() => {
    async function initApiKey() {
      const migratedKey = await migrateApiKeyFromAsyncStorage();
      const targetKey = migratedKey || (await getGeminiApiKey());

      if (targetKey && targetKey.trim().length > 0) {
        setUserApiKey(targetKey);
        setConnectionStatus('checking');
        const realStatus = await testGeminiAPIConnection(targetKey);
        setConnectionStatus(realStatus);
      } else {
        setUserApiKey('');
        setConnectionStatus('not_configured');
      }
    }
    initApiKey();
  }, []);

  const updateApiKey = async (newKey: string) => {
    const cleanKey = newKey.trim();
    setUserApiKey(cleanKey);
    await saveGeminiApiKey(cleanKey);

    if (cleanKey) {
      setConnectionStatus('checking');
      const result = await testGeminiAPIConnection(cleanKey);
      setConnectionStatus(result);
    } else {
      setConnectionStatus('not_configured');
    }
  };

  const deleteApiKey = async () => {
    setUserApiKey('');
    setConnectionStatus('not_configured');
    await deleteGeminiApiKey();
  };

  const testConnection = async (): Promise<AIConnectionStatus> => {
    if (!userApiKey) {
      setConnectionStatus('not_configured');
      return 'not_configured';
    }
    setConnectionStatus('checking');
    const status = await testGeminiAPIConnection(userApiKey);
    setConnectionStatus(status);
    return status;
  };

  const aiStatus = getAIStatus(userApiKey, connectionStatus);

  const parseFoodNutrition = async (foodInput: string): Promise<AIFoodResult> => {
    return parseFoodNutritionWithAI(foodInput, userApiKey);
  };

  const generateAICoachMessage = async (userData: {
    name: string;
    fastingHours: number;
    caloriesIn: number;
    netDeficit: number;
    steps: number;
    waterGlasses: number;
    currentHour: number;
  }): Promise<AICoachResponse | null> => {
    return generateAICoachMessageWithAI(userData, userApiKey);
  };

  return (
    <AIContext.Provider
      value={{
        aiStatus,
        userApiKey,
        connectionStatus,
        updateApiKey,
        deleteApiKey,
        testConnection,
        parseFoodNutrition,
        generateAICoachMessage,
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
