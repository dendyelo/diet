import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AIChatHistoryItem,
  AIChatResponse,
  parseFoodNutritionWithAI,
  parseActivityWithAI,
  generateAICoachMessageWithAI,
  generateDailyInsight,
  generateWeeklyInsight,
  getAIStatus,
  sendStructuredAICoachChatQuery,
  testGeminiAPIConnection,
  AIFoodResult,
  AIActivityResult,
  AICoachResponse,
  AIStatus,
  DailyAIInsight,
  DailyInsightInput,
  UserContextData,
  WeeklyAIInsight,
  WeeklyInsightInput,
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
  parseActivity: (activityInput: string) => Promise<AIActivityResult>;
  generateDailyInsight: (
    userData: DailyInsightInput
  ) => Promise<DailyAIInsight | null>;
  generateWeeklyInsight: (
    userData: WeeklyInsightInput
  ) => Promise<WeeklyAIInsight | null>;
  sendCoachQuery: (
    query: string,
    userName: string,
    userContext: UserContextData,
    history?: AIChatHistoryItem[]
  ) => Promise<AIChatResponse | null>;
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
  const activeApiKeyRef = useRef('');
  const connectionGenerationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const generation = ++connectionGenerationRef.current;

    async function initApiKey() {
      const migratedKey = await migrateApiKeyFromAsyncStorage();
      const targetKey = migratedKey || (await getGeminiApiKey());
      if (cancelled || generation !== connectionGenerationRef.current) return;

      if (targetKey && targetKey.trim().length > 0) {
        activeApiKeyRef.current = targetKey;
        setUserApiKey(targetKey);
        setConnectionStatus('checking');
        const realStatus = await testGeminiAPIConnection(targetKey);
        if (!cancelled && generation === connectionGenerationRef.current) {
          setConnectionStatus(realStatus);
        }
      } else {
        activeApiKeyRef.current = '';
        setUserApiKey('');
        setConnectionStatus('not_configured');
      }
    }

    void initApiKey();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateApiKey = useCallback(async (newKey: string) => {
    const cleanKey = newKey.trim();
    const generation = ++connectionGenerationRef.current;
    activeApiKeyRef.current = cleanKey;
    setUserApiKey(cleanKey);
    setConnectionStatus(cleanKey ? 'checking' : 'not_configured');
    await saveGeminiApiKey(cleanKey);
    if (generation !== connectionGenerationRef.current) return;

    if (cleanKey) {
      const result = await testGeminiAPIConnection(cleanKey);
      if (generation === connectionGenerationRef.current) {
        setConnectionStatus(result);
      }
    }
  }, []);

  const removeApiKey = useCallback(async () => {
    ++connectionGenerationRef.current;
    activeApiKeyRef.current = '';
    setUserApiKey('');
    setConnectionStatus('not_configured');
    await deleteGeminiApiKey();
  }, []);

  const testConnection = useCallback(async (): Promise<AIConnectionStatus> => {
    if (!userApiKey) {
      ++connectionGenerationRef.current;
      setConnectionStatus('not_configured');
      return 'not_configured';
    }
    const generation = ++connectionGenerationRef.current;
    setConnectionStatus('checking');
    const status = await testGeminiAPIConnection(userApiKey);
    if (generation !== connectionGenerationRef.current) {
      return activeApiKeyRef.current ? 'checking' : 'not_configured';
    }
    setConnectionStatus(status);
    return status;
  }, [userApiKey]);

  const aiStatus = useMemo(
    () => getAIStatus(userApiKey, connectionStatus),
    [connectionStatus, userApiKey]
  );

  const parseFoodNutrition = useCallback(
    async (foodInput: string): Promise<AIFoodResult> => {
      return parseFoodNutritionWithAI(foodInput, userApiKey);
    },
    [userApiKey]
  );

  const parseActivity = useCallback(
    async (activityInput: string): Promise<AIActivityResult> => {
      return parseActivityWithAI(activityInput, userApiKey);
    },
    [userApiKey]
  );

  const createDailyInsight = useCallback(
    async (userData: DailyInsightInput): Promise<DailyAIInsight | null> => {
      return generateDailyInsight(userData, userApiKey);
    },
    [userApiKey]
  );

  const createWeeklyInsight = useCallback(
    async (userData: WeeklyInsightInput): Promise<WeeklyAIInsight | null> => {
      return generateWeeklyInsight(userData, userApiKey);
    },
    [userApiKey]
  );

  const sendCoachQuery = useCallback(
    async (
      query: string,
      userName: string,
      userContext: UserContextData,
      history: AIChatHistoryItem[] = []
    ): Promise<AIChatResponse | null> => {
      return sendStructuredAICoachChatQuery(
        query,
        userName,
        userContext,
        userApiKey,
        history
      );
    },
    [userApiKey]
  );

  const generateAICoachMessage = useCallback(
    async (userData: {
      name: string;
      fastingHours: number;
      caloriesIn: number;
      netDeficit: number;
      steps: number;
      waterGlasses: number;
      currentHour: number;
    }): Promise<AICoachResponse | null> => {
      return generateAICoachMessageWithAI(userData, userApiKey);
    },
    [userApiKey]
  );

  const contextValue = useMemo<AIContextType>(
    () => ({
      aiStatus,
      userApiKey,
      connectionStatus,
      updateApiKey,
      deleteApiKey: removeApiKey,
      testConnection,
      parseFoodNutrition,
      parseActivity,
      generateDailyInsight: createDailyInsight,
      generateWeeklyInsight: createWeeklyInsight,
      sendCoachQuery,
      generateAICoachMessage,
    }),
    [
      aiStatus,
      connectionStatus,
      createDailyInsight,
      createWeeklyInsight,
      generateAICoachMessage,
      parseFoodNutrition,
      parseActivity,
      removeApiKey,
      sendCoachQuery,
      testConnection,
      updateApiKey,
      userApiKey,
    ]
  );

  return (
    <AIContext.Provider value={contextValue}>
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
