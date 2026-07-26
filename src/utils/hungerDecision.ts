export type HungerCheckAnswer = 'hungry' | 'unsure' | 'not_hungry';
export type HungerSignal = 'physical' | 'specific_craving' | 'emotion' | null;
export type EatingIntent = 'meal' | 'snack' | null;
export type HungerRecommendationKind = 'meal' | 'small_meal' | 'snack' | 'water' | 'none';
export type CaloriePlanZone =
  | 'within_plan'
  | 'above_plan'
  | 'above_maintenance';

export interface HungerDecisionInput {
  answer: HungerCheckAnswer;
  signal: HungerSignal;
  intent: EatingIntent;
  caloriesIn: number;
  targetCalories: number;
  maintenanceCalories?: number;
  snackCount?: number;
  fastingHours?: number;
}

export interface HungerDecision {
  kind: HungerRecommendationKind;
  status: string;
  headline: string;
  body: string;
  remainingCalories: number;
  overTargetCalories: number;
  maintenanceCalories: number;
  maintenanceRemainingCalories: number;
  overMaintenanceCalories: number;
  calorieZone: CaloriePlanZone;
  comfortThreshold: number;
  maxSuggestedCalories?: number;
}

const safeNumber = (value: number, fallback = 0) => {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
};

const calorieContext = (
  calorieZone: CaloriePlanZone,
  remainingCalories: number,
  overTargetCalories: number,
  maintenanceRemainingCalories: number,
  overMaintenanceCalories: number
) => {
  if (calorieZone === 'above_maintenance') {
    return `Asupan hari ini sekitar ${overMaintenanceCalories.toLocaleString('id-ID')} kkal melebihi perkiraan kebutuhan harian.`;
  }

  if (calorieZone === 'above_plan') {
    return `Rencana makan terlewati sekitar ${overTargetCalories.toLocaleString('id-ID')} kkal, tetapi masih sekitar ${maintenanceRemainingCalories.toLocaleString('id-ID')} kkal di bawah perkiraan kebutuhan harian.`;
  }

  return `Masih ada sekitar ${remainingCalories.toLocaleString('id-ID')} kkal dalam rencana makan hari ini.`;
};

/**
 * A deterministic, non-medical decision helper.
 *
 * The user's body signal decides whether hunger may be physical. Calorie data only
 * shapes the next action; it never claims to diagnose hunger or forbids food.
 */
export function decideHunger(input: HungerDecisionInput): HungerDecision {
  const caloriesIn = safeNumber(input.caloriesIn);
  const targetCalories = Math.max(1, safeNumber(input.targetCalories, 1));
  const maintenanceCalories = Math.max(
    targetCalories,
    safeNumber(input.maintenanceCalories ?? targetCalories, targetCalories)
  );
  const snackCount = Math.floor(safeNumber(input.snackCount ?? 0));
  const fastingHours = safeNumber(input.fastingHours ?? 0);
  const remainingCalories = Math.round(targetCalories - caloriesIn);
  const overTargetCalories = Math.max(0, -remainingCalories);
  const maintenanceRemainingCalories = Math.max(
    0,
    Math.round(maintenanceCalories - caloriesIn)
  );
  const overMaintenanceCalories = Math.max(
    0,
    Math.round(caloriesIn - maintenanceCalories)
  );
  const calorieZone: CaloriePlanZone =
    caloriesIn > maintenanceCalories
      ? 'above_maintenance'
      : caloriesIn > targetCalories
        ? 'above_plan'
        : 'within_plan';
  const availableCalories =
    remainingCalories > 0
      ? remainingCalories
      : maintenanceRemainingCalories;
  const comfortThreshold = Math.round(Math.max(250, targetCalories * 0.15));
  const context = calorieContext(
    calorieZone,
    Math.max(0, remainingCalories),
    overTargetCalories,
    maintenanceRemainingCalories,
    overMaintenanceCalories
  );
  const sharedContext = {
    remainingCalories,
    overTargetCalories,
    maintenanceCalories,
    maintenanceRemainingCalories,
    overMaintenanceCalories,
    calorieZone,
    comfortThreshold,
  };

  if (input.answer === 'not_hungry') {
    return {
      kind: 'none',
      status: 'TIDAK LAPAR',
      headline:
        calorieZone === 'within_plan'
          ? 'Belum lapar—ruang makan masih ada.'
          : 'Belum lapar, jadi tidak perlu dipaksa.',
      body: `Kamu tidak harus makan sekarang. ${context} Check-in lagi saat lapar muncul.`,
      ...sharedContext,
    };
  }

  if (
    input.answer === 'unsure' ||
    input.signal === 'specific_craving' ||
    input.signal === 'emotion'
  ) {
    return {
      kind: 'water',
      status: 'JEDA',
      headline: 'Coba minum dulu.',
      body: `${context} Minum satu gelas air, beri jeda 10 menit, lalu rasakan kembali.`,
      ...sharedContext,
    };
  }

  if (input.signal !== 'physical') {
    return {
      kind: 'water',
      status: 'CEK LAGI',
      headline: 'Ambil jeda sebentar.',
      body: `${context} Tarik napas, minum air, lalu pilih berdasarkan sinyal tubuhmu.`,
      ...sharedContext,
    };
  }

  if (calorieZone === 'above_maintenance' || availableCalories <= 0) {
    return {
      kind: 'water',
      status:
        calorieZone === 'above_maintenance'
          ? 'KEBUTUHAN HARIAN TERLEWATI'
          : 'KEBUTUHAN HARIAN TERCAPAI',
      headline: 'Mulai dengan satu gelas air.',
      body: `${context} Jika 10 menit lagi kamu masih lapar secara fisik, pilih makanan kecil yang mengenyangkan dan tetap catat.`,
      ...sharedContext,
      maxSuggestedCalories: 200,
    };
  }

  if (input.intent === 'snack') {
    const maxSuggestedCalories = Math.max(0, Math.min(200, availableCalories));

    if (remainingCalories < comfortThreshold || snackCount >= 2) {
      return {
        kind: 'snack',
        status: 'PORSI KECIL',
        headline: 'Boleh ngemil secukupnya.',
        body: `${context} Pilih snack berprotein atau berserat, sekitar ${maxSuggestedCalories.toLocaleString('id-ID')} kkal atau kurang.`,
        ...sharedContext,
        maxSuggestedCalories,
      };
    }

    return {
      kind: 'snack',
      status: 'SNACK OK',
      headline: 'Ada ruang untuk ngemil.',
      body: `${context} Jaga porsinya sekitar ${maxSuggestedCalories.toLocaleString('id-ID')} kkal dan makan perlahan.`,
      ...sharedContext,
      maxSuggestedCalories,
    };
  }

  if (availableCalories < comfortThreshold || calorieZone === 'above_plan') {
    const maxSuggestedCalories = Math.min(availableCalories, 300);
    return {
      kind: 'small_meal',
      status:
        calorieZone === 'above_plan' ? 'DI ATAS RENCANA' : 'MAKAN RINGAN',
      headline:
        calorieZone === 'above_plan'
          ? 'Masih lapar? Pilih porsi kecil.'
          : 'Masih ada sedikit ruang.',
      body: `${context} Pilih porsi kecil tinggi protein atau serat, sekitar ${maxSuggestedCalories.toLocaleString('id-ID')} kkal.`,
      ...sharedContext,
      maxSuggestedCalories,
    };
  }

  const timeHint =
    fastingHours >= 4
      ? ' Sudah lebih dari empat jam sejak catatan makan terakhir.'
      : '';

  return {
    kind: 'meal',
    status: 'LAPAR FISIK',
    headline: 'Kamu boleh makan.',
    body: `${context}${timeHint} Pilih makanan utuh yang mengenyangkan dan berhenti saat cukup.`,
    ...sharedContext,
    maxSuggestedCalories: availableCalories,
  };
}
