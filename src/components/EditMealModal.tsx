import React, { useEffect, useState } from 'react';
import {
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
import { MealLog, FoodItemBreakdown } from '../types';
import { useTheme } from '../context/ThemeContext';
import { createMealTimestamp, formatMealTime } from '../utils/mealTimestamp';

interface EditMealModalProps {
  visible: boolean;
  log: MealLog | null;
  onClose: () => void;
  onSaveUpdate: (id: string, updatedFields: Partial<MealLog>) => void;
}

export const EditMealModal: React.FC<EditMealModalProps> = ({
  visible,
  log,
  onClose,
  onSaveUpdate,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [isSnack, setIsSnack] = useState(false);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [items, setItems] = useState<FoodItemBreakdown[]>([]);
  const [mealTime, setMealTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (log) {
      setName(log.name);
      setIsSnack(log.isSnack);
      setCalories(String(log.nutrition.calories));
      setProtein(String(log.nutrition.proteinGrams));
      setCarbs(String(log.nutrition.carbsGrams));
      setFat(String(log.nutrition.fatGrams));
      setItems(log.itemsBreakdown ? log.itemsBreakdown.map((item) => ({ ...item })) : []);
      setMealTime(formatMealTime(new Date(log.timestamp)));
      setError('');
    }
  }, [log]);

  if (!log) return null;

  const handleItemNameChange = (index: number, newName: string) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, name: newName } : item
      )
    );
  };

  const handleItemCalorieChange = (index: number, newCalories: string) => {
    const parsedCalories = Number.parseInt(newCalories, 10);
    setItems((current) => {
      const updated = current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              calories: Number.isFinite(parsedCalories) ? Math.max(0, parsedCalories) : 0,
            }
          : item
      );
      const total = updated.reduce((sum, item) => sum + item.calories, 0);
      if (total > 0) setCalories(String(total));
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((current) => [...current, { name: '', calories: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((current) => {
      const updated = current.filter((_, itemIndex) => itemIndex !== index);
      const total = updated.reduce((sum, item) => sum + item.calories, 0);
      if (total > 0) setCalories(String(total));
      return updated;
    });
  };

  const handleSave = () => {
    const parsedCalories = Number.parseInt(calories, 10);
    const parsedProtein = Number.parseFloat(protein.replace(',', '.'));
    const parsedCarbs = Number.parseFloat(carbs.replace(',', '.'));
    const parsedFat = Number.parseFloat(fat.replace(',', '.'));

    if (!name.trim()) {
      setError('Nama makanan tidak boleh kosong.');
      return;
    }
    if (!Number.isFinite(parsedCalories) || parsedCalories <= 0) {
      setError('Kalori harus lebih dari 0.');
      return;
    }
    if (
      [parsedProtein, parsedCarbs, parsedFat].some(
        (value) => !Number.isFinite(value) || value < 0
      )
    ) {
      setError('Makro harus berupa angka 0 atau lebih.');
      return;
    }
    const timestamp = createMealTimestamp(mealTime);
    if (!timestamp) {
      setError(
        'Waktu tidak valid atau berada di masa depan. Gunakan format HH:MM.'
      );
      return;
    }

    const cleanItems = items
      .map((item) => ({ name: item.name.trim(), calories: item.calories }))
      .filter((item) => item.name && item.calories >= 0);

    onSaveUpdate(log.id, {
      name: name.trim(),
      isSnack,
      timestamp,
      nutrition: {
        calories: parsedCalories,
        proteinGrams: parsedProtein,
        carbsGrams: parsedCarbs,
        fatGrams: parsedFat,
      },
      itemsBreakdown: cleanItems.length > 0 ? cleanItems : undefined,
    });
    onClose();
  };

  const fieldStyle = {
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    fontSize: 14,
  } as const;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose}>
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: colors.overlay,
            }}
          >
            <Pressable onPress={(event) => event.stopPropagation()}>
              <View
                style={{
                  maxHeight: '92%',
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
                    borderRadius: 2,
                    alignSelf: 'center',
                    backgroundColor: colors.divider,
                    marginBottom: spacing.md,
                  }}
                />

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: spacing.md,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.h2, color: colors.textPrimary }}>Edit asupan</Text>
                    <Text
                      style={{
                        ...typography.caption,
                        color: colors.textTertiary,
                        marginTop: 3,
                      }}
                    >
                      Koreksi waktu, nama, jenis, atau nutrisi.
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Tutup edit asupan"
                    onPress={onClose}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ ...typography.caption, color: colors.textSecondary }}>Tutup</Text>
                  </TouchableOpacity>
                </View>

                {error ? (
                  <View
                    accessibilityRole="alert"
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: spacing.sm,
                      borderWidth: 1,
                      borderColor: colors.danger,
                      borderRadius: radius.sm,
                      backgroundColor: colors.dangerSubtle,
                    }}
                  >
                    <Text style={{ ...typography.caption, color: colors.danger }}>{error}</Text>
                  </View>
                ) : null}

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xs }}
                >
                  <View style={{ gap: spacing.sm }}>
                    <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                      JENIS
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        padding: 3,
                        borderRadius: radius.md,
                        backgroundColor: colors.surfaceElevated,
                      }}
                    >
                      {[
                        { label: 'Makan', value: false },
                        { label: 'Snack', value: true },
                      ].map((option) => {
                        const selected = option.value === isSnack;
                        return (
                          <TouchableOpacity
                            key={option.label}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() => setIsSnack(option.value)}
                            style={{
                              flex: 1,
                              minHeight: 40,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: radius.sm,
                              borderWidth: selected ? 1 : 0,
                              borderColor: colors.divider,
                              backgroundColor: selected ? colors.surface : 'transparent',
                            }}
                          >
                            <Text
                              style={{
                                ...typography.caption,
                                color: selected ? colors.textPrimary : colors.textTertiary,
                              }}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ gap: spacing.sm }}>
                    <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                      WAKTU HARI INI
                    </Text>
                    <TextInput
                      accessibilityLabel="Edit waktu makan hari ini format jam dan menit"
                      style={[fieldStyle, { textAlign: 'center' }]}
                      value={mealTime}
                      onChangeText={(text) => {
                        setMealTime(text);
                        setError('');
                      }}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>

                  <View style={{ gap: spacing.sm }}>
                    <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                      NAMA
                    </Text>
                    <TextInput
                      accessibilityLabel="Nama makanan"
                      style={fieldStyle}
                      value={name}
                      onChangeText={(text) => {
                        setName(text);
                        setError('');
                      }}
                    />
                  </View>

                  <View style={{ gap: spacing.sm }}>
                    <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                      NUTRISI
                    </Text>
                    <TextInput
                      accessibilityLabel="Kalori"
                      style={fieldStyle}
                      keyboardType="number-pad"
                      value={calories}
                      onChangeText={(text) => {
                        setCalories(text);
                        setError('');
                      }}
                      placeholder="Kalori"
                      placeholderTextColor={colors.textTertiary}
                    />
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      {[
                        { label: 'Protein', value: protein, setter: setProtein },
                        { label: 'Karbo', value: carbs, setter: setCarbs },
                        { label: 'Lemak', value: fat, setter: setFat },
                      ].map((macro) => (
                        <View key={macro.label} style={{ flex: 1, gap: spacing.xs }}>
                          <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                            {macro.label}
                          </Text>
                          <TextInput
                            accessibilityLabel={`${macro.label} dalam gram`}
                            style={[fieldStyle, { paddingHorizontal: 10 }]}
                            keyboardType="decimal-pad"
                            value={macro.value}
                            onChangeText={(text) => {
                              macro.setter(text);
                              setError('');
                            }}
                          />
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={{ gap: spacing.sm }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ ...typography.overline, color: colors.textTertiary }}>
                        RINCIAN
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={handleAddItem}
                        style={{
                          minHeight: 40,
                          justifyContent: 'center',
                          paddingHorizontal: 8,
                        }}
                      >
                        <Text style={{ ...typography.caption, color: colors.primaryText }}>
                          Tambah item
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {items.length === 0 ? (
                      <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                        Tidak ada rincian komponen.
                      </Text>
                    ) : (
                      <View
                        style={{
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: colors.divider,
                          borderRadius: radius.md,
                        }}
                      >
                        {items.map((item, index) => (
                          <View
                            key={index}
                            style={{
                              minHeight: 52,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: spacing.sm,
                              paddingHorizontal: 12,
                              borderTopWidth: index === 0 ? 0 : 1,
                              borderTopColor: colors.divider,
                            }}
                          >
                            <TextInput
                              accessibilityLabel={`Nama item ${index + 1}`}
                              style={{
                                flex: 1,
                                color: colors.textPrimary,
                                ...typography.bodyMedium,
                                paddingVertical: 8,
                              }}
                              value={item.name}
                              onChangeText={(text) => handleItemNameChange(index, text)}
                              placeholder="Nama item"
                              placeholderTextColor={colors.textTertiary}
                            />
                            <TextInput
                              accessibilityLabel={`Kalori item ${index + 1}`}
                              style={{
                                width: 58,
                                color: colors.textPrimary,
                                ...typography.bodyMedium,
                                textAlign: 'right',
                                paddingVertical: 8,
                              }}
                              keyboardType="number-pad"
                              value={String(item.calories)}
                              onChangeText={(text) => handleItemCalorieChange(index, text)}
                            />
                            <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                              kkal
                            </Text>
                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel={`Hapus item ${item.name || index + 1}`}
                              onPress={() => handleRemoveItem(index)}
                              style={{
                                minWidth: 44,
                                minHeight: 44,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ ...typography.caption, color: colors.danger }}>
                                Hapus
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    onPress={handleSave}
                    style={{
                      minHeight: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radius.md,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.bodyMedium,
                        color: colors.onPrimary,
                        fontWeight: '600',
                      }}
                    >
                      Simpan perubahan
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
