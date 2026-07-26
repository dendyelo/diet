import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ActivityLog } from '../types';
import {
  ParsedActivity,
  calculateCreditedActivityCalories,
  calculateNetActivityCalories,
} from '../utils/activityCalc';

interface QuickAddActivityModalProps {
  visible: boolean;
  weightKg: number;
  sensorConnected: boolean;
  onClose: () => void;
  onParse: (description: string) => Promise<ParsedActivity>;
  onSave: (activity: Omit<ActivityLog, 'id' | 'timestamp'>) => Promise<void>;
}

export function QuickAddActivityModal({
  visible,
  weightKg,
  sensorConnected,
  onClose,
  onParse,
  onSave,
}: QuickAddActivityModalProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<ParsedActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setPreview(null);
      setError('');
    }
  }, [visible]);

  const calorieEstimate = useMemo(() => {
    if (!preview) return null;
    const estimatedCalories = calculateNetActivityCalories(
      weightKg,
      preview.durationMinutes,
      preview.met
    );
    const creditedCalories = calculateCreditedActivityCalories(
      estimatedCalories,
      preview.stepOverlap,
      sensorConnected
    );
    return { estimatedCalories, creditedCalories };
  }, [preview, sensorConnected, weightKg]);

  const analyze = async () => {
    const cleanDescription = description.trim();
    if (!cleanDescription || loading) return;
    setLoading(true);
    setError('');
    try {
      setPreview(await onParse(cleanDescription));
    } catch {
      setError('Aktivitas belum dapat dianalisis. Sertakan jenis dan durasinya.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!preview || !calorieEstimate || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: preview.name,
        durationMinutes: preview.durationMinutes,
        met: preview.met,
        estimatedCalories: calorieEstimate.estimatedCalories,
        creditedCalories: calorieEstimate.creditedCalories,
        stepOverlap: preview.stepOverlap,
        source: preview.source,
        notes: preview.notes,
      });
      setDescription('');
      setPreview(null);
      onClose();
    } catch {
      setError('Aktivitas belum tersimpan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
            <Pressable onPress={(event) => event.stopPropagation()}>
              <View
                style={{
                  maxHeight: '90%',
                  paddingHorizontal: spacing.md,
                  paddingTop: spacing.sm,
                  paddingBottom: Math.max(spacing.md, insets.bottom),
                  borderTopLeftRadius: radius.xl,
                  borderTopRightRadius: radius.xl,
                  borderWidth: 1,
                  borderBottomWidth: 0,
                  borderColor: colors.divider,
                  backgroundColor: colors.surface,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 4,
                    alignSelf: 'center',
                    marginBottom: spacing.md,
                    borderRadius: 2,
                    backgroundColor: colors.divider,
                  }}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: spacing.md,
                    marginBottom: spacing.md,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.h2, { color: colors.textPrimary }]}>
                      Ceritakan aktivitas
                    </Text>
                    <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 3 }]}>
                      AI membaca jenis, durasi, dan intensitas.
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Tutup pencatatan aktivitas"
                    onPress={onClose}
                    style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Tutup</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: spacing.md }}
                >
                  <View style={{ gap: spacing.sm }}>
                    <Text style={[typography.overline, { color: colors.textTertiary }]}>
                      AKTIVITASMU
                    </Text>
                    <TextInput
                      accessibilityLabel="Cerita aktivitas"
                      multiline
                      value={description}
                      onChangeText={(text) => {
                        setDescription(text);
                        setPreview(null);
                        setError('');
                      }}
                      placeholder="Contoh: treadmill 1 jam dengan kecepatan sedang"
                      placeholderTextColor={colors.textTertiary}
                      style={{
                        minHeight: 92,
                        padding: 14,
                        textAlignVertical: 'top',
                        borderWidth: 1,
                        borderColor: colors.divider,
                        borderRadius: radius.md,
                        backgroundColor: colors.surfaceElevated,
                        color: colors.textPrimary,
                        ...typography.body,
                      }}
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Analisis aktivitas dengan AI"
                      disabled={!description.trim() || loading}
                      onPress={analyze}
                      style={{
                        minHeight: 48,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: radius.md,
                        backgroundColor: colors.primary,
                        opacity: !description.trim() || loading ? 0.42 : 1,
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator color={colors.onPrimary} />
                      ) : (
                        <Text style={[typography.bodyMedium, { color: colors.onPrimary, fontWeight: '600' }]}>
                          Analisis aktivitas
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {error ? (
                    <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger }]}>
                      {error}
                    </Text>
                  ) : null}

                  {preview && calorieEstimate ? (
                    <View
                      style={{
                        padding: spacing.md,
                        gap: spacing.sm,
                        borderWidth: 1,
                        borderColor: colors.primary,
                        borderRadius: radius.md,
                        backgroundColor: colors.primarySubtle,
                      }}
                    >
                      <Text style={[typography.overline, { color: colors.primaryText }]}>
                        HASIL ESTIMASI
                      </Text>
                      <Text style={[typography.h2, { color: colors.textPrimary }]}>
                        {preview.name}
                      </Text>
                      <Text style={[typography.body, { color: colors.textSecondary }]}>
                        {preview.durationMinutes} menit · intensitas {preview.met.toFixed(1)} MET
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 34, lineHeight: 40, color: colors.textPrimary }}>
                          +{calorieEstimate.creditedCalories}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textTertiary }]}>
                          kkal ke kebutuhan hari ini
                        </Text>
                      </View>
                      {sensorConnected && preview.stepOverlap !== 'low' ? (
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>
                          Estimasi awal {calorieEstimate.estimatedCalories} kkal. Sebagian dikurangi karena gerakannya mungkin sudah tercatat sebagai langkah.
                        </Text>
                      ) : null}
                      <Text style={[typography.caption, { color: colors.textTertiary }]}>
                        {preview.notes}
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Simpan aktivitas"
                        disabled={saving}
                        onPress={save}
                        style={{
                          minHeight: 48,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: radius.md,
                          backgroundColor: colors.primary,
                          opacity: saving ? 0.55 : 1,
                        }}
                      >
                        <Text style={[typography.bodyMedium, { color: colors.onPrimary, fontWeight: '600' }]}>
                          {saving ? 'Menyimpan…' : 'Tambahkan ke hari ini'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </ScrollView>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
