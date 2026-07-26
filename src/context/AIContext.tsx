import React, { createContext, useContext, ReactNode } from 'react';
import { useProfile } from './ProfileContext';
import {
  parseFoodNutritionWithAI,
  generateAICoachMessageWithAI,
  getAIStatus,
  AIFoodResult,
  AICoachResponse,
  AIStatus,
} from '../services/aiService';

interface AIContextType {
  aiStatus: AIStatus;
  userApiKey: string;
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
  const { profile } = useProfile();
  const userApiKey = profile.geminiApiKey || '';
  const aiStatus = getAIStatus(userApiKey);

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
