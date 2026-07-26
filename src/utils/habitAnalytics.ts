import { FastingStage, TriggerOption, MealLog } from '../types';

export const FASTING_STAGES: FastingStage[] = [
  {
    id: 'digesting',
    name: 'Fase Pencernaan',
    description: 'Tubuh sedang mencerna makanan. Gula darah & insulin naik.',
    minHours: 0,
    maxHours: 3,
    color: '#3B82F6', // Blue
    iconName: 'utensils',
  },
  {
    id: 'post_absorptive',
    name: 'Fase Pasca-Absorpsi',
    description: 'Insulin mulai turun. Tubuh mulai memakai cadangan glikogen.',
    minHours: 3,
    maxHours: 8,
    color: '#10B981', // Emerald
    iconName: 'battery-charging',
  },
  {
    id: 'glycogen_depletion',
    name: 'Fase Pembakaran Glikogen',
    description: 'Glikogen habis. Pembakaran lemak (oksidasi asam lemak) meningkat pesat.',
    minHours: 8,
    maxHours: 12,
    color: '#F59E0B', // Amber
    iconName: 'flame',
  },
  {
    id: 'fat_adaptation',
    name: 'Fase Adaptasi Lemak (Ketosis)',
    description: 'Tubuh memproduksi keton. Pembakaran lemak berada di tingkat optimal.',
    minHours: 12,
    maxHours: 16,
    color: '#EC4899', // Pink
    iconName: 'zap',
  },
  {
    id: 'autofagi',
    name: 'Fase Autofagi & Perbaikan Sel',
    description: 'Pembersihan sel-sel tua & regenerasi imun alami tubuh.',
    minHours: 16,
    maxHours: 999,
    color: '#8B5CF6', // Purple
    iconName: 'sparkles',
  },
];

export const TRIGGER_OPTIONS: TriggerOption[] = [
  {
    type: 'BOSAN',
    label: 'Bosan / Melamun',
    emoji: '🥱',
    color: '#3B82F6',
    description: 'Ngemil karena butuh stimulasi saat kerja atau gabut.',
  },
  {
    type: 'STRES',
    label: 'Stres / Tekanan',
    emoji: '🤯',
    color: '#EF4444',
    description: 'Ngemil sebagai mekanisme regulasi emosi.',
  },
  {
    type: 'NONGKRONG',
    label: 'Nongkrong / Sosial',
    emoji: '🍻',
    color: '#8B5CF6',
    description: 'Makan bersama teman atau keluarga.',
  },
  {
    type: 'LAPAR_ASLI',
    label: 'Lapar Asli / Fisik',
    emoji: '⚡',
    color: '#10B981',
    description: 'Lapar fisik alami tubuh butuh energi.',
  },
  {
    type: 'LAPAR_MALAM',
    label: 'Lapar Malam Hari',
    emoji: '🌙',
    color: '#F59E0B',
    description: 'Lapar larut malam sebelum tidur.',
  },
];

export function getFastingStage(elapsedSeconds: number): FastingStage {
  const hours = Math.max(0, elapsedSeconds / 3600);
  const stage = FASTING_STAGES.find((s) => hours >= s.minHours && hours < s.maxHours);
  return stage || FASTING_STAGES[FASTING_STAGES.length - 1];
}

export function formatElapsedTime(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    hours,
    minutes,
    seconds,
    formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

export function calculateTriggerStats(mealLogs: MealLog[]) {
  const snackLogs = mealLogs.filter((m) => m.isSnack && m.trigger);
  const counts: Record<string, number> = {};

  TRIGGER_OPTIONS.forEach((t) => {
    counts[t.type] = 0;
  });

  snackLogs.forEach((s) => {
    if (s.trigger && counts[s.trigger] !== undefined) {
      counts[s.trigger]++;
    }
  });

  const totalSnacks = snackLogs.length;

  const breakdown = TRIGGER_OPTIONS.map((t) => ({
    ...t,
    count: counts[t.type] || 0,
    percentage: totalSnacks > 0 ? Math.round(((counts[t.type] || 0) / totalSnacks) * 100) : 0,
  }));

  return {
    totalSnacks,
    breakdown,
  };
}

export function getTopTrigger(mealLogs: MealLog[]) {
  const stats = calculateTriggerStats(mealLogs);
  const top = [...stats.breakdown].sort((a, b) => b.count - a.count)[0];
  return top && top.count > 0 ? top : null;
}

export interface WeeklyHabitSummary {
  habitScore: number; // 0 - 100
  avgDailyCalories: number;
  waterCompliancePct: number;
  proteinCompliancePct: number;
  insightSentence: string;
}

/**
 * Generate 7-day Weekly Habit Summary & Compliance Score strictly using authentic user logs.
 * No synthetic fake data.
 */
export function generateWeeklyHabitSummary(
  mealLogs: MealLog[],
  todayWaterGlasses: number = 0,
  targetProteinGrams: number = 80
): WeeklyHabitSummary {
  if (!mealLogs || mealLogs.length === 0) {
    const waterPct = Math.min(100, Math.round((todayWaterGlasses / 8) * 100));
    return {
      habitScore: waterPct > 0 ? Math.round(waterPct * 0.3) : 0,
      avgDailyCalories: 0,
      waterCompliancePct: waterPct,
      proteinCompliancePct: 0,
      insightSentence: 'Belum ada data pencatatan makanan minggu ini. Catat makanan pertamamu!',
    };
  }

  const totalCal = mealLogs.reduce((acc, m) => acc + (m.nutrition.calories || 0), 0);
  const daysWithData = Math.max(1, Math.min(7, new Set(mealLogs.map((m) => m.timestamp.slice(0, 10))).size));
  const avgDailyCalories = Math.round(totalCal / daysWithData);

  const waterCompliancePct = Math.min(100, Math.round((todayWaterGlasses / 8) * 100));

  const totalProtein = mealLogs.reduce((acc, m) => acc + (m.nutrition.proteinGrams || 0), 0);
  const avgProtein = totalProtein / daysWithData;
  const proteinCompliancePct = Math.min(100, Math.round((avgProtein / Math.max(1, targetProteinGrams)) * 100));

  // Habit Score Calculation (Weighted blend of water, protein, and logging consistency)
  const consistencyScore = Math.min(100, Math.round((daysWithData / 7) * 100));
  const habitScore = Math.round(
    consistencyScore * 0.4 + waterCompliancePct * 0.3 + proteinCompliancePct * 0.3
  );

  let insightSentence = 'Konsistensi pola makanmu sangat baik minggu ini. Pertahankan hidrasi harian!';
  if (habitScore >= 85) {
    insightSentence = 'Luar biasa! Konsistensi gizi dan hidrasimu berada di tingkat optimal minggu ini 🎉.';
  } else if (habitScore >= 60) {
    insightSentence = 'Pola kebiasaanmu stabil. Coba tambahkan 1 gelas air lagi untuk hidrasi maksimal.';
  } else {
    insightSentence = 'Awal yang baik! Catat makanan dan air secara rutin untuk membangun momentum kebiasaan.';
  }

  return {
    habitScore,
    avgDailyCalories,
    waterCompliancePct,
    proteinCompliancePct,
    insightSentence,
  };
}
