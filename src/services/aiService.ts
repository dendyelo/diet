import { NutritionData } from '../types';

export interface AIFoodResult {
  name: string;
  nutrition: NutritionData;
  confidence: 'high' | 'medium' | 'low';
  aiNotes?: string;
  isOnlineAI: boolean;
  portionMultiplier?: number;
}

export interface AIStatus {
  isOnline: boolean;
  modeLabel: string;
  color: string;
  description: string;
}

/**
 * Check AI engine current status
 */
export function getAIStatus(userApiKey?: string): AIStatus {
  if (userApiKey && userApiKey.trim().length > 0) {
    return {
      isOnline: true,
      modeLabel: 'Gemini AI Cloud (Online)',
      color: '#10B981',
      description: 'Presisi tinggi menggunakan model Gemini 2.5 Flash Cloud dengan analisis porsi.',
    };
  }
  return {
    isOnline: false,
    modeLabel: 'Smart Local Engine (Offline)',
    color: '#F59E0B',
    description: 'Estimasi gizi akurat berbasis database porsi masakan Indonesia di memori HP.',
  };
}

/**
 * Smart Fallback Estimator for local Indonesian foods with refined portion accuracy
 */
function heuristicIndonesianFoodEstimator(foodText: string): AIFoodResult {
  const lower = foodText.toLowerCase();

  let calories = 320;
  let proteinGrams = 15;
  let carbsGrams = 40;
  let fatGrams = 10;
  let fiberGrams = 3;

  // Portion multiplier detection
  let multiplier = 1.0;
  if (lower.includes('setengah') || lower.includes('1/2') || lower.includes('dikit') || lower.includes('kecil')) {
    multiplier = 0.6;
  } else if (lower.includes('2 porsi') || lower.includes('banyak') || lower.includes('double') || lower.includes('besar')) {
    multiplier = 1.6;
  }

  if (lower.includes('padang') || lower.includes('rendang')) {
    calories = 620;
    proteinGrams = 28;
    carbsGrams = 68;
    fatGrams = 24;
  } else if (lower.includes('soto') || lower.includes('sop')) {
    calories = 340;
    proteinGrams = 20;
    carbsGrams = 30;
    fatGrams = 12;
  } else if (lower.includes('gorengan') || lower.includes('bakwan') || lower.includes('tahu isi')) {
    calories = 140; // per potong
    proteinGrams = 3;
    carbsGrams = 16;
    fatGrams = 8;
  } else if (lower.includes('boba') || lower.includes('kopi manis') || lower.includes('boba milk')) {
    calories = 360;
    proteinGrams = 3;
    carbsGrams = 58;
    fatGrams = 12;
  } else if (lower.includes('gado') || lower.includes('pecel') || lower.includes('salad')) {
    calories = 290;
    proteinGrams = 12;
    carbsGrams = 28;
    fatGrams = 14;
    fiberGrams = 7;
  } else if (lower.includes('ayam bakar') || lower.includes('ayam dada')) {
    calories = 340;
    proteinGrams = 35;
    carbsGrams = 20;
    fatGrams = 10;
  } else if (lower.includes('nasi putih')) {
    calories = 200; // 1 centong (150g)
    proteinGrams = 4;
    carbsGrams = 44;
    fatGrams = 0.5;
  } else if (lower.includes('buah') || lower.includes('apel') || lower.includes('pisang')) {
    calories = 90;
    proteinGrams = 1;
    carbsGrams = 23;
    fatGrams = 0;
    fiberGrams = 3;
  }

  // Apply portion multiplier
  calories = Math.round(calories * multiplier);
  proteinGrams = Math.round(proteinGrams * multiplier);
  carbsGrams = Math.round(carbsGrams * multiplier);
  fatGrams = Math.round(fatGrams * multiplier);

  return {
    name: foodText.trim(),
    nutrition: { calories, proteinGrams, carbsGrams, fatGrams, fiberGrams },
    confidence: 'medium',
    aiNotes: `Estimasi gizi kuliner lokal (Porsi: ${multiplier}x).`,
    isOnlineAI: false,
    portionMultiplier: multiplier,
  };
}

/**
 * Estimate nutrition from food description using Gemini AI API with portion precision
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
    const prompt = `Anda adalah ahli gizi spesialis kuliner Indonesia & internasional dengan tingkat presisi tinggi.
Analisis deskripsi makanan/cemilan ini: "${cleanInput}".
Perhatikan baik-baik porsi (misal 1 centong nasi = 200 kcal, setengah porsi = 0.5x, ayam bakar dada = 220 kcal, minyak goreng, gula manis).
Kembalikan HANYA format JSON tanpa teks lain atau markdown codeblock formatting:
{
  "name": "nama makanan yang rapi",
  "calories": 420,
  "proteinGrams": 24,
  "carbsGrams": 48,
  "fatGrams": 12,
  "fiberGrams": 4,
  "aiNotes": "catatan nutrisi presisi porsi 1 kalimat"
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
        aiNotes: parsed.aiNotes || 'Dihitung presisi porsi oleh Gemini AI Cloud',
        isOnlineAI: true,
      };
    }
  } catch (error) {
    console.error('Error calling Gemini AI:', error);
  }

  return heuristicIndonesianFoodEstimator(cleanInput);
}
