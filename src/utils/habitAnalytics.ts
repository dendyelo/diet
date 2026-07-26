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
    label: 'Stres / Penat',
    emoji: '🤯',
    color: '#EF4444',
    description: 'Pelarian emosional saat tekanan kerja atau pikiran lelah.',
  },
  {
    type: 'NONGKRONG',
    label: 'Nongkrong / Sosial',
    emoji: '👥',
    color: '#F59E0B',
    description: 'Tergoda makan/minum manis saat berkumpul bersama teman.',
  },
  {
    type: 'LAPAR_ASLI',
    label: 'Lapar Fisik Asli',
    emoji: '🤤',
    color: '#10B981',
    description: 'Perut memang keroncongan dan tubuh butuh nutrisi riil.',
  },
  {
    type: 'LAPAR_MALAM',
    label: 'Lapar Malam Hari',
    emoji: '🌙',
    color: '#8B5CF6',
    description: 'Cemilan larut malam menjelang atau saat waktu tidur.',
  },
];

/**
 * Get current Fasting Stage based on hours elapsed since last meal
 */
export function getFastingStage(elapsedHours: number): FastingStage {
  for (let i = FASTING_STAGES.length - 1; i >= 0; i--) {
    if (elapsedHours >= FASTING_STAGES[i].minHours) {
      return FASTING_STAGES[i];
    }
  }
  return FASTING_STAGES[0];
}

/**
 * Format elapsed seconds into HH:MM:SS
 */
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

/**
 * Aggregate snacking trigger statistics
 */
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
