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
  { patterns: /lari|berlari|jogging|treadmill/i, name: 'Lari atau treadmill', met: 8.3, stepOverlap: 'high' },
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
  sensorConnected: boolean
): number {
  if (!sensorConnected) return Math.round(Math.max(0, estimatedCalories));

  const creditFactor =
    stepOverlap === 'high' ? 0.35 : stepOverlap === 'medium' ? 0.7 : 1;
  return Math.round(Math.max(0, estimatedCalories) * creditFactor);
}
