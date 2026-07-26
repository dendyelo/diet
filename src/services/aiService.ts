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
 * Check Gemini AI Cloud API Connection Status dynamically
 */
export function getAIStatus(userApiKey?: string, connectionStatus: AIConnectionStatus = 'not_configured'): AIStatus {
  if (!userApiKey || userApiKey.trim().length === 0) {
    return {
      isOnline: false,
      modeLabel: 'Smart Culinary Engine (Aktif 🟢)',
      color: '#10B981',
      description: 'Engine kuliner presisi internal berbasis tabel gizi makanan Indonesia.',
      connectionStatus: 'not_configured',
    };
  }

  if (connectionStatus === 'connected') {
    return {
      isOnline: true,
      modeLabel: 'Gemini 2.5 Flash Cloud (Terhubung 🟢)',
      color: '#10B981',
      description: 'Terhubung langsung ke Google AI Studio Cloud dengan presisi analisis tinggi.',
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
      modeLabel: 'Quota Terlampaui (429 🟠)',
      color: '#F59E0B',
      description: 'Batas kuota harian tercapai. Menggunakan Smart Culinary Engine cadangan.',
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
    modeLabel: 'Gemini 2.5 Flash Cloud (Siap 🟢)',
    color: '#10B981',
    description: 'API Key terkonfigurasi. Siap menganalisis nutrisi secara presisi.',
    connectionStatus: connectionStatus || 'not_configured',
  };
}

/**
 * Test Real Connection to Gemini AI API
 */
export async function testGeminiAPIConnection(userApiKey: string): Promise<AIConnectionStatus> {
  const cleanKey = userApiKey.trim();
  if (!cleanKey) return 'not_configured';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping test' }] }],
        }),
      }
    );

    if (response.ok) {
      return 'connected';
    }
    if (response.status === 401 || response.status === 403) {
      return 'invalid_key';
    }
    if (response.status === 429) {
      return 'rate_limited';
    }
    return 'offline';
  } catch (error) {
    console.error('Test connection network error:', error);
    return 'offline';
  }
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

  if (userApiKey && userApiKey.trim().length > 0) {
    try {
      const prompt = `Anda adalah Pakar Gizi & Ahli Kuliner Spesialis Makanan Indonesia & Internasional dengan presisi tinggi.
Tugas Anda adalah melakukan bedah nutrisi ultra-presisi terhadap input pengguna: "${cleanInput}".

ATURAN ANALISIS PINTAR:
1. DETEKSI METODE MEMASAK: Bedakan Goreng Deep-Fry (minyak +80 kcal), Bakar/Panggang (rendah lemak), Santan/Gulai (lemak jenuh), Kukus/Rebus.
2. DETEKSI KUANTITAS: 1 Telur Rebus = 78 kcal, 2 Telur Rebus = 156 kcal.
3. DETEKSI MINUMAN & GULA: Bedakan Less Sugar (-30% kalori), Zero Sugar.
4. BEDAH KOMPONEN HIDANGAN: Jika input adalah "Nasi Uduk Komplit", pecah menjadi komponennya.

Kembalikan HANYA format JSON valid tanpa markdown:
{
  "name": "Nama hidangan yang rapi dan profesional",
  "calories": 520,
  "proteinGrams": 32,
  "carbsGrams": 48,
  "fatGrams": 16,
  "fiberGrams": 4,
  "itemsBreakdown": [
    { "name": "1 Centong Nasi Putih", "calories": 200 },
    { "name": "2 Butir Telur Dadar", "calories": 220 }
  ],
  "aiNotes": "Catatan gizi pintar 1 kalimat"
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
            aiNotes: parsed.aiNotes || 'Analisis 100% presisi Cloud oleh Gemini 2.5 Flash AI',
            isOnlineAI: true,
            itemsBreakdown: items,
          };
        }
      }
    } catch (error) {
      console.warn('Gemini Cloud API call failed, using Smart Culinary Engine:', error);
    }
  }

  return smartIndonesianCulinaryEngine(cleanInput);
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
    try {
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
    } catch (err) {
      console.error('Error generating AI Coach message:', err);
    }
  }

  return null;
}
