enum HungerCheckAnswer { hungry, unsure, notHungry }

enum HungerSignal { physical, specificCraving, emotion }

enum EatingIntent { meal, snack }

enum HungerRecommendationKind { meal, smallMeal, snack, water, none }

enum CaloriePlanZone { withinPlan, abovePlan, aboveMaintenance }

class HungerDecisionInput {
  const HungerDecisionInput({
    required this.answer,
    required this.caloriesIn,
    required this.targetCalories,
    this.signal,
    this.intent,
    this.maintenanceCalories,
    this.waterGlasses = 0,
    this.snackCount = 0,
    this.hoursSinceLastMeal = 0,
  });

  final HungerCheckAnswer answer;
  final HungerSignal? signal;
  final EatingIntent? intent;
  final num caloriesIn;
  final num targetCalories;
  final num? maintenanceCalories;
  final num waterGlasses;
  final num snackCount;
  final num hoursSinceLastMeal;
}

class HungerDecision {
  const HungerDecision({
    required this.kind,
    required this.status,
    required this.headline,
    required this.body,
    required this.remainingCalories,
    required this.overTargetCalories,
    required this.maintenanceCalories,
    required this.maintenanceRemainingCalories,
    required this.overMaintenanceCalories,
    required this.calorieZone,
    required this.comfortThreshold,
    this.maxSuggestedCalories,
  });

  final HungerRecommendationKind kind;
  final String status;
  final String headline;
  final String body;
  final int remainingCalories;
  final int overTargetCalories;
  final int maintenanceCalories;
  final int maintenanceRemainingCalories;
  final int overMaintenanceCalories;
  final CaloriePlanZone calorieZone;
  final int comfortThreshold;
  final int? maxSuggestedCalories;
}

HungerDecision decideHunger(HungerDecisionInput input) {
  final caloriesIn = _safeNumber(input.caloriesIn).round();
  final targetCalories = _safeNumber(
    input.targetCalories,
    fallback: 1,
  ).clamp(1, 1000000).round();
  final maintenanceCalories = _safeNumber(
    input.maintenanceCalories ?? targetCalories,
    fallback: targetCalories.toDouble(),
  ).clamp(1, 1000000).round();
  final snackCount = _safeNumber(input.snackCount).floor();
  final waterGlasses = _safeNumber(input.waterGlasses).floor();
  final hoursSinceLastMeal = _safeNumber(input.hoursSinceLastMeal);
  final hydrationMet = waterGlasses >= 8;
  final remainingCalories = targetCalories - caloriesIn;
  final overTargetCalories = (-remainingCalories).clamp(0, 1000000);
  final maintenanceRemainingCalories = (maintenanceCalories - caloriesIn).clamp(
    0,
    1000000,
  );
  final overMaintenanceCalories = (caloriesIn - maintenanceCalories).clamp(
    0,
    1000000,
  );
  final calorieZone = caloriesIn > maintenanceCalories
      ? CaloriePlanZone.aboveMaintenance
      : caloriesIn > targetCalories
      ? CaloriePlanZone.abovePlan
      : CaloriePlanZone.withinPlan;
  final availableCalories = remainingCalories.clamp(0, 1000000);
  final comfortThreshold = (targetCalories * 0.15).clamp(250, 1000000).round();
  final context = _calorieContext(
    zone: calorieZone,
    remainingCalories: remainingCalories.clamp(0, 1000000),
    overTargetCalories: overTargetCalories,
    maintenanceRemainingCalories: maintenanceRemainingCalories,
    overMaintenanceCalories: overMaintenanceCalories,
  );

  HungerDecision build({
    required HungerRecommendationKind kind,
    required String status,
    required String headline,
    required String body,
    int? maxSuggestedCalories,
  }) {
    return HungerDecision(
      kind: kind,
      status: status,
      headline: headline,
      body: body,
      remainingCalories: remainingCalories,
      overTargetCalories: overTargetCalories,
      maintenanceCalories: maintenanceCalories,
      maintenanceRemainingCalories: maintenanceRemainingCalories,
      overMaintenanceCalories: overMaintenanceCalories,
      calorieZone: calorieZone,
      comfortThreshold: comfortThreshold,
      maxSuggestedCalories: maxSuggestedCalories,
    );
  }

  HungerDecision pause({
    required String status,
    required String headline,
    required String body,
    int? maxSuggestedCalories,
  }) {
    return build(
      kind: hydrationMet
          ? HungerRecommendationKind.none
          : HungerRecommendationKind.water,
      status: status,
      headline: hydrationMet ? 'Beri jeda sebentar.' : headline,
      body: hydrationMet
          ? '$context Air hari ini sudah cukup. Beri jeda 10 menit tanpa menambah minum, lalu rasakan kembali apakah laparnya masih ada.'
          : body,
      maxSuggestedCalories: maxSuggestedCalories,
    );
  }

  if (input.answer == HungerCheckAnswer.notHungry) {
    return build(
      kind: HungerRecommendationKind.none,
      status: 'TIDAK LAPAR',
      headline: calorieZone == CaloriePlanZone.withinPlan
          ? 'Belum lapar—tidak perlu makan.'
          : 'Belum lapar, jadi tidak perlu dipaksa.',
      body:
          'Kamu tidak harus makan sekarang. $context Check-in lagi saat lapar muncul.',
    );
  }

  if (input.answer == HungerCheckAnswer.unsure ||
      input.signal == HungerSignal.specificCraving ||
      input.signal == HungerSignal.emotion) {
    return pause(
      status: 'JEDA',
      headline: 'Coba minum dulu.',
      body:
          '$context Minum satu gelas air, beri jeda 10 menit, lalu rasakan kembali.',
    );
  }

  if (input.signal != HungerSignal.physical) {
    return pause(
      status: 'CEK LAGI',
      headline: 'Ambil jeda sebentar.',
      body:
          '$context Tarik napas, minum air, lalu pilih berdasarkan sinyal tubuhmu.',
    );
  }

  if (hoursSinceLastMeal > 0 && hoursSinceLastMeal < 1.5) {
    final minutesSinceMeal = (hoursSinceLastMeal * 60).round().clamp(1, 89);
    return build(
      kind: hydrationMet
          ? HungerRecommendationKind.none
          : HungerRecommendationKind.water,
      status: 'BARU SAJA MAKAN',
      headline: 'Beri tubuh waktu sebentar.',
      body:
          '$context Catatan makan terakhir sekitar '
          '${_formatInt(minutesSinceMeal)} menit lalu. '
          '${hydrationMet ? 'Air hari ini sudah cukup.' : 'Minum hanya jika memang haus.'} '
          'Beri jeda 10–15 menit; jika tetap lapar secara fisik, pilih porsi kecil yang mengenyangkan.',
      maxSuggestedCalories: 150,
    );
  }

  if (calorieZone == CaloriePlanZone.aboveMaintenance) {
    return pause(
      status: 'PERKIRAAN HARIAN TERLEWATI',
      headline: 'Mulai dengan satu gelas air.',
      body:
          '$context Jika 10 menit lagi kamu masih lapar secara fisik, pilih makanan kecil yang mengenyangkan dan tetap catat.',
      maxSuggestedCalories: 150,
    );
  }

  if (calorieZone == CaloriePlanZone.abovePlan || availableCalories <= 0) {
    return build(
      kind: input.intent == EatingIntent.snack
          ? HungerRecommendationKind.snack
          : HungerRecommendationKind.smallMeal,
      status: 'LAPAR FISIK',
      headline: 'Masih lapar? Pilih porsi kecil.',
      body:
          '$context Rencana makan tetap menjadi panduan. Jika laparnya fisik, pilih porsi kecil tinggi protein atau serat sekitar 150 kkal, lalu berhenti saat cukup.',
      maxSuggestedCalories: 150,
    );
  }

  if (input.intent == EatingIntent.snack) {
    final maxSuggested = availableCalories.clamp(0, 200);
    final nearLimit = remainingCalories < comfortThreshold || snackCount >= 2;
    return build(
      kind: HungerRecommendationKind.snack,
      status: nearLimit ? 'PORSI KECIL' : 'SNACK OK',
      headline: nearLimit
          ? 'Boleh ngemil secukupnya.'
          : 'Jika lapar, ngemil secukupnya.',
      body: nearLimit
          ? '$context Pilih snack berprotein atau berserat, sekitar ${_formatInt(maxSuggested)} kkal atau kurang.'
          : '$context Jika laparnya fisik, jaga porsi sekitar ${_formatInt(maxSuggested)} kkal dan makan perlahan.',
      maxSuggestedCalories: maxSuggested,
    );
  }

  if (availableCalories < comfortThreshold) {
    final maxSuggested = availableCalories.clamp(0, 300);
    return build(
      kind: HungerRecommendationKind.smallMeal,
      status: 'MAKAN RINGAN',
      headline: 'Pilih porsi yang cukup.',
      body:
          '$context Pilih porsi kecil tinggi protein atau serat, sekitar ${_formatInt(maxSuggested)} kkal.',
      maxSuggestedCalories: maxSuggested,
    );
  }

  final timeHint = hoursSinceLastMeal >= 4
      ? ' Sudah lebih dari empat jam sejak catatan makan terakhir.'
      : '';
  return build(
    kind: HungerRecommendationKind.meal,
    status: 'LAPAR FISIK',
    headline: 'Kamu boleh makan.',
    body:
        '$context$timeHint Pilih makanan utuh yang mengenyangkan dan berhenti saat cukup.',
    maxSuggestedCalories: availableCalories,
  );
}

String _calorieContext({
  required CaloriePlanZone zone,
  required int remainingCalories,
  required int overTargetCalories,
  required int maintenanceRemainingCalories,
  required int overMaintenanceCalories,
}) {
  return switch (zone) {
    CaloriePlanZone.aboveMaintenance =>
      'Asupan hari ini sekitar ${_formatInt(overMaintenanceCalories)} kkal melebihi perkiraan kebutuhan sampai malam.',
    CaloriePlanZone.abovePlan =>
      'Rencana makan terlewati sekitar ${_formatInt(overTargetCalories)} kkal, tetapi masih sekitar ${_formatInt(maintenanceRemainingCalories)} kkal di bawah perkiraan kebutuhan sampai malam.',
    CaloriePlanZone.withinPlan =>
      'Asupan masih sekitar ${_formatInt(remainingCalories)} kkal di bawah batas rencana diet hari ini. Angka ini tidak perlu dihabiskan.',
  };
}

double _safeNumber(num value, {double fallback = 0}) {
  if (!value.isFinite) return fallback;
  return value.toDouble().clamp(0, 1000000);
}

String _formatInt(int value) {
  final digits = value.abs().toString();
  final result = StringBuffer();
  for (var index = 0; index < digits.length; index++) {
    if (index > 0 && (digits.length - index) % 3 == 0) result.write('.');
    result.write(digits[index]);
  }
  return value < 0 ? '-$result' : result.toString();
}
