import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/models.dart';

class WeightEntrySheet extends StatefulWidget {
  const WeightEntrySheet({required this.onSave, this.initialWeight, super.key});

  final WeightLog? initialWeight;
  final Future<void> Function(WeightLog weight) onSave;

  @override
  State<WeightEntrySheet> createState() => _WeightEntrySheetState();
}

class _WeightEntrySheetState extends State<WeightEntrySheet> {
  late final TextEditingController _weight;
  late final TextEditingController _note;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _weight = TextEditingController(
      text: widget.initialWeight?.weightKg.toStringAsFixed(1) ?? '',
    );
    _note = TextEditingController(text: widget.initialWeight?.note ?? '');
  }

  @override
  void dispose() {
    _weight.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final weight = double.tryParse(_weight.text.replaceAll(',', '.').trim());
    if (weight == null || weight < 20 || weight > 300) {
      setState(() => _error = 'Masukkan berat antara 20–300 kg.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final existing = widget.initialWeight;
    try {
      await widget.onSave(
        WeightLog(
          id: existing?.id ?? 'weight-${DateTime.now().microsecondsSinceEpoch}',
          weightKg: weight,
          recordedAt: existing?.recordedAt ?? DateTime.now(),
          note: _note.text.trim().isEmpty ? null : _note.text.trim(),
        ),
      );
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Berat belum tersimpan. Coba sekali lagi.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.initialWeight == null ? 'Catat berat' : 'Edit berat',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 5),
              Text(
                'Lihat tren dari waktu ke waktu, bukan satu angka saja.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 22),
              TextField(
                controller: _weight,
                autofocus: true,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Berat',
                  suffixText: 'kg',
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _note,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Catatan (opsional)',
                ),
              ),
              if (_error case final error?) ...[
                const SizedBox(height: 10),
                Text(
                  error,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: AppColors.danger),
                ),
              ],
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Menyimpan…' : 'Simpan'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
