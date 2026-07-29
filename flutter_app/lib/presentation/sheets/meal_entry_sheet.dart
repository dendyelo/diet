import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../data/ai/ai_models.dart';
import '../../domain/models/models.dart';

typedef MealAnalyzer = Future<MealAnalysis> Function(String description);

class MealEntrySheet extends StatefulWidget {
  const MealEntrySheet({
    required this.onAnalyze,
    required this.onSave,
    this.initialMeal,
    this.recentMeals = const [],
    this.initialSnack = false,
    super.key,
  });

  final MealAnalyzer onAnalyze;
  final Future<void> Function(MealLog meal) onSave;
  final MealLog? initialMeal;
  final List<MealLog> recentMeals;
  final bool initialSnack;

  @override
  State<MealEntrySheet> createState() => _MealEntrySheetState();
}

class _MealEntrySheetState extends State<MealEntrySheet> {
  late bool _isSnack;
  late bool _useAi;
  late final TextEditingController _description;
  late final TextEditingController _name;
  late final TextEditingController _calories;
  late final TextEditingController _protein;
  late final TextEditingController _carbs;
  late final TextEditingController _fat;
  late final TextEditingController _fiber;
  late final TextEditingController _time;
  List<FoodItemBreakdown> _items = const [];
  bool _analyzing = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final meal = widget.initialMeal;
    _isSnack = meal?.isSnack ?? widget.initialSnack;
    _useAi = meal?.source == MealSource.ai || meal == null;
    _description = TextEditingController();
    _name = TextEditingController(text: meal?.name ?? '');
    _calories = TextEditingController(
      text: meal == null ? '' : '${meal.nutrition.calories}',
    );
    _protein = TextEditingController(
      text: meal == null ? '' : _plainNumber(meal.nutrition.proteinGrams),
    );
    _carbs = TextEditingController(
      text: meal == null ? '' : _plainNumber(meal.nutrition.carbsGrams),
    );
    _fat = TextEditingController(
      text: meal == null ? '' : _plainNumber(meal.nutrition.fatGrams),
    );
    _fiber = TextEditingController(
      text: meal == null ? '' : _plainNumber(meal.nutrition.fiberGrams),
    );
    _time = TextEditingController(
      text: _formatTime(meal?.timestamp ?? DateTime.now()),
    );
    _items = meal?.itemsBreakdown ?? const [];
  }

  static String _plainNumber(double value) {
    return value == value.roundToDouble()
        ? '${value.round()}'
        : value.toStringAsFixed(1);
  }

  @override
  void dispose() {
    _description.dispose();
    _name.dispose();
    _calories.dispose();
    _protein.dispose();
    _carbs.dispose();
    _fat.dispose();
    _fiber.dispose();
    _time.dispose();
    super.dispose();
  }

  String _formatTime(DateTime value) {
    final local = value.toLocal();
    return '${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')}';
  }

  DateTime? _parseToday(String text) {
    final match = RegExp(r'^(\d{2}):(\d{2})$').firstMatch(text.trim());
    if (match == null) return null;
    final hour = int.tryParse(match.group(1)!);
    final minute = int.tryParse(match.group(2)!);
    if (hour == null || minute == null || hour > 23 || minute > 59) {
      return null;
    }
    final now = DateTime.now();
    final candidate = DateTime(now.year, now.month, now.day, hour, minute);
    return candidate.isAfter(now) ? null : candidate;
  }

  double _number(TextEditingController controller) {
    return double.tryParse(controller.text.replaceAll(',', '.').trim()) ?? 0;
  }

  Future<void> _pickTime() async {
    final parsed = _parseToday(_time.text) ?? DateTime.now();
    final selected = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(parsed),
      helpText: 'Waktu makan hari ini',
      cancelText: 'Batal',
      confirmText: 'Pilih',
    );
    if (selected == null) return;
    final now = DateTime.now();
    final candidate = DateTime(
      now.year,
      now.month,
      now.day,
      selected.hour,
      selected.minute,
    );
    if (candidate.isAfter(now)) {
      setState(() => _error = 'Waktu makan tidak boleh melewati sekarang.');
      return;
    }
    setState(() {
      _time.text =
          '${selected.hour.toString().padLeft(2, '0')}:'
          '${selected.minute.toString().padLeft(2, '0')}';
      _error = null;
    });
  }

  Future<void> _analyze() async {
    final description = _description.text.trim();
    if (description.isEmpty) {
      setState(() => _error = 'Ceritakan makanan yang ingin dicatat.');
      return;
    }
    setState(() {
      _analyzing = true;
      _error = null;
    });
    try {
      final result = await widget.onAnalyze(description);
      if (!mounted) return;
      setState(() {
        _name.text = result.name;
        _calories.text = '${result.calories.round()}';
        _protein.text = _plainNumber(result.proteinGrams);
        _carbs.text = _plainNumber(result.carbsGrams);
        _fat.text = _plainNumber(result.fatGrams);
        _fiber.text = _plainNumber(result.fiberGrams);
        _items = result.items
            .map(
              (item) => FoodItemBreakdown(
                name: item.name,
                calories: item.calories.round(),
              ),
            )
            .toList(growable: false);
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _error =
              'Analisis belum berhasil. Kamu tetap bisa mengisi angka secara manual.';
        });
      }
    } finally {
      if (mounted) setState(() => _analyzing = false);
    }
  }

  void _applyRecent(MealLog meal) {
    setState(() {
      _name.text = meal.name;
      _calories.text = '${meal.nutrition.calories}';
      _protein.text = _plainNumber(meal.nutrition.proteinGrams);
      _carbs.text = _plainNumber(meal.nutrition.carbsGrams);
      _fat.text = _plainNumber(meal.nutrition.fatGrams);
      _fiber.text = _plainNumber(meal.nutrition.fiberGrams);
      _items = meal.itemsBreakdown;
      _useAi = false;
      _error = null;
    });
  }

  Future<void> _save() async {
    final timestamp = _parseToday(_time.text);
    final calories = _number(_calories).round();
    final name = _name.text.trim();
    if (timestamp == null) {
      setState(() {
        _error = 'Gunakan waktu HH:MM hari ini, tidak melewati sekarang.';
      });
      return;
    }
    if (name.isEmpty || calories <= 0) {
      setState(() {
        _error = 'Nama makanan dan kalori harus diisi.';
      });
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final existing = widget.initialMeal;
    final meal = MealLog(
      id: existing?.id ?? 'meal-${DateTime.now().microsecondsSinceEpoch}',
      timestamp: timestamp,
      name: name,
      isSnack: _isSnack,
      nutrition: NutritionData(
        calories: calories.clamp(1, 20000),
        proteinGrams: _number(_protein).clamp(0, 1000),
        carbsGrams: _number(_carbs).clamp(0, 2000),
        fatGrams: _number(_fat).clamp(0, 1000),
        fiberGrams: _number(_fiber).clamp(0, 500),
      ),
      source: _useAi ? MealSource.ai : MealSource.manual,
      trigger: existing?.trigger,
      itemsBreakdown: _items,
      notes: existing?.notes,
    );
    try {
      await widget.onSave(meal);
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Belum dapat menyimpan. Coba sekali lagi.';
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;
    final title = widget.initialMeal == null ? 'Catat asupan' : 'Edit asupan';

    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      padding: EdgeInsets.only(bottom: keyboard),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.88,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 10, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'AI membantu estimasi, kamu tetap memegang kendali.',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Tutup'),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CupertinoSlidingSegmentedControl<bool>(
                        groupValue: _isSnack,
                        thumbColor: AppColors.surfaceStrong,
                        backgroundColor: AppColors.surfaceElevated,
                        children: const {
                          false: Padding(
                            padding: EdgeInsets.symmetric(horizontal: 28),
                            child: Text('Makan'),
                          ),
                          true: Padding(
                            padding: EdgeInsets.symmetric(horizontal: 28),
                            child: Text('Snack'),
                          ),
                        },
                        onValueChanged: (value) {
                          if (value != null) setState(() => _isSnack = value);
                        },
                      ),
                      const SizedBox(height: 12),
                      CupertinoSlidingSegmentedControl<bool>(
                        groupValue: _useAi,
                        thumbColor: AppColors.surfaceStrong,
                        backgroundColor: AppColors.surfaceElevated,
                        children: const {
                          true: Padding(
                            padding: EdgeInsets.symmetric(horizontal: 34),
                            child: Text('Dengan AI'),
                          ),
                          false: Padding(
                            padding: EdgeInsets.symmetric(horizontal: 34),
                            child: Text('Manual'),
                          ),
                        },
                        onValueChanged: (value) {
                          if (value != null) setState(() => _useAi = value);
                        },
                      ),
                      if (_useAi) ...[
                        const SizedBox(height: 24),
                        _Label('CERITAKAN MAKANAN'),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _description,
                          minLines: 2,
                          maxLines: 4,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _analyze(),
                          decoration: const InputDecoration(
                            hintText:
                                'Contoh: nasi, ayam bakar, tempe, dan lalapan',
                          ),
                        ),
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: _analyzing ? null : _analyze,
                            child: Text(
                              _analyzing ? 'Menganalisis…' : 'Analisis',
                            ),
                          ),
                        ),
                      ],
                      if (widget.recentMeals.isNotEmpty &&
                          widget.initialMeal == null) ...[
                        const SizedBox(height: 24),
                        _Label('TERAKHIR'),
                        const SizedBox(height: 10),
                        SizedBox(
                          height: 42,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: widget.recentMeals.take(5).length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(width: 8),
                            itemBuilder: (context, index) {
                              final meal = widget.recentMeals[index];
                              return ActionChip(
                                label: Text(meal.name),
                                onPressed: () => _applyRecent(meal),
                              );
                            },
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      _Label('RINCIAN'),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _name,
                        decoration: const InputDecoration(
                          labelText: 'Nama makanan',
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: TextField(
                              controller: _calories,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Kalori',
                                suffixText: 'kkal',
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _protein,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: const InputDecoration(
                                labelText: 'Protein',
                                suffixText: 'g',
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _carbs,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: const InputDecoration(
                                labelText: 'Karbo',
                                suffixText: 'g',
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _fat,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: const InputDecoration(
                                labelText: 'Lemak',
                                suffixText: 'g',
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _fiber,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: const InputDecoration(
                                labelText: 'Serat',
                                suffixText: 'g',
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _Label('WAKTU HARI INI'),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _time,
                        keyboardType: TextInputType.datetime,
                        maxLength: 5,
                        decoration: InputDecoration(
                          hintText: 'HH:MM',
                          counterText: '',
                          suffixIcon: IconButton(
                            onPressed: _pickTime,
                            tooltip: 'Pilih waktu',
                            icon: const Icon(Icons.schedule_rounded),
                          ),
                        ),
                      ),
                      if (_error case final error?) ...[
                        const SizedBox(height: 12),
                        Text(
                          error,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: AppColors.danger),
                        ),
                      ],
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _saving ? null : _save,
                          child: Text(_saving ? 'Menyimpan…' : 'Simpan'),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: Theme.of(context).textTheme.labelMedium);
  }
}
