import { NutritionData, FoodItemBreakdown } from '../types';

export interface AIFoodResult {
  name: string;
  nutrition: NutritionData;
  confidence: 'high' | 'medium' | 'low';
  aiNotes?: string;
  isOnlineAI: boolean;
  portionMultiplier?: number;
  itemsBreakdown: FoodItemBreakdown[];
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
      description: 'Presisi tinggi menggunakan model Gemini 2.5 Flash Cloud dengan analisis rincian per item.',
    };
  }
  return {
    isOnline: false,
    modeLabel: 'Smart Local Engine (Offline)',
    color: '#F59E0B',
    description: 'Estimasi gizi akurat berbasis rincian item kuliner lokal di memori HP.',
  };
}

/**
 * Smart Fallback Estimator for local Indonesian foods with refined portion accuracy and itemized breakdown
 */
function heuristicIndonesianFoodEstimator(foodText: string): AIFoodResult {
  const lower = foodText.toLowerCase();

  const items: FoodItemBreakdown[] = [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  // Split input by comma or 'pake' or '+' or 'dan'
  const rawParts = foodText.split(/,|\+|\spake\s|\sdan\s/i).map((p) => p.trim()).filter(Boolean);

  if (rawParts.length > 0) {
    rawParts.forEach((part) => {
      const pLower = part.toLowerCase();
      let itemCal = 150;

      if (pLower.includes('nasi')) {
        itemCal = pLower.includes('setengah') ? 100 : 200;
        totalCarbs += 44;
        totalProtein += 4;
      } else if (pLower.includes('telur')) {
        itemCal = pLower.includes('goreng') || pLower.includes('dadar') ? 110 : 80;
        totalProtein += 7;
        totalFat += 7;
      } else if (pLower.includes('ayam')) {
        itemCal = pLower.includes('bakar') ? 220 : pLower.includes('goreng') ? 250 : 200;
        totalProtein += 25;
        totalFat += 10;
      } else if (pLower.includes('tahu') || pLower.includes('tempe')) {
        itemCal = 90;
        totalProtein += 6;
        totalFat += 5;
      } else if (pLower.includes('sambal')) {
        itemCal = 35;
        totalFat += 3;
      } else if (pLower.includes('sayur') || pLower.includes('sop') || pLower.includes('buncis')) {
        itemCal = 65;
        totalCarbs += 8;
        totalProtein += 2;
      } else if (pLower.includes('rendang')) {
        itemCal = 240;
        totalProtein += 18;
        totalFat += 16;
      } else if (pLower.includes('kerupuk')) {
        itemCal = 60;
        totalCarbs += 8;
        totalFat += 3;
      }

      items.push({ name: part, calories: itemCal });
      totalCalories += itemCal;
    });
  }

  // Fallback if no parts matched
  if (items.length === 0) {
    items.push({ name: foodText, calories: 350 });
    totalCalories = 350;
    totalProtein = 15;
    totalCarbs = 40;
    totalFat = 10;
  }

  return {
    name: foodText.trim(),
    nutrition: {
      calories: totalCalories,
      proteinGrams: Math.max(10, totalProtein),
      carbsGrams: Math.max(15, totalCarbs),
      fatGrams: Math.max(5, totalFat),
    },
    confidence: 'medium',
    aiNotes: 'Estimasi rincian per item kuliner lokal di HP.',
    isOnlineAI: false,
    itemsBreakdown: items,
  };
}

/**
 * Estimate nutrition from food description using Gemini AI API with itemized breakdown per ingredient
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
    const prompt = `Anda adalah ahli gizi spesialis kuliner Indonesia & internasional dengan presisi tinggi.
Analisis deskripsi makanan/cemilan ini: "${cleanInput}".
PISAHKAN setiap item makanan/lauk/minuman dan hitung kalori masing-masing secara rinci.
Kembalikan HANYA format JSON tanpa teks lain atau markdown codeblock formatting:
{
  "name": "nama gabungan makanan yang rapi",
  "calories": 540,
  "proteinGrams": 32,
  "carbsGrams": 48,
  "fatGrams": 18,
  "fiberGrams": 4,
  "itemsBreakdown": [
    { "name": "Nasi Putih (1 centong)", "calories": 200 },
    { "name": "Telur Dadar", "calories": 110 },
    { "name": "Ayam Bakar Dada", "calories": 230 }
  ],
  "aiNotes": "catatan nutrisi presisi 1 kalimat"
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

      const items: FoodItemBreakdown[] = Array.isArray(parsed.itemsBreakdown)
        ? parsed.itemsBreakdown.map((it: any) => ({
            name: it.name || 'Item',
            calories: Math.max(0, parseInt(it.calories, 10) || 100),
          }))
        : [{ name: cleanInput, calories: Math.max(0, parseInt(parsed.calories, 10) || 300) }];

      const sumCalories = items.reduce((acc, it) => acc + it.calories, 0);

      return {
        name: parsed.name || cleanInput,
        nutrition: {
          calories: sumCalories || Math.max(0, parseInt(parsed.calories, 10) || 300),
          proteinGrams: Math.max(0, parseInt(parsed.proteinGrams, 10) || 15),
          carbsGrams: Math.max(0, parseInt(parsed.carbsGrams, 10) || 40),
          fatGrams: Math.max(0, parseInt(parsed.fatGrams, 10) || 10),
          fiberGrams: Math.max(0, parseInt(parsed.fiberGrams, 10) || 3),
        },
        confidence: 'high',
        aiNotes: parsed.aiNotes || 'Rincian item dihitung presisi oleh Gemini AI Cloud',
        isOnlineAI: true,
        itemsBreakdown: items,
      };
    }
  } catch (error) {
    console.error('Error calling Gemini AI:', error);
  }

  return heuristicIndonesianFoodEstimator(cleanInput);
}
