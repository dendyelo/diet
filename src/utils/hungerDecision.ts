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
  waterGlasses?: number;
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
    return `Asupan hari ini sekitar ${overMaintenanceCalories.toLocaleString('id-ID')} kkal melebihi perkiraan kebutuhan sampai malam.`;
  }

  if (calorieZone === 'above_plan') {
    return `Rencana makan terlewati sekitar ${overTargetCalories.toLocaleString('id-ID')} kkal, tetapi masih sekitar ${maintenanceRemainingCalories.toLocaleString('id-ID')} kkal di bawah perkiraan kebutuhan sampai malam.`;
  }

  return `Asupan masih sekitar ${remainingCalories.toLocaleString('id-ID')} kkal di bawah batas rencana diet hari ini. Angka ini tidak perlu dihabiskan.`;
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
  const waterGlasses = Math.floor(safeNumber(input.waterGlasses ?? 0));
  const hydrationMet = waterGlasses >= 8;
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
  const availableCalories = Math.max(0, remainingCalories);
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
  const pauseInsteadOfWater = (
    status: string,
    headline: string,
    body: string,
    maxSuggestedCalories?: number
  ): HungerDecision => ({
    kind: hydrationMet ? 'none' : 'water',
    status,
    headline: hydrationMet ? 'Beri jeda sebentar.' : headline,
    body: hydrationMet
      ? `${context} Air hari ini sudah cukup. Beri jeda 10 menit tanpa menambah minum, lalu rasakan kembali apakah laparnya masih ada.`
      : body,
    ...sharedContext,
    ...(maxSuggestedCalories ? { maxSuggestedCalories } : {}),
  });

  if (input.answer === 'not_hungry') {
    return {
      kind: 'none',
      status: 'TIDAK LAPAR',
      headline:
        calorieZone === 'within_plan'
          ? 'Belum lapar—tidak perlu makan.'
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
    return pauseInsteadOfWater(
      'JEDA',
      'Coba minum dulu.',
      `${context} Minum satu gelas air, beri jeda 10 menit, lalu rasakan kembali.`
    );
  }

  if (input.signal !== 'physical') {
    return pauseInsteadOfWater(
      'CEK LAGI',
      'Ambil jeda sebentar.',
      `${context} Tarik napas, minum air, lalu pilih berdasarkan sinyal tubuhmu.`
    );
  }

  if (calorieZone === 'above_maintenance') {
    return pauseInsteadOfWater(
      'PERKIRAAN HARIAN TERLEWATI',
      'Mulai dengan satu gelas air.',
      `${context} Jika 10 menit lagi kamu masih lapar secara fisik, pilih makanan kecil yang mengenyangkan dan tetap catat.`,
      150
    );
  }

  if (calorieZone === 'above_plan' || availableCalories <= 0) {
    const maxSuggestedCalories = 150;
    return {
      kind: input.intent === 'snack' ? 'snack' : 'small_meal',
      status: 'LAPAR FISIK',
      headline: 'Masih lapar? Pilih porsi kecil.',
      body: `${context} Rencana makan tetap menjadi panduan. Jika laparnya fisik, pilih porsi kecil tinggi protein atau serat sekitar ${maxSuggestedCalories} kkal, lalu berhenti saat cukup.`,
      ...sharedContext,
      maxSuggestedCalories,
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
      headline: 'Jika lapar, ngemil secukupnya.',
      body: `${context} Jika laparnya fisik, jaga porsi sekitar ${maxSuggestedCalories.toLocaleString('id-ID')} kkal dan makan perlahan.`,
      ...sharedContext,
      maxSuggestedCalories,
    };
  }

  if (availableCalories < comfortThreshold) {
    const maxSuggestedCalories = Math.min(availableCalories, 300);
    return {
      kind: 'small_meal',
      status: 'MAKAN RINGAN',
      headline: 'Pilih porsi yang cukup.',
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
