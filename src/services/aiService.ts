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
      description: 'Presisi tinggi menggunakan model Gemini 2.5 Flash Cloud dengan deteksi kuantitas presisi.',
    };
  }
  return {
    isOnline: false,
    modeLabel: 'Smart Local Engine (Offline)',
    color: '#F59E0B',
    description: 'Estimasi gizi akurat berbasis deteksi kuantitas & porsi makanan di HP.',
  };
}

/**
 * Extract item quantity multiplier from Indonesian text (e.g. "2 telur", "3 potong", "setengah porsi")
 */
function parseItemQuantity(text: string): number {
  const lower = text.toLowerCase().trim();

  // Explicit word quantity checks
  if (lower.includes('setengah') || lower.includes('1/2')) return 0.5;
  if (lower.includes('dua') || lower.includes('sepasang') || lower.includes('2x') || lower.includes('2 ')) return 2;
  if (lower.includes('tiga') || lower.includes('3x') || lower.includes('3 ')) return 3;
  if (lower.includes('empat') || lower.includes('4x') || lower.includes('4 ')) return 4;
  if (lower.includes('lima') || lower.includes('5x') || lower.includes('5 ')) return 5;

  // Regex number match at start or before keywords like "butir", "potong", "telur", "biji", "buah", "pcs"
  const numMatch = lower.match(/(\d+)\s*(butir|potong|biji|buah|pcs|porsi|telur|mangkok|centong)?/i);
  if (numMatch && numMatch[1]) {
    const parsed = parseInt(numMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
      return parsed;
    }
  }

  return 1;
}

/**
 * Smart Fallback Estimator for local Indonesian foods with Quantity-Aware calculation
 */
function heuristicIndonesianFoodEstimator(foodText: string): AIFoodResult {
  const lower = foodText.toLowerCase();

  const items: FoodItemBreakdown[] = [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  // Split input by comma or 'pake' or '+' or 'dan' or newline
  const rawParts = foodText.split(/,|\+|\spake\s|\sdan\s|\n/i).map((p) => p.trim()).filter(Boolean);

  if (rawParts.length > 0) {
    rawParts.forEach((part) => {
      const pLower = part.toLowerCase();
      const qty = parseItemQuantity(part);

      let unitCal = 150;
      let unitProtein = 5;
      let unitCarbs = 20;
      let unitFat = 5;
      let displayLabel = part;

      if (pLower.includes('telur')) {
        unitCal = pLower.includes('goreng') || pLower.includes('dadar') ? 110 : 80;
        unitProtein = 7;
        unitCarbs = 1;
        unitFat = unitCal === 110 ? 8 : 5;
        displayLabel = `${qty} Butir Telur${pLower.includes('dadar') ? ' Dadar' : pLower.includes('ceplok') ? ' Ceplok' : ' Rebus'}`;
      } else if (pLower.includes('nasi')) {
        unitCal = pLower.includes('setengah') ? 100 : 200;
        unitProtein = 4;
        unitCarbs = 44;
        unitFat = 1;
        displayLabel = `${qty > 1 ? qty + ' Centong ' : ''}Nasi Putih`;
      } else if (pLower.includes('ayam')) {
        unitCal = pLower.includes('bakar') ? 220 : pLower.includes('goreng') ? 250 : 200;
        unitProtein = 25;
        unitCarbs = 2;
        unitFat = 10;
        displayLabel = `${qty > 1 ? qty + ' Potong ' : ''}Ayam ${pLower.includes('bakar') ? 'Bakar' : 'Goreng'}`;
      } else if (pLower.includes('tahu') || pLower.includes('tempe')) {
        unitCal = 90;
        unitProtein = 6;
        unitCarbs = 8;
        unitFat = 5;
        displayLabel = `${qty > 1 ? qty + ' Potong ' : ''}${pLower.includes('tahu') ? 'Tahu' : 'Tempe'}`;
      } else if (pLower.includes('sambal')) {
        unitCal = 35;
        unitProtein = 1;
        unitCarbs = 3;
        unitFat = 3;
        displayLabel = 'Sambal';
      } else if (pLower.includes('sayur') || pLower.includes('sop') || pLower.includes('buncis')) {
        unitCal = 65;
        unitProtein = 2;
        unitCarbs = 8;
        unitFat = 2;
        displayLabel = 'Sayuran';
      } else if (pLower.includes('rendang')) {
        unitCal = 240;
        unitProtein = 18;
        unitCarbs = 6;
        unitFat = 16;
        displayLabel = `${qty > 1 ? qty + ' Potong ' : ''}Rendang Daging`;
      } else if (pLower.includes('kerupuk')) {
        unitCal = 60;
        unitProtein = 1;
        unitCarbs = 8;
        unitFat = 3;
        displayLabel = `${qty > 1 ? qty + ' Biji ' : ''}Kerupuk`;
      }

      const itemTotalCal = Math.round(unitCal * qty);
      items.push({ name: displayLabel, calories: itemTotalCal });

      totalCalories += itemTotalCal;
      totalProtein += Math.round(unitProtein * qty);
      totalCarbs += Math.round(unitCarbs * qty);
      totalFat += Math.round(unitFat * qty);
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
      proteinGrams: totalProtein,
      carbsGrams: totalCarbs,
      fatGrams: totalFat,
    },
    confidence: 'medium',
    aiNotes: 'Estimasi gizi berbasis deteksi kuantitas & porsi makanan.',
    isOnlineAI: false,
    itemsBreakdown: items,
  };
}

/**
 * Estimate nutrition from food description using Gemini AI API with Quantity-Aware parsing
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

PERHATIKAN SANGAT KETAT JUMLAH DAN KUANTITAS:
- 1 Telur Rebus = 80 kcal, 2 Telur Rebus = 160 kcal, 3 Telur = 240 kcal.
- 1 Telur Dadar = 110 kcal, 2 Telur Dadar = 220 kcal.
- 1 Ayam Bakar = 220 kcal, 2 Ayam Bakar = 440 kcal.
- 1 Centong Nasi = 200 kcal, 2 Centong Nasi = 400 kcal.

PISAHKAN setiap item makanan beserta JUMLAH KUANTITAS dan KALORI MASING-MASING SECARA AKURAT.
Kembalikan HANYA format JSON tanpa teks lain atau markdown codeblock formatting:
{
  "name": "nama gabungan makanan yang rapi",
  "calories": 440,
  "proteinGrams": 32,
  "carbsGrams": 48,
  "fatGrams": 18,
  "fiberGrams": 4,
  "itemsBreakdown": [
    { "name": "2 Butir Telur Dadar", "calories": 220 },
    { "name": "1 Centong Nasi Putih", "calories": 200 }
  ],
  "aiNotes": "catatan nutrisi presisi kuantitas 1 kalimat"
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
        aiNotes: parsed.aiNotes || 'Rincian kuantitas dihitung presisi oleh Gemini AI Cloud',
        isOnlineAI: true,
        itemsBreakdown: items,
      };
    }
  } catch (error) {
    console.error('Error calling Gemini AI:', error);
  }

  return heuristicIndonesianFoodEstimator(cleanInput);
}
