import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../data/data.dart'
    show
        AiConnectionStatus,
        AiProviderConfig,
        AiProviderKind,
        defaultGoogleAiStudioConfig;
import '../../domain/calculators/calorie_calculator.dart';
import '../../domain/models/user_profile.dart';
import '../widgets/ambient_background.dart';
import '../widgets/glass_surface.dart';

typedef SaveProfileCallback = FutureOr<void> Function(UserProfile profile);
typedef SelectAiProviderCallback = FutureOr<void> Function(String providerId);
typedef AddAiProviderCallback =
    FutureOr<String> Function({
      required String label,
      required String baseUrl,
      required List<String> models,
    });
typedef SaveApiKeyCallback =
    FutureOr<void> Function(String providerId, String apiKey);
typedef TestAiConnectionCallback =
    FutureOr<AiConnectionStatus> Function(String providerId);
typedef DeleteApiKeyCallback = FutureOr<void> Function(String providerId);

/// A parameter-driven profile screen.
///
/// API keys deliberately never enter this widget. The controller only provides
/// the IDs of providers that have a key in secure storage. A newly typed key is
/// cleared immediately after [onSaveApiKey] completes.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    required this.profile,
    required this.onSaveProfile,
    required this.onSaveApiKey,
    required this.onTestAi,
    required this.onDeleteApiKey,
    required this.onAddAiProvider,
    this.aiProviders = const <AiProviderConfig>[defaultGoogleAiStudioConfig],
    this.selectedAiProviderId = 'google-ai-studio',
    this.configuredAiProviderIds = const <String>{},
    this.aiStatus = AiConnectionStatus.notConfigured,
    this.activeAiModel,
    this.onSelectAiProvider,
    super.key,
  });

  final UserProfile profile;
  final SaveProfileCallback onSaveProfile;
  final List<AiProviderConfig> aiProviders;
  final String selectedAiProviderId;
  final Set<String> configuredAiProviderIds;
  final AiConnectionStatus aiStatus;
  final String? activeAiModel;
  final SelectAiProviderCallback? onSelectAiProvider;
  final AddAiProviderCallback onAddAiProvider;
  final SaveApiKeyCallback onSaveApiKey;
  final TestAiConnectionCallback onTestAi;
  final DeleteApiKeyCallback onDeleteApiKey;

  Future<void> _openBodyData(BuildContext context) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) =>
          _BodyDataSheet(profile: profile, onSave: onSaveProfile),
    );
    if (saved == true && context.mounted) {
      _showMessage(context, 'Data tubuh diperbarui.');
    }
  }

  Future<void> _openTargetPlan(BuildContext context) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) =>
          _TargetPlanSheet(profile: profile, onSave: onSaveProfile),
    );
    if (saved == true && context.mounted) {
      _showMessage(context, 'Target dan rencana diperbarui.');
    }
  }

  Future<void> _openAiSettings(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _AiSettingsSheet(
        providers: aiProviders,
        selectedProviderId: selectedAiProviderId,
        configuredProviderIds: configuredAiProviderIds,
        initialStatus: aiStatus,
        activeModel: activeAiModel,
        onSelectProvider: onSelectAiProvider,
        onAddProvider: onAddAiProvider,
        onSaveApiKey: onSaveApiKey,
        onTestAi: onTestAi,
        onDeleteApiKey: onDeleteApiKey,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bmr = CalorieCalculator.calculateBmr(profile);
    final tdee = CalorieCalculator.calculateTdee(profile);
    final dietTarget = CalorieCalculator.calculateDietTarget(profile);
    final effectiveDeficit = CalorieCalculator.calculateEffectiveDeficit(
      profile,
      tdee,
    );
    final providers = aiProviders.isEmpty
        ? const <AiProviderConfig>[defaultGoogleAiStudioConfig]
        : aiProviders;
    final selectedProvider = providers.where(
      (provider) => provider.id == selectedAiProviderId,
    );
    final provider = selectedProvider.isEmpty
        ? providers.first
        : selectedProvider.first;
    final hasKey = configuredAiProviderIds.contains(provider.id);

    return AmbientBackground(
      child: CustomScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverSafeArea(
            bottom: false,
            sliver: SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 124),
              sliver: SliverList.list(
                children: [
                  Text(
                    'Saya',
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  const SizedBox(height: 5),
                  Text(
                    'Data tubuh, rencana diet, dan AI.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  _ProfileOverview(profile: profile, bmr: bmr, tdee: tdee),
                  const SizedBox(height: 14),
                  _SectionSurface(
                    eyebrow: 'DATA TUBUH',
                    title: _bodySummary(profile),
                    description:
                        'Usia, tinggi, berat, aktivitas harian, dan respons tubuh membentuk perkiraan kebutuhanmu.',
                    accent: AppColors.activity,
                    trailing: '${_formatDecimal(profile.weightKg)} kg',
                    onTap: () => _openBodyData(context),
                  ),
                  const SizedBox(height: 14),
                  _SectionSurface(
                    eyebrow: 'TARGET & RENCANA',
                    title: 'Batas diet ${_formatNumber(dietTarget)} kkal',
                    description: effectiveDeficit == 0
                        ? 'Saat ini tidak ada pengurangan dari kebutuhan harian. Angka ini tetap panduan, bukan kuota makan.'
                        : '${_formatNumber(tdee)} kebutuhan − '
                              '${_formatNumber(effectiveDeficit)} defisit. '
                              'Bukan jumlah yang harus dihabiskan.',
                    accent: AppColors.diet,
                    trailing: '${_formatDecimal(profile.targetWeightKg)} kg',
                    onTap: () => _openTargetPlan(context),
                  ),
                  const SizedBox(height: 14),
                  _SectionSurface(
                    eyebrow: 'AI & PRIVASI',
                    title: provider.label,
                    description: hasKey
                        ? '${_aiStatusLabel(aiStatus)}. API key tersimpan aman dan tidak ditampilkan.'
                        : 'Tambahkan API key untuk analisis makanan, aktivitas, dan Coach yang lebih kontekstual.',
                    accent: _aiStatusColor(aiStatus, hasKey: hasKey),
                    trailing: hasKey ? 'Aktif' : 'Lokal',
                    onTap: () => _openAiSettings(context),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'BMR dan kebutuhan harian bertambah bertahap sepanjang hari. '
                    'Aktivitas yang benar-benar tercatat tetap masuk ke energi keluar.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textTertiary,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileOverview extends StatelessWidget {
  const _ProfileOverview({
    required this.profile,
    required this.bmr,
    required this.tdee,
  });

  final UserProfile profile;
  final int bmr;
  final int tdee;

  @override
  Widget build(BuildContext context) {
    final initial = profile.name.trim().isEmpty
        ? 'K'
        : profile.name.trim().characters.first.toUpperCase();

    return GlassSurface(
      tint: AppColors.protein,
      reflective: true,
      reflectionStrength: 0.68,
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppColors.protein, AppColors.diet],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.protein.withValues(alpha: 0.24),
                      blurRadius: 22,
                    ),
                  ],
                ),
                child: Text(
                  initial,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.name.trim().isEmpty
                          ? 'Tanpa nama'
                          : profile.name.trim(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${_formatDecimal(profile.weightKg)} kg menuju '
                      '${_formatDecimal(profile.targetWeightKg)} kg',
                      style: Theme.of(
                        context,
                      ).textTheme.bodyMedium?.copyWith(fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Divider(),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _EnergyMetric(
                  color: AppColors.hydration,
                  label: 'Saat istirahat',
                  value: bmr,
                  caption: 'BMR',
                ),
              ),
              Container(width: 1, height: 62, color: AppColors.divider),
              const SizedBox(width: 18),
              Expanded(
                child: _EnergyMetric(
                  color: AppColors.activity,
                  label: 'Kebutuhan harian',
                  value: tdee,
                  caption: 'TDEE',
                ),
              ),
            ],
          ),
          const SizedBox(height: 17),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'BMR adalah energi dasar tubuh. TDEE adalah BMR setelah '
              'disesuaikan dengan pola aktivitas dan respons tubuh.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textTertiary,
                fontSize: 12.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EnergyMetric extends StatelessWidget {
  const _EnergyMetric({
    required this.color,
    required this.label,
    required this.value,
    required this.caption,
  });

  final Color color;
  final String label;
  final int value;
  final String caption;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 7),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(fontSize: 12),
              ),
            ),
          ],
        ),
        const SizedBox(height: 7),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text.rich(
            TextSpan(
              text: _formatNumber(value),
              style: Theme.of(context).textTheme.headlineMedium,
              children: [
                TextSpan(
                  text: ' kkal',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(fontSize: 12),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          caption,
          style: Theme.of(
            context,
          ).textTheme.labelMedium?.copyWith(color: color, fontSize: 10),
        ),
      ],
    );
  }
}

class _SectionSurface extends StatelessWidget {
  const _SectionSurface({
    required this.eyebrow,
    required this.title,
    required this.description,
    required this.accent,
    required this.trailing,
    required this.onTap,
  });

  final String eyebrow;
  final String title;
  final String description;
  final Color accent;
  final String trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      onTap: onTap,
      tint: accent,
      padding: const EdgeInsets.all(18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: 52,
            decoration: BoxDecoration(
              color: accent,
              borderRadius: BorderRadius.circular(99),
              boxShadow: [
                BoxShadow(
                  color: accent.withValues(alpha: 0.28),
                  blurRadius: 14,
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eyebrow,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: accent,
                    fontSize: 10,
                  ),
                ),
                const SizedBox(height: 7),
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 6),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontSize: 13,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                trailing,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 10),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textTertiary,
                size: 21,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BodyDataSheet extends StatefulWidget {
  const _BodyDataSheet({required this.profile, required this.onSave});

  final UserProfile profile;
  final SaveProfileCallback onSave;

  @override
  State<_BodyDataSheet> createState() => _BodyDataSheetState();
}

class _BodyDataSheetState extends State<_BodyDataSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _ageController;
  late final TextEditingController _heightController;
  late final TextEditingController _weightController;
  late Gender _gender;
  late ActivityLevel _activityLevel;
  late BodyResponse _bodyResponse;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final profile = widget.profile;
    _nameController = TextEditingController(text: profile.name);
    _ageController = TextEditingController(text: '${profile.age}');
    _heightController = TextEditingController(
      text: _formatDecimal(profile.heightCm),
    );
    _weightController = TextEditingController(
      text: _formatDecimal(profile.weightKg),
    );
    _gender = profile.gender;
    _activityLevel = profile.activityLevel;
    _bodyResponse = profile.bodyResponse;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _ageController.dispose();
    _heightController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  UserProfile? _draftProfile() {
    final age = int.tryParse(_ageController.text.trim());
    final height = _parseDecimal(_heightController.text);
    final weight = _parseDecimal(_weightController.text);
    if (age == null || age < 10 || age > 100) {
      _error = 'Usia perlu berada antara 10–100 tahun.';
      return null;
    }
    if (height == null || height < 100 || height > 230) {
      _error = 'Tinggi perlu berada antara 100–230 cm.';
      return null;
    }
    if (weight == null || weight < 30 || weight > 250) {
      _error = 'Berat perlu berada antara 30–250 kg.';
      return null;
    }
    return widget.profile.copyWith(
      name: _nameController.text.trim().isEmpty
          ? 'Kamu'
          : _nameController.text.trim(),
      age: age,
      heightCm: height,
      weightKg: weight,
      gender: _gender,
      activityLevel: _activityLevel,
      bodyResponse: _bodyResponse,
    );
  }

  UserProfile _previewProfile() {
    return widget.profile.copyWith(
      age: int.tryParse(_ageController.text.trim()) ?? widget.profile.age,
      heightCm:
          _parseDecimal(_heightController.text) ?? widget.profile.heightCm,
      weightKg:
          _parseDecimal(_weightController.text) ?? widget.profile.weightKg,
      gender: _gender,
      activityLevel: _activityLevel,
      bodyResponse: _bodyResponse,
    );
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    setState(() => _error = null);
    final draft = _draftProfile();
    if (draft == null) {
      setState(() {});
      return;
    }
    setState(() => _saving = true);
    try {
      await Future<void>.sync(() => widget.onSave(draft));
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Data belum tersimpan. Coba lagi.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final preview = _previewProfile();
    final bmr = CalorieCalculator.calculateBmr(preview);
    final tdee = CalorieCalculator.calculateTdee(preview);

    return _KeyboardSafeSheet(
      title: 'Data tubuh',
      subtitle: 'Dasar perhitungan kebutuhan energi.',
      footer: _SheetAction(
        label: 'Simpan data tubuh',
        loading: _saving,
        onPressed: _saving ? null : _save,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _FormField(
            label: 'Nama',
            controller: _nameController,
            keyboardType: TextInputType.name,
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 18),
          _FieldLabel('Jenis kelamin'),
          const SizedBox(height: 8),
          _SegmentedChoice<Gender>(
            value: _gender,
            options: const [
              (Gender.male, 'Laki-laki'),
              (Gender.female, 'Perempuan'),
            ],
            onChanged: (value) => setState(() => _gender = value),
          ),
          const SizedBox(height: 18),
          LayoutBuilder(
            builder: (context, constraints) {
              final fields = [
                Expanded(
                  child: _FormField(
                    label: 'Usia',
                    controller: _ageController,
                    suffix: 'tahun',
                    keyboardType: TextInputType.number,
                    textInputAction: TextInputAction.next,
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                Expanded(
                  child: _FormField(
                    label: 'Tinggi',
                    controller: _heightController,
                    suffix: 'cm',
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    textInputAction: TextInputAction.next,
                    onChanged: (_) => setState(() {}),
                  ),
                ),
              ];
              if (constraints.maxWidth < 330) {
                return Column(
                  children: [fields[0], const SizedBox(height: 14), fields[1]],
                );
              }
              return Row(
                children: [fields[0], const SizedBox(width: 12), fields[1]],
              );
            },
          ),
          const SizedBox(height: 18),
          _FormField(
            label: 'Berat saat ini',
            controller: _weightController,
            suffix: 'kg',
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textInputAction: TextInputAction.done,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 24),
          const _FieldLabel('Gerak harian'),
          const SizedBox(height: 9),
          _ChoiceWrap<ActivityLevel>(
            value: _activityLevel,
            options: ActivityLevel.values
                .map((value) => (value, _activityLabel(value)))
                .toList(growable: false),
            color: AppColors.activity,
            onChanged: (value) => setState(() => _activityLevel = value),
          ),
          const SizedBox(height: 10),
          _ImpactNote(
            color: AppColors.activity,
            title: _activityImpactTitle(_activityLevel),
            body:
                '${_activityDescription(_activityLevel)} '
                'Pilihan ini mengalikan BMR sebesar '
                '×${_formatMultiplier(CalorieCalculator.activityMultipliers[_activityLevel]!)} '
                'untuk memperkirakan kebutuhan harian. Pilih berdasarkan gerak '
                'rutin di luar sesi olahraga; langkah ekstra dan olahraga yang '
                'kamu catat masuk terpisah ke kkal keluar.',
          ),
          const SizedBox(height: 24),
          const _FieldLabel('Respons tubuh'),
          const SizedBox(height: 9),
          _ChoiceWrap<BodyResponse>(
            value: _bodyResponse,
            options: BodyResponse.values
                .map((value) => (value, _bodyResponseLabel(value)))
                .toList(growable: false),
            color: AppColors.protein,
            onChanged: (value) => setState(() => _bodyResponse = value),
          ),
          const SizedBox(height: 10),
          _ImpactNote(
            color: AppColors.protein,
            title: _bodyResponseImpactTitle(_bodyResponse),
            body:
                '${_bodyResponseDescription(_bodyResponse)} '
                'Ini hanya penyesuaian perkiraan berdasarkan pola yang kamu '
                'rasakan, bukan pengukuran metabolisme.',
          ),
          const SizedBox(height: 20),
          _CalculationPreview(
            title: 'Perkiraan dari data ini',
            rows: [
              ('Energi dasar (BMR)', '$bmr kkal'),
              ('Kebutuhan harian (TDEE)', '$tdee kkal'),
            ],
            note:
                'BMR dihitung dari berat, tinggi, usia, dan jenis kelamin. '
                'Nilainya lalu disesuaikan dengan aktivitas harian dan respons '
                'tubuh untuk mendapatkan TDEE.',
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            _ErrorMessage(_error!),
          ],
        ],
      ),
    );
  }
}

class _TargetPlanSheet extends StatefulWidget {
  const _TargetPlanSheet({required this.profile, required this.onSave});

  final UserProfile profile;
  final SaveProfileCallback onSave;

  @override
  State<_TargetPlanSheet> createState() => _TargetPlanSheetState();
}

class _TargetPlanSheetState extends State<_TargetPlanSheet> {
  static const _deficitOptions = <int>[250, 500, 750, 1000];

  late final TextEditingController _targetWeightController;
  late int _targetDeficit;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _targetWeightController = TextEditingController(
      text: _formatDecimal(widget.profile.targetWeightKg),
    );
    _targetDeficit = _nearestDeficit(widget.profile.targetDeficitKcal);
  }

  @override
  void dispose() {
    _targetWeightController.dispose();
    super.dispose();
  }

  UserProfile _previewProfile() {
    return widget.profile.copyWith(
      targetWeightKg:
          _parseDecimal(_targetWeightController.text) ??
          widget.profile.targetWeightKg,
      targetDeficitKcal: _targetDeficit,
    );
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    final targetWeight = _parseDecimal(_targetWeightController.text);
    if (targetWeight == null || targetWeight < 30 || targetWeight > 250) {
      setState(() {
        _error = 'Berat tujuan perlu berada antara 30–250 kg.';
      });
      return;
    }
    final draft = widget.profile.copyWith(
      targetWeightKg: targetWeight,
      targetDeficitKcal: _targetDeficit,
    );
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await Future<void>.sync(() => widget.onSave(draft));
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Rencana belum tersimpan. Coba lagi.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final preview = _previewProfile();
    final bmr = CalorieCalculator.calculateBmr(preview);
    final tdee = CalorieCalculator.calculateTdee(preview);
    final effectiveDeficit = CalorieCalculator.calculateEffectiveDeficit(
      preview,
      tdee,
    );
    final dietTarget = CalorieCalculator.calculateDietTarget(preview);
    final wantsWeightLoss = preview.targetWeightKg < preview.weightKg;
    final minimumFloorApplied = wantsWeightLoss && tdee <= 1200;

    return _KeyboardSafeSheet(
      title: 'Target & rencana',
      subtitle: 'Tujuan berat dan batas diet harian.',
      footer: _SheetAction(
        label: 'Simpan target & rencana',
        loading: _saving,
        onPressed: _saving ? null : _save,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _FormField(
            label: 'Berat yang ingin dicapai',
            controller: _targetWeightController,
            suffix: 'kg',
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textInputAction: TextInputAction.done,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 22),
          _CalculationPreview(
            title: 'Dari mana kebutuhan didapat?',
            rows: [
              ('BMR dari data tubuh', '${_formatNumber(bmr)} kkal'),
              (
                'Aktivitas ${_activityLabel(preview.activityLevel)}',
                '×${_formatMultiplier(CalorieCalculator.activityMultipliers[preview.activityLevel]!)}',
              ),
              (
                'Respons ${_bodyResponseLabel(preview.bodyResponse)}',
                '×${CalorieCalculator.bodyResponseMultipliers[preview.bodyResponse]!.toStringAsFixed(2)}',
              ),
              ('Perkiraan kebutuhan', '${_formatNumber(tdee)} kkal'),
            ],
            note:
                'BMR adalah energi untuk bernapas, menjaga organ, dan fungsi '
                'dasar saat istirahat. TDEE adalah perkiraan total sehari '
                'setelah BMR disesuaikan dengan gerak rutin di luar olahraga '
                'yang dicatat serta respons tubuh.',
            accent: AppColors.activity,
          ),
          const SizedBox(height: 24),
          const _FieldLabel('Defisit rencana'),
          const SizedBox(height: 5),
          Text(
            'Seberapa jauh batas diet berada di bawah kebutuhan harian.',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontSize: 13),
          ),
          const SizedBox(height: 11),
          _ChoiceWrap<int>(
            value: _targetDeficit,
            options: _deficitOptions
                .map((value) => (value, '${_formatNumber(value)} kkal'))
                .toList(growable: false),
            color: AppColors.diet,
            onChanged: (value) => setState(() => _targetDeficit = value),
          ),
          const SizedBox(height: 14),
          GlassSurface(
            tint: AppColors.diet,
            padding: const EdgeInsets.all(17),
            radius: 22,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'BATAS DIET',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.diet,
                    fontSize: 10,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${_formatNumber(dietTarget)} kkal',
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
                const SizedBox(height: 7),
                Text(
                  effectiveDeficit == 0
                      ? minimumFloorApplied
                            ? 'Defisit otomatis 0 karena perkiraan kebutuhan '
                                  'tidak cukup jauh di atas batas minimum aplikasi.'
                            : 'Tidak ada defisit karena tujuan berat tidak lebih '
                                  'rendah dari berat saat ini.'
                      : '${_formatNumber(tdee)} kebutuhan − '
                            '${_formatNumber(effectiveDeficit)} defisit.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.diet.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    'Ini batas rencana diet, bukan jumlah makanan yang harus '
                    'dihabiskan. Tetap ikuti rasa lapar dan kebutuhan tubuh.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textPrimary,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (effectiveDeficit < _targetDeficit && effectiveDeficit > 0) ...[
            const SizedBox(height: 12),
            _ImpactNote(
              color: AppColors.warning,
              title: 'Defisit otomatis disesuaikan',
              body:
                  'Pilihan ${_formatNumber(_targetDeficit)} kkal menjadi '
                  '${_formatNumber(effectiveDeficit)} kkal agar batas diet '
                  'tidak turun di bawah batas aman aplikasi.',
            ),
          ],
          if (minimumFloorApplied) ...[
            const SizedBox(height: 12),
            _ImpactNote(
              color: AppColors.warning,
              title: 'Tidak membuat defisit otomatis',
              body:
                  'Perkiraan kebutuhanmu ${_formatNumber(tdee)} kkal berada '
                  'di bawah batas minimum aplikasi 1.200 kkal. Konsultasikan '
                  'dengan tenaga kesehatan sebelum menurunkan batas makan.',
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 14),
            _ErrorMessage(_error!),
          ],
        ],
      ),
    );
  }
}

class _AiSettingsSheet extends StatefulWidget {
  const _AiSettingsSheet({
    required this.providers,
    required this.selectedProviderId,
    required this.configuredProviderIds,
    required this.initialStatus,
    required this.onSaveApiKey,
    required this.onTestAi,
    required this.onDeleteApiKey,
    required this.onAddProvider,
    this.activeModel,
    this.onSelectProvider,
  });

  final List<AiProviderConfig> providers;
  final String selectedProviderId;
  final Set<String> configuredProviderIds;
  final AiConnectionStatus initialStatus;
  final String? activeModel;
  final SelectAiProviderCallback? onSelectProvider;
  final AddAiProviderCallback onAddProvider;
  final SaveApiKeyCallback onSaveApiKey;
  final TestAiConnectionCallback onTestAi;
  final DeleteApiKeyCallback onDeleteApiKey;

  @override
  State<_AiSettingsSheet> createState() => _AiSettingsSheetState();
}

class _AiSettingsSheetState extends State<_AiSettingsSheet> {
  late final TextEditingController _keyController;
  late final List<AiProviderConfig> _providers;
  late String _providerId;
  late Set<String> _configuredProviders;
  late AiConnectionStatus _status;
  bool _saving = false;
  bool _testing = false;
  bool _deleting = false;
  String? _message;
  bool _messageIsError = false;

  @override
  void initState() {
    super.initState();
    _keyController = TextEditingController();
    _providers = widget.providers.isEmpty
        ? <AiProviderConfig>[defaultGoogleAiStudioConfig]
        : widget.providers.where((provider) => provider.enabled).toList();
    if (_providers.isEmpty) {
      _providers.add(defaultGoogleAiStudioConfig);
    }
    _providerId =
        _providers.any((provider) => provider.id == widget.selectedProviderId)
        ? widget.selectedProviderId
        : _providers.first.id;
    _configuredProviders = {...widget.configuredProviderIds};
    _status = widget.initialStatus;
  }

  @override
  void dispose() {
    _keyController.clear();
    _keyController.dispose();
    super.dispose();
  }

  AiProviderConfig get _provider =>
      _providers.firstWhere((provider) => provider.id == _providerId);

  bool get _hasKey => _configuredProviders.contains(_providerId);

  Future<void> _openAddProvider() async {
    FocusScope.of(context).unfocus();
    final provider = await showModalBottomSheet<AiProviderConfig>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) =>
          _AddAiProviderSheet(onAddProvider: widget.onAddProvider),
    );
    if (provider == null || !mounted) return;

    setState(() {
      _providers.add(provider);
      _providerId = provider.id;
      _status = AiConnectionStatus.notConfigured;
      _message =
          '${provider.label} ditambahkan. Sekarang masukkan API key-nya.';
      _messageIsError = false;
    });
    try {
      await Future<void>.sync(() => widget.onSelectProvider?.call(provider.id));
    } catch (_) {
      if (mounted) {
        setState(() {
          _message = '${provider.label} tersimpan, tetapi belum dapat dipilih.';
          _messageIsError = true;
        });
      }
    }
  }

  Future<void> _selectProvider(String? providerId) async {
    if (providerId == null || providerId == _providerId) return;
    FocusScope.of(context).unfocus();
    _keyController.clear();
    setState(() {
      _providerId = providerId;
      _status = _configuredProviders.contains(providerId)
          ? AiConnectionStatus.offline
          : AiConnectionStatus.notConfigured;
      _message = null;
    });
    try {
      await Future<void>.sync(() => widget.onSelectProvider?.call(providerId));
    } catch (_) {
      if (mounted) {
        setState(() {
          _message = 'Pilihan provider belum tersimpan.';
          _messageIsError = true;
        });
      }
    }
  }

  Future<void> _saveKey() async {
    final key = _keyController.text.trim();
    if (key.isEmpty) {
      setState(() {
        _message = 'Tempel API key baru terlebih dahulu.';
        _messageIsError = true;
      });
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _saving = true;
      _message = null;
    });
    try {
      await Future<void>.sync(() => widget.onSaveApiKey(_providerId, key));
      _keyController.clear();
      if (mounted) {
        setState(() {
          _configuredProviders.add(_providerId);
          _status = AiConnectionStatus.offline;
          _saving = false;
          _message = 'API key disimpan. Isinya tidak akan ditampilkan kembali.';
          _messageIsError = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _message = 'API key belum tersimpan. Periksa lalu coba lagi.';
          _messageIsError = true;
        });
      }
    }
  }

  Future<void> _testConnection() async {
    if (!_hasKey) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _testing = true;
      _status = AiConnectionStatus.checking;
      _message = null;
    });
    try {
      final result = await Future<AiConnectionStatus>.sync(
        () => widget.onTestAi(_providerId),
      );
      if (mounted) {
        setState(() {
          _testing = false;
          _status = result;
          _message = _aiTestMessage(result);
          _messageIsError =
              result != AiConnectionStatus.connected &&
              result != AiConnectionStatus.rateLimited;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _testing = false;
          _status = AiConnectionStatus.offline;
          _message = 'Koneksi belum berhasil. Coba lagi beberapa saat.';
          _messageIsError = true;
        });
      }
    }
  }

  Future<void> _deleteKey() async {
    if (!_hasKey) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Hapus API key?'),
        content: Text(
          'AI online dari ${_provider.label} akan berhenti sampai key baru '
          'ditambahkan. Fitur perkiraan lokal tetap tersedia.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text(
              'Hapus',
              style: TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _deleting = true;
      _message = null;
    });
    try {
      await Future<void>.sync(() => widget.onDeleteApiKey(_providerId));
      _keyController.clear();
      if (mounted) {
        setState(() {
          _configuredProviders.remove(_providerId);
          _status = AiConnectionStatus.notConfigured;
          _deleting = false;
          _message = 'API key dihapus dari penyimpanan aman.';
          _messageIsError = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _deleting = false;
          _message = 'API key belum dapat dihapus.';
          _messageIsError = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = _provider;

    return _KeyboardSafeSheet(
      title: 'AI & privasi',
      subtitle: 'Provider, model cadangan, dan API key.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(child: _FieldLabel('Provider AI')),
              TextButton(
                key: const ValueKey('add-ai-provider-button'),
                onPressed: _saving || _testing || _deleting
                    ? null
                    : _openAddProvider,
                child: const Text('+ Tambah provider'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _providerId,
            isExpanded: true,
            decoration: const InputDecoration(
              contentPadding: EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
            ),
            dropdownColor: AppColors.surfaceElevated,
            items: _providers
                .map(
                  (item) => DropdownMenuItem(
                    value: item.id,
                    child: Text(
                      item.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                )
                .toList(growable: false),
            onChanged: _saving || _testing || _deleting
                ? null
                : _selectProvider,
          ),
          const SizedBox(height: 13),
          _AiStatusCard(
            provider: provider,
            status: _status,
            hasKey: _hasKey,
            activeModel: widget.activeModel,
          ),
          const SizedBox(height: 20),
          const _FieldLabel('API key baru'),
          const SizedBox(height: 7),
          TextField(
            controller: _keyController,
            obscureText: true,
            obscuringCharacter: '•',
            enableSuggestions: false,
            autocorrect: false,
            keyboardType: TextInputType.visiblePassword,
            textCapitalization: TextCapitalization.none,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.password],
            decoration: InputDecoration(
              hintText: _hasKey
                  ? 'Tempel untuk mengganti key'
                  : 'Tempel API key',
            ),
            onSubmitted: (_) {
              if (!_saving) _saveKey();
            },
          ),
          const SizedBox(height: 9),
          Text(
            'Key yang sudah tersimpan tidak pernah ditampilkan di layar. '
            'Di iOS dan Android, key disimpan dalam penyimpanan aman sistem.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textTertiary,
              fontSize: 12.5,
            ),
          ),
          const SizedBox(height: 15),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: _saving || _testing || _deleting ? null : _saveKey,
                  child: _saving
                      ? const _SmallLoader()
                      : Text(_hasKey ? 'Ganti key' : 'Simpan key'),
                ),
              ),
              if (_hasKey) ...[
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 56),
                      foregroundColor: AppColors.textPrimary,
                      side: const BorderSide(color: AppColors.outline),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                    onPressed: _saving || _testing || _deleting
                        ? null
                        : _testConnection,
                    child: _testing
                        ? const _SmallLoader()
                        : const Text('Tes koneksi'),
                  ),
                ),
              ],
            ],
          ),
          if (_message != null) ...[
            const SizedBox(height: 12),
            _StatusMessage(message: _message!, isError: _messageIsError),
          ],
          if (_hasKey) ...[
            const SizedBox(height: 15),
            Center(
              child: TextButton(
                onPressed: _saving || _testing || _deleting ? null : _deleteKey,
                child: Text(
                  _deleting ? 'Menghapus…' : 'Hapus API key',
                  style: const TextStyle(color: AppColors.danger),
                ),
              ),
            ),
          ],
          const SizedBox(height: 8),
          _ImpactNote(
            color: AppColors.hydration,
            title: 'Data yang dikirim saat AI dipakai',
            body:
                'Deskripsi makanan atau aktivitas, pertanyaan Coach, dan '
                'ringkasan konteks hari ini dapat dikirim ke provider terpilih. '
                'API key tidak pernah ikut masuk ke jurnal atau profil.',
          ),
        ],
      ),
    );
  }
}

class _AddAiProviderSheet extends StatefulWidget {
  const _AddAiProviderSheet({required this.onAddProvider});

  final AddAiProviderCallback onAddProvider;

  @override
  State<_AddAiProviderSheet> createState() => _AddAiProviderSheetState();
}

class _AddAiProviderSheetState extends State<_AddAiProviderSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _urlController;
  late final TextEditingController _modelsController;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _urlController = TextEditingController();
    _modelsController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _urlController.dispose();
    _modelsController.dispose();
    super.dispose();
  }

  List<String> _orderedModels() {
    return _modelsController.text
        .split(RegExp(r'[\n,]+'))
        .map((model) => model.trim())
        .where((model) => model.isNotEmpty)
        .toSet()
        .toList(growable: false);
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    final label = _nameController.text.trim();
    final baseUrl = _urlController.text.trim();
    final models = _orderedModels();

    if (label.isEmpty) {
      setState(() => _error = 'Isi nama provider terlebih dahulu.');
      return;
    }
    if (models.isEmpty) {
      setState(() => _error = 'Tambahkan setidaknya satu ID model.');
      return;
    }

    final preview = AiProviderConfig.fromJson({
      'id': 'provider-preview',
      'label': label,
      'kind': AiProviderKind.openAiCompatible.name,
      'baseUrl': baseUrl,
      'models': models,
      'enabled': true,
    });
    if (preview == null) {
      setState(() {
        _error =
            'Gunakan alamat HTTPS. Untuk server di perangkat ini, '
            'http://localhost atau http://127.0.0.1 juga boleh.';
      });
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final providerId = await Future<String>.sync(
        () => widget.onAddProvider(
          label: preview.label,
          baseUrl: preview.baseUrl!,
          models: preview.models,
        ),
      );
      final savedProvider = AiProviderConfig.fromJson({
        ...preview.toJson(),
        'id': providerId,
      });
      if (savedProvider == null) {
        throw const FormatException('Provider tersimpan tidak valid.');
      }
      if (mounted) Navigator.of(context).pop(savedProvider);
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Provider belum tersimpan. Periksa data lalu coba lagi.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return _KeyboardSafeSheet(
      title: 'Tambah provider',
      subtitle: 'Hubungkan API yang kompatibel dengan OpenAI.',
      footer: _SheetAction(
        label: 'Tambahkan provider',
        loading: _saving,
        onPressed: _saving ? null : _save,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _FormField(
            label: 'Nama provider',
            controller: _nameController,
            fieldKey: const ValueKey('ai-provider-name-field'),
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 18),
          const _FieldLabel('Alamat API'),
          const SizedBox(height: 7),
          TextField(
            key: const ValueKey('ai-provider-url-field'),
            controller: _urlController,
            keyboardType: TextInputType.url,
            textCapitalization: TextCapitalization.none,
            textInputAction: TextInputAction.next,
            autocorrect: false,
            enableSuggestions: false,
            decoration: const InputDecoration(
              hintText: 'https://api.provider.com/v1',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Gunakan HTTPS. HTTP hanya diizinkan untuk localhost.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textTertiary,
              fontSize: 12.5,
            ),
          ),
          const SizedBox(height: 18),
          const _FieldLabel('Urutan model'),
          const SizedBox(height: 7),
          TextField(
            key: const ValueKey('ai-provider-models-field'),
            controller: _modelsController,
            minLines: 3,
            maxLines: 6,
            keyboardType: TextInputType.multiline,
            textCapitalization: TextCapitalization.none,
            textInputAction: TextInputAction.newline,
            autocorrect: false,
            enableSuggestions: false,
            decoration: const InputDecoration(
              hintText: 'model-utama\nmodel-cadangan-1\nmodel-cadangan-2',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Tulis satu ID per baris atau pisahkan dengan koma. AI mencoba '
            'dari atas, lalu berpindah jika model sedang tidak tersedia.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textTertiary,
              fontSize: 12.5,
            ),
          ),
          const SizedBox(height: 16),
          _ImpactNote(
            color: AppColors.hydration,
            title: 'API key diisi setelah ini',
            body:
                'Form ini tidak menerima atau menyimpan API key. Setelah '
                'provider ditambahkan, masukkan key melalui penyimpanan aman.',
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            _ErrorMessage(_error!),
          ],
        ],
      ),
    );
  }
}

class _AiStatusCard extends StatelessWidget {
  const _AiStatusCard({
    required this.provider,
    required this.status,
    required this.hasKey,
    this.activeModel,
  });

  final AiProviderConfig provider;
  final AiConnectionStatus status;
  final bool hasKey;
  final String? activeModel;

  @override
  Widget build(BuildContext context) {
    final color = _aiStatusColor(status, hasKey: hasKey);
    final baseUrl = provider.kind == AiProviderKind.openAiCompatible
        ? provider.baseUrl
        : null;

    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.outline),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 9,
                height: 9,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: color.withValues(alpha: 0.35),
                      blurRadius: 10,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  hasKey ? _aiStatusLabel(status) : 'Mode lokal',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              Text(
                hasKey ? 'Key tersimpan' : 'Tanpa key',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textTertiary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          const Divider(),
          const SizedBox(height: 12),
          _KeyValueLine(
            label: 'Model',
            value:
                hasKey &&
                    status == AiConnectionStatus.connected &&
                    activeModel?.trim().isNotEmpty == true
                ? activeModel!
                : '${provider.models.length} model berurutan',
          ),
          if (baseUrl != null) ...[
            const SizedBox(height: 9),
            _KeyValueLine(label: 'Alamat API', value: baseUrl),
          ],
        ],
      ),
    );
  }
}

class _CalculationPreview extends StatelessWidget {
  const _CalculationPreview({
    required this.title,
    required this.rows,
    required this.note,
    this.accent = AppColors.hydration,
  });

  final String title;
  final List<(String, String)> rows;
  final String note;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: Theme.of(
              context,
            ).textTheme.labelMedium?.copyWith(color: accent, fontSize: 10),
          ),
          const SizedBox(height: 14),
          for (var index = 0; index < rows.length; index++) ...[
            if (index > 0) const SizedBox(height: 11),
            if (index == rows.length - 1 && rows.length > 2) ...[
              const Divider(),
              const SizedBox(height: 11),
            ],
            _KeyValueLine(
              label: rows[index].$1,
              value: rows[index].$2,
              strong: index == rows.length - 1,
            ),
          ],
          const SizedBox(height: 14),
          Text(
            note,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textTertiary,
              fontSize: 12.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _KeyboardSafeSheet extends StatelessWidget {
  const _KeyboardSafeSheet({
    required this.title,
    required this.subtitle,
    required this.child,
    this.footer,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final keyboardHeight = media.viewInsets.bottom;
    final availableHeight =
        media.size.height - media.padding.top - keyboardHeight - 12;
    final sheetHeight = availableHeight.clamp(360.0, media.size.height * 0.91);

    return AnimatedPadding(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      padding: EdgeInsets.only(bottom: keyboardHeight),
      child: Container(
        height: sheetHeight,
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40,
              height: 5,
              decoration: BoxDecoration(
                color: AppColors.surfaceStrong,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 12, 16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          subtitle,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Tutup',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            const Divider(),
            Expanded(
              child: ListView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
                children: [child],
              ),
            ),
            if (footer != null) ...[
              const Divider(),
              SafeArea(
                top: false,
                minimum: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                child: footer!,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SheetAction extends StatelessWidget {
  const _SheetAction({
    required this.label,
    required this.loading,
    required this.onPressed,
  });

  final String label;
  final bool loading;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: onPressed,
        child: loading ? const _SmallLoader() : Text(label),
      ),
    );
  }
}

class _FormField extends StatelessWidget {
  const _FormField({
    required this.label,
    required this.controller,
    this.suffix,
    this.keyboardType,
    this.textInputAction,
    this.textCapitalization = TextCapitalization.none,
    this.onChanged,
    this.fieldKey,
  });

  final String label;
  final TextEditingController controller;
  final String? suffix;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final TextCapitalization textCapitalization;
  final ValueChanged<String>? onChanged;
  final Key? fieldKey;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FieldLabel(label),
        const SizedBox(height: 7),
        TextField(
          key: fieldKey,
          controller: controller,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          textCapitalization: textCapitalization,
          onChanged: onChanged,
          decoration: InputDecoration(suffixText: suffix),
        ),
      ],
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: Theme.of(context).textTheme.labelLarge?.copyWith(
        color: AppColors.textSecondary,
        fontSize: 13,
      ),
    );
  }
}

class _SegmentedChoice<T> extends StatelessWidget {
  const _SegmentedChoice({
    required this.value,
    required this.options,
    required this.onChanged,
  });

  final T value;
  final List<(T, String)> options;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          for (final option in options)
            Expanded(
              child: Semantics(
                selected: option.$1 == value,
                button: true,
                child: InkWell(
                  borderRadius: BorderRadius.circular(15),
                  onTap: () => onChanged(option.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeOut,
                    alignment: Alignment.center,
                    constraints: const BoxConstraints(minHeight: 44),
                    decoration: BoxDecoration(
                      color: option.$1 == value
                          ? AppColors.surfaceStrong
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(15),
                      border: option.$1 == value
                          ? Border.all(color: AppColors.outline)
                          : null,
                    ),
                    child: Text(
                      option.$2,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: option.$1 == value
                            ? AppColors.textPrimary
                            : AppColors.textTertiary,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ChoiceWrap<T> extends StatelessWidget {
  const _ChoiceWrap({
    required this.value,
    required this.options,
    required this.color,
    required this.onChanged,
  });

  final T value;
  final List<(T, String)> options;
  final Color color;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options
          .map((option) {
            final selected = option.$1 == value;
            return Semantics(
              selected: selected,
              button: true,
              child: InkWell(
                borderRadius: BorderRadius.circular(99),
                onTap: () => onChanged(option.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeOut,
                  constraints: const BoxConstraints(minHeight: 40),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 9,
                  ),
                  decoration: BoxDecoration(
                    color: selected
                        ? color.withValues(alpha: 0.14)
                        : AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(
                      color: selected ? color : AppColors.outline,
                    ),
                  ),
                  child: Text(
                    option.$2,
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: selected ? color : AppColors.textSecondary,
                      fontSize: 12.5,
                    ),
                  ),
                ),
              ),
            );
          })
          .toList(growable: false),
    );
  }
}

class _ImpactNote extends StatelessWidget {
  const _ImpactNote({
    required this.color,
    required this.title,
    required this.body,
  });

  final Color color;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.labelLarge?.copyWith(color: color, fontSize: 13),
          ),
          const SizedBox(height: 5),
          Text(
            body,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontSize: 12.5,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _KeyValueLine extends StatelessWidget {
  const _KeyValueLine({
    required this.label,
    required this.value,
    this.strong = false,
  });

  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontSize: 12.5,
              color: strong ? AppColors.textPrimary : AppColors.textSecondary,
            ),
          ),
        ),
        const SizedBox(width: 14),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              fontSize: 12.5,
              color: strong ? AppColors.textPrimary : AppColors.textSecondary,
            ),
          ),
        ),
      ],
    );
  }
}

class _StatusMessage extends StatelessWidget {
  const _StatusMessage({required this.message, required this.isError});

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final color = isError ? AppColors.danger : AppColors.activity;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: Theme.of(
          context,
        ).textTheme.bodyMedium?.copyWith(color: color, fontSize: 12.5),
      ),
    );
  }
}

class _ErrorMessage extends StatelessWidget {
  const _ErrorMessage(this.message);

  final String message;

  @override
  Widget build(BuildContext context) {
    return _StatusMessage(message: message, isError: true);
  }
}

class _SmallLoader extends StatelessWidget {
  const _SmallLoader();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      width: 19,
      height: 19,
      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
    );
  }
}

String _bodySummary(UserProfile profile) {
  return '${_activityLabel(profile.activityLevel)} • '
      '${_bodyResponseLabel(profile.bodyResponse)}';
}

String _activityLabel(ActivityLevel value) => switch (value) {
  ActivityLevel.sedentary => 'Gerak minimal',
  ActivityLevel.light => 'Gerak ringan',
  ActivityLevel.moderate => 'Gerak sedang',
  ActivityLevel.active => 'Banyak bergerak',
  ActivityLevel.veryActive => 'Kerja fisik berat',
};

String _activityDescription(ActivityLevel value) => switch (value) {
  ActivityLevel.sedentary =>
    'Sebagian besar hari dihabiskan dengan duduk, di luar olahraga.',
  ActivityLevel.light =>
    'Ada jalan dan gerak ringan dalam rutinitas, di luar olahraga.',
  ActivityLevel.moderate =>
    'Cukup sering berdiri, berjalan, atau bergerak dalam keseharian.',
  ActivityLevel.active =>
    'Sebagian besar hari diisi banyak berdiri dan bergerak.',
  ActivityLevel.veryActive =>
    'Pekerjaan harian menuntut gerak fisik berat dan konsisten.',
};

String _activityImpactTitle(ActivityLevel value) {
  final multiplier = CalorieCalculator.activityMultipliers[value]!;
  final percent = ((multiplier - 1) * 100).round();
  return 'Kebutuhan dasar disesuaikan +$percent%';
}

String _bodyResponseLabel(BodyResponse value) => switch (value) {
  BodyResponse.easyGain => 'Mudah naik',
  BodyResponse.normal => 'Seimbang',
  BodyResponse.hardGain => 'Sulit naik',
};

String _bodyResponseDescription(BodyResponse value) => switch (value) {
  BodyResponse.easyGain => 'Perkiraan kebutuhan diturunkan sekitar 5%.',
  BodyResponse.normal => 'Tidak ada penyesuaian tambahan.',
  BodyResponse.hardGain => 'Perkiraan kebutuhan dinaikkan sekitar 5%.',
};

String _bodyResponseImpactTitle(BodyResponse value) => switch (value) {
  BodyResponse.easyGain => 'Penyesuaian kebutuhan −5%',
  BodyResponse.normal => 'Penyesuaian kebutuhan 0%',
  BodyResponse.hardGain => 'Penyesuaian kebutuhan +5%',
};

String _aiStatusLabel(AiConnectionStatus status) => switch (status) {
  AiConnectionStatus.notConfigured => 'Belum diatur',
  AiConnectionStatus.checking => 'Sedang memeriksa',
  AiConnectionStatus.connected => 'AI online terhubung',
  AiConnectionStatus.invalidKey => 'API key tidak valid',
  AiConnectionStatus.rateLimited => 'Batas provider tercapai',
  AiConnectionStatus.offline => 'Siap diuji',
};

String _aiTestMessage(AiConnectionStatus status) => switch (status) {
  AiConnectionStatus.connected => 'Koneksi AI berhasil.',
  AiConnectionStatus.invalidKey =>
    'API key ditolak provider. Ganti dengan key yang valid.',
  AiConnectionStatus.rateLimited =>
    'Key valid, tetapi batas provider sedang tercapai. Coba lagi nanti.',
  AiConnectionStatus.offline =>
    'Provider belum dapat dijangkau. Periksa internet atau alamat API.',
  AiConnectionStatus.checking => 'Koneksi masih diperiksa.',
  AiConnectionStatus.notConfigured => 'API key belum tersedia.',
};

Color _aiStatusColor(AiConnectionStatus status, {required bool hasKey}) {
  if (!hasKey) return AppColors.textTertiary;
  return switch (status) {
    AiConnectionStatus.connected => AppColors.activity,
    AiConnectionStatus.checking => AppColors.hydration,
    AiConnectionStatus.invalidKey => AppColors.danger,
    AiConnectionStatus.rateLimited => AppColors.warning,
    AiConnectionStatus.offline => AppColors.hydration,
    AiConnectionStatus.notConfigured => AppColors.textTertiary,
  };
}

void _showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.surfaceStrong,
      ),
    );
}

double? _parseDecimal(String text) {
  return double.tryParse(text.trim().replaceAll(',', '.'));
}

String _formatDecimal(double value) {
  return value == value.roundToDouble()
      ? '${value.round()}'
      : value.toStringAsFixed(1).replaceAll('.', ',');
}

String _formatMultiplier(double value) {
  final fixed = value.toStringAsFixed(3);
  return fixed
      .replaceFirst(RegExp(r'0+$'), '')
      .replaceFirst(RegExp(r'\.$'), '');
}

String _formatNumber(num value) {
  final rounded = value.round();
  final digits = rounded.abs().toString();
  final buffer = StringBuffer();
  for (var index = 0; index < digits.length; index++) {
    if (index > 0 && (digits.length - index) % 3 == 0) {
      buffer.write('.');
    }
    buffer.write(digits[index]);
  }
  return '${rounded < 0 ? '-' : ''}$buffer';
}

int _nearestDeficit(int value) {
  const options = <int>[250, 500, 750, 1000];
  return options.reduce(
    (best, candidate) =>
        (candidate - value).abs() < (best - value).abs() ? candidate : best,
  );
}
