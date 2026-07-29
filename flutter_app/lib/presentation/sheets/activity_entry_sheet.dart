import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/domain.dart';

typedef ActivityAnalyzer = Future<ParsedActivity> Function(String description);

class ActivityEntrySheet extends StatefulWidget {
  const ActivityEntrySheet({
    required this.weightKg,
    required this.creditedStepCalories,
    required this.onAnalyze,
    required this.onSave,
    super.key,
  });

  final double weightKg;
  final int creditedStepCalories;
  final ActivityAnalyzer onAnalyze;
  final Future<void> Function(ActivityLog activity) onSave;

  @override
  State<ActivityEntrySheet> createState() => _ActivityEntrySheetState();
}

class _ActivityEntrySheetState extends State<ActivityEntrySheet> {
  final _story = TextEditingController();
  final _name = TextEditingController();
  final _duration = TextEditingController();
  final _met = TextEditingController();
  ActivityStepOverlap _overlap = ActivityStepOverlap.medium;
  bool _isAi = false;
  bool _analyzing = false;
  bool _saving = false;
  String? _notes;
  String? _error;

  @override
  void dispose() {
    _story.dispose();
    _name.dispose();
    _duration.dispose();
    _met.dispose();
    super.dispose();
  }

  Future<void> _analyze() async {
    final story = _story.text.trim();
    if (story.isEmpty) {
      setState(() => _error = 'Ceritakan aktivitas dan durasinya.');
      return;
    }
    setState(() {
      _analyzing = true;
      _error = null;
    });
    try {
      final result = await widget.onAnalyze(story);
      if (!mounted) return;
      setState(() {
        _name.text = result.name;
        _duration.text = '${result.durationMinutes}';
        _met.text = _plain(result.met);
        _overlap = result.stepOverlap;
        _notes = result.notes;
        _isAi = result.source == ActivitySource.ai;
      });
    } catch (_) {
      final local = ActivityCalculator.parseLocally(story);
      if (!mounted) return;
      setState(() {
        _name.text = local.name;
        _duration.text = '${local.durationMinutes}';
        _met.text = _plain(local.met);
        _overlap = local.stepOverlap;
        _notes = local.notes;
        _isAi = false;
        _error = 'AI belum tersedia. Estimasi lokal digunakan.';
      });
    } finally {
      if (mounted) setState(() => _analyzing = false);
    }
  }

  static String _plain(double value) {
    return value == value.roundToDouble()
        ? '${value.round()}'
        : value.toStringAsFixed(1);
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    final duration = int.tryParse(_duration.text.trim()) ?? 0;
    final met = double.tryParse(_met.text.replaceAll(',', '.').trim()) ?? 0;
    if (name.isEmpty || duration <= 0 || met < 1) {
      setState(() {
        _error = 'Analisis dulu, lalu periksa nama, durasi, dan intensitas.';
      });
      return;
    }
    final estimate = ActivityCalculator.calculateNetCalories(
      weightKg: widget.weightKg,
      durationMinutes: duration,
      met: met,
    );
    final credited = ActivityCalculator.calculateCreditedCalories(
      estimatedCalories: estimate,
      stepOverlap: _overlap,
      creditedStepCalories: widget.creditedStepCalories,
    );
    final log = ActivityLog(
      id: 'activity-${DateTime.now().microsecondsSinceEpoch}',
      timestamp: DateTime.now(),
      name: name,
      durationMinutes: duration.clamp(1, 720),
      met: met.clamp(1, 20),
      estimatedCalories: estimate,
      creditedCalories: credited,
      stepOverlap: _overlap,
      source: _isAi ? ActivitySource.ai : ActivitySource.local,
      notes: _notes,
    );
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onSave(log);
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Aktivitas belum tersimpan. Coba sekali lagi.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;
    final duration = int.tryParse(_duration.text.trim()) ?? 0;
    final met = double.tryParse(_met.text.replaceAll(',', '.').trim()) ?? 0;
    final estimate = duration > 0 && met >= 1
        ? ActivityCalculator.calculateNetCalories(
            weightKg: widget.weightKg,
            durationMinutes: duration,
            met: met,
          )
        : 0;

    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      padding: EdgeInsets.only(bottom: keyboard),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.72,
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
                            'Ceritakan aktivitas',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'AI membaca jenis, durasi, dan intensitas.',
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
                      Text(
                        'AKTIVITASMU',
                        style: Theme.of(context).textTheme.labelMedium,
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _story,
                        minLines: 2,
                        maxLines: 4,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _analyze(),
                        decoration: const InputDecoration(
                          hintText:
                              'Contoh: jogging 1 jam dengan intensitas sedang',
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _analyzing ? null : _analyze,
                          child: Text(
                            _analyzing ? 'Menganalisis…' : 'Analisis aktivitas',
                          ),
                        ),
                      ),
                      if (_name.text.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        Text(
                          'HASIL ESTIMASI',
                          style: Theme.of(context).textTheme.labelMedium,
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _name,
                          onChanged: (_) => setState(() {}),
                          decoration: const InputDecoration(
                            labelText: 'Nama aktivitas',
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _duration,
                                onChanged: (_) => setState(() {}),
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  labelText: 'Durasi',
                                  suffixText: 'menit',
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: TextField(
                                controller: _met,
                                onChanged: (_) => setState(() {}),
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                decoration: const InputDecoration(
                                  labelText: 'Intensitas',
                                  suffixText: 'MET',
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SegmentedButton<ActivityStepOverlap>(
                          segments: const [
                            ButtonSegment(
                              value: ActivityStepOverlap.high,
                              label: Text('Banyak langkah'),
                            ),
                            ButtonSegment(
                              value: ActivityStepOverlap.medium,
                              label: Text('Sebagian'),
                            ),
                            ButtonSegment(
                              value: ActivityStepOverlap.low,
                              label: Text('Sedikit'),
                            ),
                          ],
                          selected: {_overlap},
                          showSelectedIcon: false,
                          onSelectionChanged: (value) {
                            setState(() => _overlap = value.first);
                          },
                        ),
                        const SizedBox(height: 14),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            color: AppColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: AppColors.outline),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '$estimate kkal',
                                        style: Theme.of(context)
                                            .textTheme
                                            .headlineMedium
                                            ?.copyWith(
                                              color: AppColors.activity,
                                            ),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        'masuk ke energi keluar, bukan menambah batas diet',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodyMedium,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_notes case final notes?) ...[
                          const SizedBox(height: 10),
                          Text(
                            notes,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ],
                      if (_error case final error?) ...[
                        const SizedBox(height: 12),
                        Text(
                          error,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: AppColors.warning),
                        ),
                      ],
                      if (_name.text.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: _saving ? null : _save,
                            child: Text(
                              _saving ? 'Menyimpan…' : 'Simpan aktivitas',
                            ),
                          ),
                        ),
                      ],
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
