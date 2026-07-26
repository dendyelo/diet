import { NutritionData } from '../types';

export interface AIFoodResult {
  name: string;
  nutrition: NutritionData;
  confidence: 'high' | 'medium' | 'low';
  aiNotes?: string;
  isOnlineAI: boolean;
}

export interface AIStatus {
  isOnline: boolean;
  modeLabel: string;
  color: string;
  description: string;
}

/**
 * Check AI engine current status (Online Cloud vs Smart Local Fallback)
 */
export function getAIStatus(userApiKey?: string): AIStatus {
  if (userApiKey && userApiKey.trim().length > 0) {
    return {
      isOnline: true,
      modeLabel: 'Gemini AI Cloud (Online)',
      color: '#10B981',
      description: 'Presisi tinggi menggunakan model Gemini 2.5 Flash Cloud.',
    };
  }
  return {
    isOnline: false,
    modeLabel: 'Smart Local Engine (Offline)',
    color: '#F59E0B',
    description: 'Estimasi gizi cepat berbasis database kuliner lokal di memori HP.',
  };
}

/**
 * Smart Fallback Estimator for local Indonesian foods when offline or no API Key
 */
function heuristicIndonesianFoodEstimator(foodText: string): AIFoodResult {
  const lower = foodText.toLowerCase();

  let calories = 350;
  let proteinGrams = 15;
  let carbsGrams = 40;
  let fatGrams = 12;
  let fiberGrams = 3;

  if (lower.includes('padang') || lower.includes('rendang')) {
    calories = 680;
    proteinGrams = 30;
    carbsGrams = 75;
    fatGrams = 28;
  } else if (lower.includes('soto') || lower.includes('sop')) {
    calories = 380;
    proteinGrams = 22;
    carbsGrams = 35;
    fatGrams = 14;
  } else if (lower.includes('gorengan') || lower.includes('bakwan') || lower.includes('tahu isi')) {
    calories = 280;
    proteinGrams = 5;
    carbsGrams = 25;
    fatGrams = 18;
  } else if (lower.includes('boba') || lower.includes('kopi manis') || lower.includes('boba milk')) {
    calories = 420;
    proteinGrams = 4;
    carbsGrams = 68;
    fatGrams = 15;
  } else if (lower.includes('gado') || lower.includes('pecel') || lower.includes('salad')) {
    calories = 320;
    proteinGrams = 14;
    carbsGrams = 30;
    fatGrams = 16;
    fiberGrams = 8;
  } else if (lower.includes('ayam bakar') || lower.includes('ayam dada')) {
    calories = 410;
    proteinGrams = 38;
    carbsGrams = 35;
    fatGrams = 12;
  } else if (lower.includes('buah') || lower.includes('apel') || lower.includes('pisang')) {
    calories = 110;
    proteinGrams = 1;
    carbsGrams = 28;
    fatGrams = 0;
    fiberGrams = 4;
  }

  return {
    name: foodText.trim(),
    nutrition: { calories, proteinGrams, carbsGrams, fatGrams, fiberGrams },
    confidence: 'medium',
    aiNotes: 'Estimasi gizi berbasis database kuliner lokal di HP.',
    isOnlineAI: false,
  };
}

/**
 * Estimate nutrition from food description using Gemini AI API or local fallback
 */
export async function parseFoodNutritionWithAI(
  foodInput: string,
  userApiKey?: string
): Promise<AIFoodResult> {
  const cleanInput = foodInput.trim();
  if (!cleanInput) {
    throw new Error('Deskripsi makanan tidak boleh kosong.');
  }

  // If no Gemini API key provided, use smart Indonesian culinary heuristic estimator
  if (!userApiKey || userApiKey.trim() === '') {
    return heuristicIndonesianFoodEstimator(cleanInput);
  }

  try {
    const prompt = `Anda adalah ahli gizi spesialis kuliner Indonesia & internasional.
Analisis deskripsi makanan/cemilan ini: "${cleanInput}".
Kembalikan HANYA format JSON tanpa teks lain atau markdown codeblock formatting:
{
  "name": "nama makanan yang rapi",
  "calories": 450,
  "proteinGrams": 25,
  "carbsGrams": 50,
  "fatGrams": 15,
  "fiberGrams": 4,
  "aiNotes": "catatan nutrisi singkat 1 kalimat"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userApiKey.trim()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      console.warn('Gemini API request failed, falling back to local estimator');
      return heuristicIndonesianFoodEstimator(cleanInput);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean JSON response string from potential backticks
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        name: parsed.name || cleanInput,
        nutrition: {
          calories: Math.max(0, parseInt(parsed.calories, 10) || 300),
          proteinGrams: Math.max(0, parseInt(parsed.proteinGrams, 10) || 15),
          carbsGrams: Math.max(0, parseInt(parsed.carbsGrams, 10) || 40),
          fatGrams: Math.max(0, parseInt(parsed.fatGrams, 10) || 10),
          fiberGrams: Math.max(0, parseInt(parsed.fiberGrams, 10) || 3),
        },
        confidence: 'high',
        aiNotes: parsed.aiNotes || 'Dihitung presisi oleh Gemini AI Cloud',
        isOnlineAI: true,
      };
    }
  } catch (error) {
    console.error('Error calling Gemini AI:', error);
  }

  return heuristicIndonesianFoodEstimator(cleanInput);
}
