import { NutritionData, FoodItemBreakdown, AIConnectionStatus } from '../types';
import { smartIndonesianCulinaryEngine } from './aiServiceFallback';

export { smartIndonesianCulinaryEngine };

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
  connectionStatus: AIConnectionStatus;
}

export interface AICoachResponse {
  coachMessage: string;
  questionPrompt: string;
  recommendedAction: 'meal' | 'snack' | 'water' | 'fasting';
}

/**
 * Gemini models for automatic fallback
 */
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash'];

/**
 * Check Gemini AI Cloud API Connection Status dynamically
 */
export function getAIStatus(userApiKey?: string, connectionStatus: AIConnectionStatus = 'not_configured'): AIStatus {
  if (!userApiKey || userApiKey.trim().length === 0) {
    return {
      isOnline: false,
      modeLabel: 'Smart Culinary Engine (Aktif 🟢)',
      color: '#10B981',
      description: 'Engine kuliner internal berbasis estimasi tabel gizi makanan Indonesia.',
      connectionStatus: 'not_configured',
    };
  }

  if (connectionStatus === 'connected') {
    return {
      isOnline: true,
      modeLabel: 'Gemini Cloud AI (Terhubung 🟢)',
      color: '#10B981',
      description: 'Terhubung langsung ke Google AI Studio Cloud untuk estimasi gizi cerdas.',
      connectionStatus: 'connected',
    };
  }

  if (connectionStatus === 'invalid_key') {
    return {
      isOnline: false,
      modeLabel: 'API Key Tidak Valid (Error 🔴)',
      color: '#EF4444',
      description: 'API Key ditolak oleh Google AI Cloud (401/403). Menggunakan Engine cadangan.',
      connectionStatus: 'invalid_key',
    };
  }

  if (connectionStatus === 'rate_limited') {
    return {
      isOnline: false,
      modeLabel: 'Kuota Terlampaui (429 🟠)',
      color: '#F59E0B',
      description: 'Batas kuota terlampaui. Menggunakan Engine Kuliner cadangan.',
      connectionStatus: 'rate_limited',
    };
  }

  if (connectionStatus === 'checking') {
    return {
      isOnline: false,
      modeLabel: 'Memeriksa Koneksi (Checking 🟡)',
      color: '#F59E0B',
      description: 'Sedang menguji respon server Google AI Cloud...',
      connectionStatus: 'checking',
    };
  }

  return {
    isOnline: true,
    modeLabel: 'Gemini Cloud AI (Siap 🟢)',
    color: '#10B981',
    description: 'API Key terkonfigurasi. Siap membantu estimasi nutrisi.',
    connectionStatus: connectionStatus || 'not_configured',
  };
}

/**
 * Test Real Connection to Gemini AI API
 */
export async function testGeminiAPIConnection(userApiKey: string): Promise<AIConnectionStatus> {
  const cleanKey = userApiKey.trim();
  if (!cleanKey) return 'not_configured';

  for (const model of GEMINI_MODELS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Ping test' }] }],
          }),
          signal: controller.signal,
        }
      );

      if (response.ok) {
        return 'connected';
      }
      if (response.status === 401 || response.status === 403) {
        return 'invalid_key';
      }
    } catch (error) {
      console.warn(`Test connection error for ${model}:`, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return 'rate_limited';
}

/**
 * Estimate nutrition from food description using Gemini AI API with Smart Fallback
 */
export async function parseFoodNutritionWithAI(
  foodInput: string,
  userApiKey?: string
): Promise<AIFoodResult> {
  const cleanInput = foodInput.trim();
  if (!cleanInput) {
    throw new Error('Deskripsi makanan tidak boleh kosong.');
  }

  let lastErrorReason: 'invalid_key' | 'rate_limited' | 'network_error' | null = null;

  if (userApiKey && userApiKey.trim().length > 0) {
    const key = userApiKey.trim();
    const prompt = `Anda adalah Pakar Gizi & Ahli Kuliner Spesialis Makanan Indonesia & Internasional.
Tugas Anda adalah melakukan estimasi nutrisi makanan terhadap input pengguna: "${cleanInput}".

ATURAN ANALISIS:
1. DETEKSI METODE MEMASAK: Bedakan Goreng (minyak +80 kcal), Bakar/Panggang (rendah lemak), Santan/Gulai (lemak jenuh), Kukus/Rebus.
2. DETEKSI KUANTITAS: 1 Telur Rebus = 78 kcal, 2 Telur Rebus = 156 kcal.
3. DETEKSI MINUMAN & GULA: Bedakan Less Sugar (-30% kalori), Zero Sugar.
4. BEDAH KOMPONEN HIDANGAN: Jika input adalah "Nasi Uduk Komplit", pecah menjadi komponennya.

Kembalikan HANYA format JSON valid tanpa markdown:
{
  "name": "Nama hidangan yang rapi",
  "calories": 520,
  "proteinGrams": 32,
  "carbsGrams": 48,
  "fatGrams": 16,
  "fiberGrams": 4,
  "itemsBreakdown": [
    { "name": "1 Centong Nasi Putih", "calories": 200 },
    { "name": "2 Butir Telur Dadar", "calories": 220 }
  ],
  "aiNotes": "Catatan gizi ringkas 1 kalimat"
}`;

    for (const model of GEMINI_MODELS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
            signal: controller.signal,
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
              aiNotes: parsed.aiNotes || `Estimasi nutrisi oleh Gemini Cloud AI (${model})`,
              isOnlineAI: true,
              itemsBreakdown: items,
            };
          }
        }

        if (response.status === 401 || response.status === 403) {
          lastErrorReason = 'invalid_key';
          break;
        }
        if (response.status === 429) {
          lastErrorReason = 'rate_limited';
        }
      } catch (error) {
        lastErrorReason = 'network_error';
        console.warn(`Gemini Cloud API call for ${model} failed:`, error);
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  const fallbackResult = smartIndonesianCulinaryEngine(cleanInput);
  if (userApiKey && userApiKey.trim().length > 0) {
    if (lastErrorReason === 'invalid_key') {
      fallbackResult.aiNotes = '⚠️ API Key tidak valid (401/403). Menggunakan estimasi offline.';
    } else if (lastErrorReason === 'rate_limited') {
      fallbackResult.aiNotes = '⚠️ Kuota Gemini Cloud terlampaui. Menggunakan estimasi offline.';
    } else {
      fallbackResult.aiNotes = '⚠️ Koneksi ke Gemini Cloud terputus. Menggunakan estimasi offline.';
    }
  }
  return fallbackResult;
}

/**
 * Generate Dynamic Creative AI Coach Greeting & Question using Gemini AI Cloud API
 */
export async function generateAICoachMessageWithAI(
  userData: {
    name: string;
    fastingHours: number;
    caloriesIn: number;
    netDeficit: number;
    steps: number;
    waterGlasses: number;
    currentHour: number;
  },
  userApiKey?: string
): Promise<AICoachResponse | null> {
  if (userApiKey && userApiKey.trim().length > 0) {
    const key = userApiKey.trim();
    const balanceStatus = userData.netDeficit >= 0
      ? `DEFISIT ${userData.netDeficit} kcal (Baguss 🟢)`
      : `SURPLUS ${Math.abs(userData.netDeficit)} kcal (PERINGATAN SURPLUS 🔴)`;

    const prompt = `Anda adalah AI Health Coach pribadi bernama HabitDiet Coach.
DATA PENGGUNA (Jam ${userData.currentHour}:00):
- Nama: ${userData.name || 'Teman'}
- Berpuasa: ${userData.fastingHours} Jam
- Total Kalori Masuk: ${userData.caloriesIn} kcal
- Status Keseimbangan Energi: ${balanceStatus}
- Langkah: ${userData.steps} steps
- Air Minum: ${userData.waterGlasses} / 8 gelas

TUGAS:
Kembalikan HANYA format JSON valid:
{
  "coachMessage": "kalimat sapaan empati & saran gizi kreatif 1-2 kalimat",
  "questionPrompt": "pertanyaan interaktif santai",
  "recommendedAction": "meal"
}`;

    for (const model of GEMINI_MODELS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
            signal: controller.signal,
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              coachMessage: parsed.coachMessage || `Halo ${userData.name}! Bagaimanakah kondisi energimu saat ini?`,
              questionPrompt: parsed.questionPrompt || 'Apakah kamu merasa lapar asli atau butuh minum air?',
              recommendedAction: parsed.recommendedAction || 'meal',
            };
          }
        }
        if (response.status === 401 || response.status === 403) break;
      } catch (err) {
        console.error(`Error generating AI Coach message with ${model}:`, err);
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  return null;
}
