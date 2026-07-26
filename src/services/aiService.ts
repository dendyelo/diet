import { NutritionData, FoodItemBreakdown } from '../types';
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
}

export interface AICoachResponse {
  coachMessage: string;
  questionPrompt: string;
  recommendedAction: 'meal' | 'snack' | 'water' | 'fasting';
}

/**
 * Check Gemini AI Cloud API Status
 */
export function getAIStatus(userApiKey?: string): AIStatus {
  if (userApiKey && userApiKey.trim().length > 0) {
    return {
      isOnline: true,
      modeLabel: 'Gemini 2.5 Flash Cloud (Aktif 🟢)',
      color: '#10B981',
      description: 'Presisi Cloud tinggi dengan bedah metode memasak, santan, minyak & porsi presisi.',
    };
  }
  return {
    isOnline: false,
    modeLabel: 'Smart Culinary Engine (Aktif 🟢)',
    color: '#10B981',
    description: 'Engine kuliner presisi internal berbasis tabel gizi makanan Indonesia.',
  };
}

/**
 * Handle HTTP Error Status Codes gracefully (401, 403, 429)
 */
function handleHTTPErrorStatus(status: number): string {
  if (status === 401 || status === 403) {
    return 'Gemini API Key tidak valid atau tidak memiliki izin akses (401/403). Mohon periksa API Key di menu Profil.';
  }
  if (status === 429) {
    return 'Batas penggunaan harian Gemini AI telah tercapai (429 Rate Limit Exceeded). Menggunakan Smart Culinary Engine cadangan.';
  }
  return `Gagal terhubung ke Google AI Cloud (HTTP ${status}).`;
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

  // If user provided a Gemini API Key, try cloud API first
  if (userApiKey && userApiKey.trim().length > 0) {
    try {
      const prompt = `Anda adalah Pakar Gizi & Ahli Kuliner Spesialis Makanan Indonesia & Internasional dengan presisi tinggi.
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
      } else {
        console.warn(handleHTTPErrorStatus(response.status));
      }
    } catch (error) {
      console.warn('Gemini Cloud API call failed, using Smart Culinary Engine:', error);
    }
  }

  // Smart Built-in Engine Fallback
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
        : `SURPLUS ${Math.abs(userData.netDeficit)} kcal (PERINGATAN SURPLUS 🔴 - Kalori Masuk ${userData.caloriesIn} kcal lebih besar dari Kalori Keluar!)`;

      const prompt = `Anda adalah AI Health Coach pribadi bernama HabitDiet Coach yang hangat, peduli, empati, ramah, dan agak humoris santai.

DATA PENGGUNA SAAT INI (Jam ${userData.currentHour}:00):
- Nama: ${userData.name || 'Teman'}
- Berpuasa: ${userData.fastingHours} Jam
- Total Kalori Masuk (Dimakan): ${userData.caloriesIn} kcal
- Status Keseimbangan Energi: ${balanceStatus}
- Jumlah Langkah: ${userData.steps} steps
- Air Minum: ${userData.waterGlasses} / 8 gelas

TUGAS:
Buatkan 1 dialog sapaan & pertanyaan interaktif yang kreatif, alami, dan bebas menyesuaikan data ini! Jika status energi SURPLUS, beri peringatan empati bahwa kalori masuk melebihi kalori keluar saat ini.
Kembalikan HANYA format JSON valid tanpa markdown formatting:
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
      } else {
        console.warn(handleHTTPErrorStatus(response.status));
      }
    } catch (err) {
      console.error('Error generating AI Coach message:', err);
    }
  }

  return null;
}
