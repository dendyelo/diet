import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MealLog, FoodItemBreakdown } from '../types';
import { X, Save, Edit3, Plus, Trash2 } from 'lucide-react-native';

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

    // Auto-update total calories from sum of items
    const newTotal = updated.reduce((acc, it) => acc + it.calories, 0);
    setCalories(newTotal.toString());
  };

  const handleAddItem = () => {
    const updated = [...items, { name: 'Bahan Baru', calories: 100 }];
    setItems(updated);
    const newTotal = updated.reduce((acc, it) => acc + it.calories, 0);
    setCalories(newTotal.toString());
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    const newTotal = updated.reduce((acc, it) => acc + it.calories, 0);
    setCalories(newTotal.toString());
  };

  const handleSave = () => {
    const totalCal = parseInt(calories, 10) || 0;
    const p = parseInt(protein, 10) || 0;
    const c = parseInt(carbs, 10) || 0;
    const f = parseInt(fat, 10) || 0;

    onSaveUpdate(log.id, {
      name: name.trim() || log.name,
      nutrition: {
        calories: totalCal,
        proteinGrams: p,
        carbsGrams: c,
        fatGrams: f,
      },
      itemsBreakdown: items,
    });

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Edit3 size={20} color="#3B82F6" />
              <Text style={styles.sheetTitle}>Edit Log Makanan & Rincian</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Meal Title */}
            <Text style={styles.sectionLabel}>NAMA MAKANAN</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />

            {/* Itemized Food Breakdown List */}
            <View style={styles.itemsHeader}>
              <Text style={styles.sectionLabel}>RINCIAN KALORI PER ITEM</Text>
              <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
                <Plus size={12} color="#3B82F6" />
                <Text style={styles.addBtnText}>+ Tambah Item</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <TextInput
                  style={[styles.input, styles.itemNameInput]}
                  value={item.name}
                  onChangeText={(val) => handleItemNameChange(idx, val)}
                  placeholder="Nama Item"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                />
                <TextInput
                  style={[styles.input, styles.itemCalInput]}
                  value={item.calories.toString()}
                  keyboardType="numeric"
                  onChangeText={(val) => handleItemCalorieChange(idx, val)}
                  placeholder="kcal"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                />
                <Text style={styles.kcalLabel}>kcal</Text>
                <TouchableOpacity onPress={() => handleRemoveItem(idx)} style={styles.removeBtn}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Total Nutrients */}
            <Text style={styles.sectionLabel}>TOTAL NUTRISI GIZI</Text>
            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.subLabel}>TOTAL KALORI (KCAL)</Text>
                <TextInput
                  style={[styles.input, { borderColor: '#10B981', color: '#10B981', fontWeight: 'bold' }]}
                  keyboardType="numeric"
                  value={calories}
                  onChangeText={setCalories}
                />
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.subLabel}>PROTEIN (GRAM)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={setProtein}
                />
              </View>
            </View>

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.subLabel}>KARBOHIDRAT (GRAM)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.subLabel}>LEMAK (GRAM)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={fat}
                  onChangeText={setFat}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
              <Save size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Simpan Perubahan Edit</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 12,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  itemNameInput: {
    flex: 2,
  },
  itemCalInput: {
    flex: 1,
    textAlign: 'center',
  },
  kcalLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  removeBtn: {
    padding: 6,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  grid2: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  gridItem: {
    flex: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    marginBottom: 20,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
