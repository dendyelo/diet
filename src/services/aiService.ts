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
      modeLabel: 'Gemini AI Cloud (Online - Ultra Smart)',
      color: '#10B981',
      description: 'Presisi tinggi dengan analisis metode memasak, santan, minyak & porsi presisi.',
    };
  }
  return {
    isOnline: false,
    modeLabel: 'Smart Local Engine (Offline - Culinary DB)',
    color: '#F59E0B',
    description: 'Estimasi gizi akurat berbasis kecerdasan kuliner lokal & porsi makanan di HP.',
  };
}

/**
 * Extract item quantity multiplier from Indonesian text (e.g. "2 telur", "3 potong", "setengah porsi")
 */
function parseItemQuantity(text: string): number {
  const lower = text.toLowerCase().trim();

  if (lower.includes('setengah') || lower.includes('1/2')) return 0.5;
  if (lower.includes('dua') || lower.includes('sepasang') || lower.includes('2x') || lower.includes('2 ')) return 2;
  if (lower.includes('tiga') || lower.includes('3x') || lower.includes('3 ')) return 3;
  if (lower.includes('empat') || lower.includes('4x') || lower.includes('4 ')) return 4;
  if (lower.includes('lima') || lower.includes('5x') || lower.includes('5 ')) return 5;

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
 * Ultra-Smart Fallback Estimator for Indonesian & Asian Culinary Items with Cooking Method Analysis
 */
function smartIndonesianCulinaryEngine(foodText: string): AIFoodResult {
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

      // Cooking method modifier
      let oilFatAdd = 0;
      if (pLower.includes('goreng') || pLower.includes('crispy') || pLower.includes('tepung')) {
        oilFatAdd = 6; // Extra fat from deep frying
      } else if (pLower.includes('santan') || pLower.includes('gulai') || pLower.includes('rendang')) {
        oilFatAdd = 8; // Extra saturated fat from coconut milk
      }

      // Sugar modifier for drinks
      let sugarAdd = 0;
      if (pLower.includes('less sugar')) {
        sugarAdd = -15;
      } else if (pLower.includes('no sugar') || pLower.includes('tawar') || pLower.includes('zero')) {
        sugarAdd = -30;
      }

      if (pLower.includes('telur')) {
        const isFried = pLower.includes('goreng') || pLower.includes('dadar') || pLower.includes('ceplok');
        unitCal = isFried ? 110 : 78;
        unitProtein = 7;
        unitCarbs = 1;
        unitFat = isFried ? 8 : 5;
        displayLabel = `${qty} Butir Telur${pLower.includes('dadar') ? ' Dadar' : pLower.includes('ceplok') ? ' Ceplok' : ' Rebus'}`;
      } else if (pLower.includes('nasi uduk') || pLower.includes('nasi kuning')) {
        unitCal = 260; // Coconut rice
        unitProtein = 5;
        unitCarbs = 46;
        unitFat = 7;
        displayLabel = `${qty > 1 ? qty + ' Centong ' : ''}Nasi Uduk/Kuning`;
      } else if (pLower.includes('nasi')) {
        const isHalf = pLower.includes('setengah') || pLower.includes('dikit');
        unitCal = isHalf ? 100 : 200;
        unitProtein = 4;
        unitCarbs = isHalf ? 22 : 44;
        unitFat = 1;
        displayLabel = `${qty > 1 ? qty + ' Centong ' : ''}Nasi Putih`;
      } else if (pLower.includes('ayam')) {
        const isBreast = pLower.includes('dada');
        const isCrispy = pLower.includes('geprek') || pLower.includes('crispy') || pLower.includes('kentucky');
        unitCal = isCrispy ? 320 : pLower.includes('bakar') ? (isBreast ? 200 : 230) : 260;
        unitProtein = isBreast ? 32 : 24;
        unitCarbs = isCrispy ? 15 : 2;
        unitFat = isCrispy ? 18 : pLower.includes('bakar') ? 8 : 14;
        displayLabel = `${qty > 1 ? qty + ' Potong ' : ''}Ayam ${pLower.includes('bakar') ? 'Bakar' : isCrispy ? 'Geprek/Crispy' : 'Goreng'}`;
      } else if (pLower.includes('tahu') || pLower.includes('tempe')) {
        const isBacem = pLower.includes('bacem');
        unitCal = isBacem ? 120 : 90;
        unitProtein = 6;
        unitCarbs = isBacem ? 14 : 8;
        unitFat = 5;
        displayLabel = `${qty > 1 ? qty + ' Potong ' : ''}${pLower.includes('tahu') ? 'Tahu' : 'Tempe'}${isBacem ? ' Bacem' : ''}`;
      } else if (pLower.includes('soto') || pLower.includes('sop')) {
        const hasSantan = pLower.includes('betawi') || pLower.includes('santan');
        unitCal = hasSantan ? 450 : 310;
        unitProtein = 22;
        unitCarbs = 18;
        unitFat = hasSantan ? 26 : 10;
        displayLabel = `Porsi ${pLower.includes('soto') ? 'Soto' : 'Sop'}${hasSantan ? ' Santan' : ' Bening'}`;
      } else if (pLower.includes('boba') || pLower.includes('kopi manis') || pLower.includes('es teh manis')) {
        unitCal = Math.max(50, (pLower.includes('boba') ? 380 : 180) + sugarAdd);
        unitProtein = 2;
        unitCarbs = Math.max(10, 45 + Math.round(sugarAdd / 4));
        unitFat = pLower.includes('boba') ? 12 : 4;
        displayLabel = `Minuman ${part}`;
      } else if (pLower.includes('gado') || pLower.includes('pecel')) {
        unitCal = 310;
        unitProtein = 12;
        unitCarbs = 30;
        unitFat = 14;
        displayLabel = `1 Porsi ${pLower.includes('gado') ? 'Gado-Gado' : 'Pecel'}`;
      } else if (pLower.includes('rendang')) {
        unitCal = 250;
        unitProtein = 20;
        unitCarbs = 6;
        unitFat = 17;
        displayLabel = `${qty > 1 ? qty + ' Potong ' : ''}Rendang Daging`;
      } else if (pLower.includes('sambal')) {
        unitCal = 40;
        unitProtein = 1;
        unitCarbs = 3;
        unitFat = 3;
        displayLabel = 'Sambal';
      }

      // Apply quantity and modifiers
      const itemTotalCal = Math.round((unitCal + oilFatAdd * 9) * qty);
      items.push({ name: displayLabel, calories: itemTotalCal });

      totalCalories += itemTotalCal;
      totalProtein += Math.round(unitProtein * qty);
      totalCarbs += Math.round(unitCarbs * qty);
      totalFat += Math.round((unitFat + oilFatAdd) * qty);
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
    aiNotes: `Analisis cerdas metode pengolahan & porsi kuliner lokal.`,
    isOnlineAI: false,
    itemsBreakdown: items,
  };
}

/**
 * Estimate nutrition from food description using Ultra-Smart Gemini AI API
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
    return smartIndonesianCulinaryEngine(cleanInput);
  }

  try {
    const prompt = `Anda adalah Pakar Gizi & Ahli Kuliner Spesialis Makanan Indonesia & Internasional.
Tugas Anda adalah melakukan bedah nutrisi ultra-presisi terhadap input pengguna: "${cleanInput}".

ATURAN ANALISIS PINTAR:
1. DETEKSI METODE MEMASAK: Bedakan Goreng Deep-Fry (minyak +80 kcal), Bakar/Panggang (rendah lemak), Santan/Gulai (lemak jenuh), Kukus/Rebus.
2. DETEKSI KUANTITAS: 1 Telur Rebus = 78 kcal, 2 Telur Rebus = 156 kcal, 3 Telur = 234 kcal. 1 Ayam Bakar = 220 kcal, 2 Ayam Bakar = 440 kcal.
3. DETEKSI MINUMAN & GULA: Bedakan Less Sugar (-30% kalori), Zero Sugar, dan Boba topping.
4. BEDAH KOMPONEN HIDANGAN: Jika input adalah "Nasi Uduk Komplit", pecah menjadi: Nasi Uduk (Santan), Orek Tempe, Biun Goreng, Telur Suwir, Sambal.

Kembalikan HANYA format JSON valid tanpa markdown formatting atau penjelasan luar:
{
  "name": "Nama hidangan yang rapi dan profesional",
  "calories": 520,
  "proteinGrams": 32,
  "carbsGrams": 48,
  "fatGrams": 16,
  "fiberGrams": 4,
  "itemsBreakdown": [
    { "name": "1 Centong Nasi Putih", "calories": 200 },
    { "name": "2 Butir Telur Dadar", "calories": 220 },
    { "name": "Sambal Terasi", "calories": 40 }
  ],
  "aiNotes": "Catatan gizi pintar 1 kalimat (misal: 'Tinggi protein (32g), perhatikan kadar lemak dari gorengan.')"
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
      return smartIndonesianCulinaryEngine(cleanInput);
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
        aiNotes: parsed.aiNotes || 'Analisis ultra-presisi oleh Gemini AI Cloud',
        isOnlineAI: true,
        itemsBreakdown: items,
      };
    }
  } catch (error) {
    console.error('Error calling Gemini AI:', error);
  }

  return smartIndonesianCulinaryEngine(cleanInput);
}
