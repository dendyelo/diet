import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';

interface AddWeightModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (weightKg: number, note?: string) => void;
  lastWeight: number | null;
}

export const AddWeightModal: React.FC<AddWeightModalProps> = ({
  visible,
  onClose,
  onSave,
  lastWeight,
}) => {
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setWeight(lastWeight ? lastWeight.toString() : '');
      setNote('');
      setError('');
    }
  }, [visible, lastWeight]);

  const handleSave = () => {
    const parsedWeight = parseFloat(weight.replace(',', '.'));
    if (isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 300) {
      setError('Berat badan harus antara 20 dan 300 kg');
      return;
    }
    
    onSave(parsedWeight, note.trim() !== '' ? note.trim() : undefined);
    setWeight('');
    setNote('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Text style={styles.title}>⚖️ Catat Berat Badan</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={(text) => {
                  setWeight(text);
                  setError('');
                }}
                keyboardType="decimal-pad"
                placeholder={lastWeight ? lastWeight.toString() : '0.0'}
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <Text style={styles.unitText}>kg</Text>
            </View>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Catatan opsional..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
            />
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    backgroundColor: 'rgba(24,24,27,0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  weightInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 100,
  },
  unitText: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 8,
    marginTop: 4,
  },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
