import '../models/models.dart';

class ActivitySummary {
  const ActivitySummary({
    required this.steps,
    required this.baselineSteps,
    required this.stepGoal,
    required this.bonusSteps,
    required this.stepCalories,
    required this.creditedStepCalories,
    required this.baseMaintenanceCalories,
    required this.projectedCaloriesOut,
    required this.stepProgressPercent,
  });

  final int steps;
  final int baselineSteps;
  final int stepGoal;
  final int bonusSteps;

  /// Estimate for all steps, shown as context but not added in full because
  /// ordinary movement is already represented by the activity profile.
  final int stepCalories;

  /// Calories from steps beyond the profile baseline. This is the only step
  /// amount added to today's energy expenditure.
  final int creditedStepCalories;
  final int baseMaintenanceCalories;
  final int projectedCaloriesOut;
  final int stepProgressPercent;
}

class EnergyBalance {
  const EnergyBalance({
    required this.dailyBmr,
    required this.dailyTdee,
    required this.dietTargetCalories,
    required this.effectiveDeficit,
    required this.elapsedBmr,
    required this.elapsedBaseCaloriesOut,
    required this.elapsedDayPercent,
    required this.stepCalories,
    required this.creditedStepCalories,
    required this.narratedActivityCalories,
    required this.activityCalories,
    required this.totalCaloriesOut,
    required this.projectedCaloriesOut,
    required this.totalCaloriesIn,
    required this.currentNetBalance,
    required this.projectedNetBalance,
    required this.remainingToDietTarget,
    required this.dietTargetProgressPercent,
    required this.baselineSteps,
    required this.bonusSteps,
    required this.stepGoal,
    required this.stepProgressPercent,
  });

  final int dailyBmr;

  /// Base full-day projection derived from profile data only.
  final int dailyTdee;

  /// Fixed eating plan: base TDEE minus the effective deficit. It never grows
  /// when steps or workouts are added.
  final int dietTargetCalories;
  final int effectiveDeficit;

  final int elapsedBmr;
  final int elapsedBaseCaloriesOut;
  final int elapsedDayPercent;
  final int stepCalories;
  final int creditedStepCalories;
  final int narratedActivityCalories;
  final int activityCalories;

  /// Energy actually accrued so far, including credited steps and workouts.
  final int totalCaloriesOut;

  /// Base TDEE plus credited steps and workouts, useful as a full-day marker.
  final int projectedCaloriesOut;
  final int totalCaloriesIn;

  /// Positive means more energy has gone out than in so far.
  final int currentNetBalance;

  /// Positive means projected daily expenditure is above current intake.
  final int projectedNetBalance;

  /// Can be negative when the fixed diet plan has been exceeded.
  final int remainingToDietTarget;
  final int dietTargetProgressPercent;
  final int baselineSteps;
  final int bonusSteps;
  final int stepGoal;
  final int stepProgressPercent;

  bool get isCurrentDeficit => currentNetBalance >= 0;
  bool get isAboveDietTarget => remainingToDietTarget < 0;
  int get caloriesOverDietTarget =>
      isAboveDietTarget ? -remainingToDietTarget : 0;
}

abstract final class CalorieCalculator {
  static const Map<ActivityLevel, double> activityMultipliers = {
    ActivityLevel.sedentary: 1.2,
    ActivityLevel.light: 1.375,
    ActivityLevel.moderate: 1.55,
    ActivityLevel.active: 1.725,
    ActivityLevel.veryActive: 1.9,
  };

  static const Map<ActivityLevel, int> activityStepBaselines = {
    ActivityLevel.sedentary: 3000,
    ActivityLevel.light: 5000,
    ActivityLevel.moderate: 7500,
    ActivityLevel.active: 9000,
    ActivityLevel.veryActive: 11000,
  };

  static const Map<ActivityLevel, int> activityStepGoals = {
    ActivityLevel.sedentary: 6000,
    ActivityLevel.light: 7500,
    ActivityLevel.moderate: 9000,
    ActivityLevel.active: 11000,
    ActivityLevel.veryActive: 13000,
  };

  static const Map<BodyResponse, double> bodyResponseMultipliers = {
    BodyResponse.easyGain: 0.95,
    BodyResponse.normal: 1,
    BodyResponse.hardGain: 1.05,
  };

  /// Mifflin–St Jeor BMR for 24 hours.
  ///
  /// Body response is intentionally excluded because it is a self-reported
  /// context rather than a measured physiological input.
  static int calculateBmr(UserProfile profile) {
    final weight = _validRange(profile.weightKg, 30, 250, 70);
    final height = _validRange(profile.heightCm, 100, 230, 170);
    final age = _validRange(profile.age.toDouble(), 10, 100, 26);
    final base = (10 * weight) + (6.25 * height) - (5 * age);
    final raw = (base + (profile.gender == Gender.male ? 5 : -161)).round();
    return raw.clamp(900, 2800);
  }

  static int calculateTdee(UserProfile profile) {
    return (calculateBmr(profile) *
            activityMultipliers[profile.activityLevel]! *
            bodyResponseMultipliers[profile.bodyResponse]!)
        .round();
  }

  static int calculateEffectiveDeficit(
    UserProfile profile, [
    int? maintenanceCalories,
  ]) {
    if (profile.isCheatDay || profile.targetWeightKg >= profile.weightKg) {
      return 0;
    }
    final maintenance = (maintenanceCalories ?? calculateTdee(profile)).clamp(
      0,
      100000,
    );
    final requested = profile.targetDeficitKcal.clamp(100, 1000);
    return requested.clamp(0, (maintenance - 1200).clamp(0, 100000));
  }

  /// Fixed eating target based only on profile TDEE and the selected deficit.
  ///
  /// Steps and logged exercise never increase this number. They are represented
  /// on the output side of [calculateEnergyBalance].
  static int calculateDietTarget(UserProfile profile) {
    final tdee = calculateTdee(profile);
    return (tdee - calculateEffectiveDeficit(profile, tdee)).clamp(
      1200,
      100000,
    );
  }

  static int calculateTargetProtein(UserProfile profile) {
    final weight = _validRange(profile.weightKg, 30, 250, 70);
    return (weight * 1.5).round();
  }

  static int calculateElapsedCalories(int dailyCalories, DateTime at) {
    final safeDaily = dailyCalories.clamp(0, 100000);
    final elapsedSeconds =
        (at.hour * Duration.secondsPerHour) +
        (at.minute * Duration.secondsPerMinute) +
        at.second;
    final fraction = (elapsedSeconds / Duration.secondsPerDay).clamp(0, 1);
    return (safeDaily * fraction).round();
  }

  static int calculateStepCalories(int steps, double weightKg) {
    if (steps <= 0) return 0;
    final safeSteps = steps.clamp(0, 1000000);
    final weight = _validRange(weightKg, 30, 250, 70);
    return (safeSteps * weight * 0.00041).round();
  }

  static ActivitySummary calculateActivitySummary(
    UserProfile profile,
    int steps,
  ) {
    final safeSteps = steps.clamp(0, 1000000);
    final baseline = activityStepBaselines[profile.activityLevel]!;
    final stepGoal = activityStepGoals[profile.activityLevel]!;
    final bonusSteps = (safeSteps - baseline).clamp(0, 1000000);
    final stepCalories = calculateStepCalories(safeSteps, profile.weightKg);
    final credited = calculateStepCalories(bonusSteps, profile.weightKg);
    final baseMaintenance = calculateTdee(profile);
    return ActivitySummary(
      steps: safeSteps,
      baselineSteps: baseline,
      stepGoal: stepGoal,
      bonusSteps: bonusSteps,
      stepCalories: stepCalories,
      creditedStepCalories: credited,
      baseMaintenanceCalories: baseMaintenance,
      projectedCaloriesOut: baseMaintenance + credited,
      stepProgressPercent: ((safeSteps / stepGoal) * 100).round().clamp(0, 100),
    );
  }

  static EnergyBalance calculateEnergyBalance({
    required UserProfile profile,
    required num totalCaloriesIn,
    required int steps,
    required DateTime at,
    int narratedActivityCalories = 0,
  }) {
    final safeCaloriesIn = _nonNegativeRounded(totalCaloriesIn);
    final safeNarratedActivity = narratedActivityCalories.clamp(0, 100000);
    final dailyBmr = calculateBmr(profile);
    final dailyTdee = calculateTdee(profile);
    final dietTarget = calculateDietTarget(profile);
    final effectiveDeficit = calculateEffectiveDeficit(profile, dailyTdee);
    final elapsedBmr = calculateElapsedCalories(dailyBmr, at);
    final elapsedBase = calculateElapsedCalories(dailyTdee, at);
    final activity = calculateActivitySummary(profile, steps);
    final creditedStepCalories = activity.creditedStepCalories;
    final totalCaloriesOut =
        elapsedBase + creditedStepCalories + safeNarratedActivity;
    final projectedCaloriesOut =
        dailyTdee + creditedStepCalories + safeNarratedActivity;
    final activityCalories =
        (elapsedBase - elapsedBmr).clamp(0, 100000) +
        creditedStepCalories +
        safeNarratedActivity;
    final remainingToDietTarget = dietTarget - safeCaloriesIn;
    final progress = ((safeCaloriesIn / dietTarget) * 100).round().clamp(
      0,
      999,
    );

    return EnergyBalance(
      dailyBmr: dailyBmr,
      dailyTdee: dailyTdee,
      dietTargetCalories: dietTarget,
      effectiveDeficit: effectiveDeficit,
      elapsedBmr: elapsedBmr,
      elapsedBaseCaloriesOut: elapsedBase,
      elapsedDayPercent: ((totalCaloriesOut / projectedCaloriesOut) * 100)
          .round()
          .clamp(0, 100),
      stepCalories: activity.stepCalories,
      creditedStepCalories: creditedStepCalories,
      narratedActivityCalories: safeNarratedActivity,
      activityCalories: activityCalories,
      totalCaloriesOut: totalCaloriesOut,
      projectedCaloriesOut: projectedCaloriesOut,
      totalCaloriesIn: safeCaloriesIn,
      currentNetBalance: totalCaloriesOut - safeCaloriesIn,
      projectedNetBalance: projectedCaloriesOut - safeCaloriesIn,
      remainingToDietTarget: remainingToDietTarget,
      dietTargetProgressPercent: progress,
      baselineSteps: activity.baselineSteps,
      bonusSteps: activity.bonusSteps,
      stepGoal: activity.stepGoal,
      stepProgressPercent: activity.stepProgressPercent,
    );
  }

  static double _validRange(
    double value,
    double minimum,
    double maximum,
    double fallback,
  ) {
    if (!value.isFinite || value < minimum || value > maximum) return fallback;
    return value;
  }

  static int _nonNegativeRounded(num value) {
    if (!value.isFinite) return 0;
    return value.round().clamp(0, 1000000);
  }
}
