import { ActivityStepOverlap } from '../types';

export interface ParsedActivity {
  name: string;
  durationMinutes: number;
  met: number;
  stepOverlap: ActivityStepOverlap;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
  source: 'ai' | 'local';
}

const ACTIVITY_PRESETS: Array<{
  patterns: RegExp;
  name: string;
  met: number;
  stepOverlap: ActivityStepOverlap;
}> = [
  { patterns: /(?:jalan|walking).{0,20}treadmill|treadmill.{0,20}(?:jalan|walking)/i, name: 'Berjalan di treadmill', met: 3.8, stepOverlap: 'high' },
  { patterns: /(?:lari|berlari|jogging|running).{0,20}treadmill|treadmill.{0,20}(?:lari|berlari|jogging|running)/i, name: 'Lari di treadmill', met: 7, stepOverlap: 'high' },
  { patterns: /treadmill/i, name: 'Treadmill intensitas sedang', met: 5, stepOverlap: 'high' },
  { patterns: /lari|berlari|jogging|running/i, name: 'Jogging', met: 7, stepOverlap: 'high' },
  { patterns: /sepak ?bola|futsal|football|soccer/i, name: 'Sepak bola', met: 7, stepOverlap: 'medium' },
  { patterns: /sepeda|bersepeda|cycling/i, name: 'Bersepeda', met: 6.8, stepOverlap: 'low' },
  { patterns: /renang|berenang|swimming/i, name: 'Berenang', met: 6, stepOverlap: 'low' },
  { patterns: /angkat beban|gym|strength|fitness/i, name: 'Latihan kekuatan', met: 5, stepOverlap: 'low' },
  { patterns: /jalan|berjalan|walking/i, name: 'Berjalan', met: 3.8, stepOverlap: 'high' },
  { patterns: /yoga|pilates|stretching/i, name: 'Yoga atau peregangan', met: 2.8, stepOverlap: 'low' },
];

export function extractDurationMinutes(text: string): number {
  const hourMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:jam|hour|hours)/i);
  const minuteMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:menit|min|minute|minutes)/i);
  const hours = hourMatch ? Number(hourMatch[1].replace(',', '.')) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1].replace(',', '.')) : 0;
  const total = Math.round(hours * 60 + minutes);
  return Math.min(720, Math.max(1, total || 30));
}

export function parseActivityLocally(text: string): ParsedActivity {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const preset =
    ACTIVITY_PRESETS.find((item) => item.patterns.test(cleanText)) ??
    {
      name: 'Aktivitas fisik',
      met: 4,
      stepOverlap: 'medium' as const,
    };

  return {
    name: preset.name,
    durationMinutes: extractDurationMinutes(cleanText),
    met: preset.met,
    stepOverlap: preset.stepOverlap,
    confidence: preset.name === 'Aktivitas fisik' ? 'low' : 'medium',
    notes:
      preset.name === 'Aktivitas fisik'
        ? 'Jenis atau intensitas aktivitas belum cukup jelas.'
        : preset.name === 'Treadmill intensitas sedang'
          ? 'Kecepatan treadmill tidak disebutkan, jadi digunakan intensitas sedang yang konservatif.'
          : 'Estimasi lokal berdasarkan jenis dan durasi aktivitas.',
    source: 'local',
  };
}

/**
 * Returns calories above resting energy. Resting calories are excluded because
 * the app already accrues BMR throughout the day.
 */
export function calculateNetActivityCalories(
  weightKg: number,
  durationMinutes: number,
  met: number
): number {
  const safeWeight = Math.min(250, Math.max(30, Number(weightKg) || 70));
  const safeDuration = Math.min(720, Math.max(1, Number(durationMinutes) || 1));
  const safeMet = Math.min(20, Math.max(1, Number(met) || 1));
  return Math.round(
    Math.max(0, (safeMet - 1) * 3.5 * safeWeight * safeDuration / 200)
  );
}

export function calculateCreditedActivityCalories(
  estimatedCalories: number,
  stepOverlap: ActivityStepOverlap,
  stepBonusCalories: number
): number {
  const safeEstimate = Math.round(Math.max(0, estimatedCalories));
  const overlapFactor =
    stepOverlap === 'high' ? 1 : stepOverlap === 'medium' ? 0.5 : 0;
  const actualStepOverlap = Math.min(
    safeEstimate,
    Math.max(0, stepBonusCalories) * overlapFactor
  );
  return Math.round(safeEstimate - actualStepOverlap);
}

export function calculateNarratedActivityCalories(
  activities: Array<{
    estimatedCalories: number;
    stepOverlap: ActivityStepOverlap;
  }>,
  stepBonusCalories: number
): number {
  const totalEstimated = activities.reduce(
    (total, activity) => total + Math.max(0, activity.estimatedCalories),
    0
  );
  const overlapCapacity = activities.reduce((total, activity) => {
    const factor =
      activity.stepOverlap === 'high'
        ? 1
        : activity.stepOverlap === 'medium'
          ? 0.5
          : 0;
    return total + Math.max(0, activity.estimatedCalories) * factor;
  }, 0);
  return Math.round(
    Math.max(
      0,
      totalEstimated - Math.min(Math.max(0, stepBonusCalories), overlapCapacity)
    )
  );
}
