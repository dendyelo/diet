import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MealLog, FoodItemBreakdown } from '../types';
import { X, Save, Edit3, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

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
  const [name, setName] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const [items, setItems] = useState<FoodItemBreakdown[]>([]);

  useEffect(() => {
    if (log) {
      setName(log.name);
      setCalories(log.nutrition.calories.toString());
      setProtein(log.nutrition.proteinGrams.toString());
      setCarbs(log.nutrition.carbsGrams.toString());
      setFat(log.nutrition.fatGrams.toString());
      setItems(log.itemsBreakdown ? [...log.itemsBreakdown] : []);
    }
  }, [log]);

  if (!log) return null;

  const handleItemNameChange = (index: number, newName: string) => {
    const updated = [...items];
    updated[index].name = newName;
    setItems(updated);
  };

  const handleItemCalorieChange = (index: number, newCalStr: string) => {
    const updated = [...items];
    const val = parseInt(newCalStr, 10) || 0;
    updated[index].calories = val;
    setItems(updated);

    const sum = updated.reduce((acc, curr) => acc + (curr.calories || 0), 0);
    if (sum > 0) setCalories(sum.toString());
  };

  const handleAddItem = () => {
    setItems([...items, { name: 'Item Baru', calories: 100 }]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    const sum = updated.reduce((acc, curr) => acc + (curr.calories || 0), 0);
    if (sum > 0) setCalories(sum.toString());
  };

  const handleSave = () => {
    const parsedCal = parseInt(calories, 10) || log.nutrition.calories;
    const parsedProtein = parseFloat(protein) || log.nutrition.proteinGrams;
    const parsedCarbs = parseFloat(carbs) || log.nutrition.carbsGrams;
    const parsedFat = parseFloat(fat) || log.nutrition.fatGrams;

    onSaveUpdate(log.id, {
      name: name.trim() || log.name,
      nutrition: {
        calories: parsedCal,
        proteinGrams: parsedProtein,
        carbsGrams: parsedCarbs,
        fatGrams: parsedFat,
      },
      itemsBreakdown: items.length > 0 ? items : undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing.md,
            maxHeight: '90%',
            borderWidth: 1,
            borderColor: colors.divider,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
              paddingBottom: spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Edit3 size={18} color={colors.primary} />
              <Text style={{ ...typography.h3, color: colors.textPrimary }}>Edit Makanan</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
            {/* Meal Name */}
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' }}>Nama Makanan</Text>
              <TextInput
                style={{
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.divider,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: colors.textPrimary,
                  fontSize: 14,
                }}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Total Calories & Macros */}
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' }}>Ringkasan Nutrisi</Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs + 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginBottom: 2 }}>Kalori (kcal)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 10, paddingVertical: 8, color: colors.primaryText, fontSize: 13, fontWeight: 'bold' }}
                    keyboardType="number-pad"
                    value={calories}
                    onChangeText={setCalories}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginBottom: 2 }}>Protein (g)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 10, paddingVertical: 8, color: colors.textPrimary, fontSize: 13 }}
                    keyboardType="decimal-pad"
                    value={protein}
                    onChangeText={setProtein}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginBottom: 2 }}>Karbo (g)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 10, paddingVertical: 8, color: colors.textPrimary, fontSize: 13 }}
                    keyboardType="decimal-pad"
                    value={carbs}
                    onChangeText={setCarbs}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginBottom: 2 }}>Lemak (g)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: 10, paddingVertical: 8, color: colors.textPrimary, fontSize: 13 }}
                    keyboardType="decimal-pad"
                    value={fat}
                    onChangeText={setFat}
                  />
                </View>
              </View>
            </View>

            {/* Item Breakdown List */}
            <View style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' }}>Rincian Komponen Makanan</Text>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={handleAddItem}>
                  <Plus size={12} color={colors.primary} />
                  <Text style={{ fontSize: 11, color: colors.primaryText, fontWeight: '700' }}>Tambah Item</Text>
                </TouchableOpacity>
              </View>

              {items.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceElevated, padding: 8, borderRadius: radius.sm }}>
                  <TextInput
                    style={{ flex: 2, color: colors.textPrimary, fontSize: 13, paddingVertical: 4 }}
                    value={item.name}
                    onChangeText={(val) => handleItemNameChange(idx, val)}
                  />
                  <TextInput
                    style={{ flex: 1, color: colors.info, fontSize: 13, fontWeight: 'bold', textAlign: 'right', paddingVertical: 4 }}
                    keyboardType="number-pad"
                    value={item.calories.toString()}
                    onChangeText={(val) => handleItemCalorieChange(idx, val)}
                  />
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>kcal</Text>
                  <TouchableOpacity onPress={() => handleRemoveItem(idx)} style={{ padding: 4 }}>
                    <Trash2 size={14} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: radius.md,
                marginTop: spacing.sm,
              }}
              onPress={handleSave}
            >
              <Save size={18} color="#FFFFFF" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Simpan Perubahan</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
