import 'ai_models.dart';
import 'package:diet/domain/calculators/activity_calculator.dart';

final class LocalEstimateUnavailable implements Exception {
  const LocalEstimateUnavailable(this.message);

  final String message;

  @override
  String toString() => message;
}

MealAnalysis estimateMealLocally(String input) {
  final cleanInput = input.replaceAll(RegExp(r'\s+'), ' ').trim();
  final rawParts = cleanInput
      .split(RegExp(r',|\+|\bdan\b|\bpake\b', caseSensitive: false))
      .map((part) => part.trim())
      .where((part) => part.isNotEmpty)
      .toList(growable: false);

  final items = <MealItemEstimate>[];
  var calories = 0.0;
  var protein = 0.0;
  var carbs = 0.0;
  var fat = 0.0;
  var fiber = 0.0;

  for (final part in rawParts) {
    final food = _matchFood(part);
    if (food == null) {
      throw LocalEstimateUnavailable(
        'Bagian "$part" belum dikenali oleh estimasi lokal.',
      );
    }
    final quantity = _quantity(part);
    final itemCalories = food.calories * quantity;
    items.add(
      MealItemEstimate(
        name: quantity == 1 ? food.name : '${_format(quantity)} × ${food.name}',
        calories: itemCalories.roundToDouble(),
      ),
    );
    calories += itemCalories;
    protein += food.protein * quantity;
    carbs += food.carbs * quantity;
    fat += food.fat * quantity;
    fiber += food.fiber * quantity;
  }

  if (items.isEmpty || calories <= 0) {
    throw const LocalEstimateUnavailable(
      'Makanan belum dikenali oleh estimasi lokal.',
    );
  }

  return MealAnalysis(
    name: cleanInput,
    calories: calories.roundToDouble(),
    proteinGrams: _oneDecimal(protein),
    carbsGrams: _oneDecimal(carbs),
    fatGrams: _oneDecimal(fat),
    fiberGrams: _oneDecimal(fiber),
    confidence: AiConfidence.medium,
    items: items,
    isOnlineAi: false,
    notes:
        'Estimasi lokal memakai porsi standar. Sesuaikan bila ukuran atau cara masaknya berbeda.',
  );
}

ParsedActivity estimateActivityLocally(String input) =>
    ActivityCalculator.parseLocally(input);

final class _FoodPreset {
  const _FoodPreset(
    this.name,
    this.calories,
    this.protein,
    this.carbs,
    this.fat,
    this.fiber,
  );

  final String name;
  final double calories;
  final double protein;
  final double carbs;
  final double fat;
  final double fiber;
}

_FoodPreset? _matchFood(String part) {
  final lower = part.toLowerCase();
  if (lower.contains('pisang goreng')) {
    return const _FoodPreset('Pisang goreng', 110, 2, 22, 6, 2);
  }
  if (lower.contains('telur')) {
    final fried =
        lower.contains('goreng') ||
        lower.contains('dadar') ||
        lower.contains('ceplok');
    return fried
        ? const _FoodPreset('Telur goreng', 110, 7, 1, 8, 0)
        : const _FoodPreset('Telur rebus', 78, 7, 1, 5, 0);
  }
  if (lower.contains('nasi uduk') || lower.contains('nasi kuning')) {
    return const _FoodPreset('Nasi uduk/kuning', 260, 5, 46, 7, 2);
  }
  if (lower.contains('nasi')) {
    final half = lower.contains('setengah') || lower.contains('sedikit');
    return half
        ? const _FoodPreset('Setengah porsi nasi', 100, 2, 22, 0.5, 0.5)
        : const _FoodPreset('Nasi putih', 200, 4, 44, 1, 1);
  }
  if (lower.contains('ayam')) {
    if (lower.contains('geprek') || lower.contains('crispy')) {
      return const _FoodPreset('Ayam crispy', 320, 24, 15, 18, 1);
    }
    if (lower.contains('bakar')) {
      return const _FoodPreset('Ayam bakar', 230, 26, 2, 10, 0);
    }
    return const _FoodPreset('Ayam goreng', 260, 24, 2, 14, 0);
  }
  if (lower.contains('tahu')) {
    return const _FoodPreset('Tahu', 90, 6, 8, 5, 1);
  }
  if (lower.contains('tempe')) {
    return const _FoodPreset('Tempe', 90, 6, 8, 5, 2);
  }
  if (lower.contains('bakso')) {
    return const _FoodPreset('Bakso', 320, 18, 24, 12, 2);
  }
  if (lower.contains('soto') || lower.contains('sop')) {
    final coconut = lower.contains('betawi') || lower.contains('santan');
    return coconut
        ? const _FoodPreset('Soto santan', 450, 22, 18, 26, 2)
        : const _FoodPreset('Soto/sop bening', 310, 22, 18, 10, 2);
  }
  if (lower.contains('gado') || lower.contains('pecel')) {
    return const _FoodPreset('Gado-gado/pecel', 310, 12, 30, 14, 7);
  }
  if (lower.contains('rendang')) {
    return const _FoodPreset('Rendang', 250, 20, 6, 17, 1);
  }
  if (lower.contains('sayur') ||
      lower.contains('lalap') ||
      lower.contains('timun')) {
    return const _FoodPreset('Sayur/lalapan', 35, 2, 7, 0, 3);
  }
  if (lower.contains('ikan')) {
    final fried = lower.contains('goreng');
    return fried
        ? const _FoodPreset('Ikan goreng', 240, 26, 1, 14, 0)
        : const _FoodPreset('Ikan bakar/kukus', 180, 26, 1, 8, 0);
  }
  if (lower.contains('mie') || lower.contains('mi ')) {
    final fried = lower.contains('goreng');
    return fried
        ? const _FoodPreset('Mi goreng', 420, 10, 58, 17, 3)
        : const _FoodPreset('Mi rebus', 350, 10, 52, 12, 3);
  }
  if (lower.contains('roti')) {
    return const _FoodPreset('Roti', 80, 3, 15, 1, 1);
  }
  if (lower.contains('susu')) {
    return const _FoodPreset('Susu 250 ml', 150, 8, 12, 8, 0);
  }
  if (lower.contains('kopi manis') || lower.contains('es teh manis')) {
    return const _FoodPreset('Minuman manis', 180, 1, 42, 2, 0);
  }
  return null;
}

double _quantity(String value) {
  final lower = value.toLowerCase();
  if (lower.contains('setengah') || lower.contains('1/2')) return 0.5;
  final match = RegExp(
    r'\b(\d+(?:[.,]\d+)?)\s*(?:butir|potong|biji|buah|pcs|porsi|lembar|centong)?\b',
  ).firstMatch(lower);
  final parsed = double.tryParse(match?.group(1)?.replaceAll(',', '.') ?? '');
  if (parsed == null || parsed <= 0 || parsed > 20) return 1;
  return parsed;
}

String _format(double value) =>
    value == value.roundToDouble() ? '${value.round()}' : '$value';

double _oneDecimal(double value) => (value * 10).round() / 10;
