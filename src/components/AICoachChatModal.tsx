import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { parseFoodNutritionWithAI } from '../services/aiService';
import { X, Send, Sparkles, User, Bot } from 'lucide-react-native';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface AICoachChatModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userApiKey?: string;
  userContext: {
    fastingHours: number;
    caloriesIn: number;
    netDeficit: number;
    steps: number;
    waterGlasses: number;
  };
}

const QUICK_PROMPTS = [
  'Lagi lapar malam nih, cemilan sehat apa ya?',
  'Berapa kalori makan pisang goreng?',
  'Puasa 14 jam ini bikin sedikit pusing, wajar tak?',
  'Defisitku 500 kcal hari ini, boleh makan bakso?',
];

export const AICoachChatModal: React.FC<AICoachChatModalProps> = ({
  visible,
  onClose,
  userName,
  userApiKey,
  userContext,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Halo ${userName}! 👋 Saya HabitDiet AI Coach pribadi Anda. Ceritakan apa yang sedang Anda rasakan atau tanyakan kalori makanan (misal: pisang goreng, nasi uduk, lemas, pusing), saya siap membantu!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [visible, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText.trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      let replyText = '';

      if (userApiKey && userApiKey.trim() !== '') {
        const prompt = `Anda adalah Pakar Gizi, Personal Trainer & AI Health Coach pribadi bernama HabitDiet Coach.
Karakter Anda: Sangat ramah, empati, bijak, hangat, humoris santai, dan paham kuliner Indonesia.

KONTEKS REAL-TIME PENGGUNA SAAT INI:
- Nama: ${userName}
- Berpuasa: ${userContext.fastingHours} jam
- Total Kalori Masuk (Dimakan): ${userContext.caloriesIn} kcal
- Defisit Kalori Realtime: ${userContext.netDeficit} kcal
- Langkah Kaki: ${userContext.steps} steps
- Air Minum: ${userContext.waterGlasses} / 8 gelas

PERTANYAAN PENGGUNA: "${query}"

Instruksi: Jawablah pertanyaan pengguna secara presisi, akurat, ramah, dan empati. Jika pengguna menanyakan tentang makanan spesifik (misal: pisang goreng, bakso, nasi goreng, dll), SEBUTKAN KALORI DAN NUTRISI SPESIFIK MAKANAN TERSEBUT SECARA AKURAT. Berikan saran praktis 2-3 paragraf singkat.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userApiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      }

      // Smart Fallback Engine (Dynamic Food Nutrition Lookup)
      if (!replyText) {
        const lowerQ = query.toLowerCase();

        if (lowerQ.includes('pusing') || lowerQ.includes('lemas')) {
          replyText = `Merasakan sedikit pusing atau lemas saat berpuasa (${userContext.fastingHours} jam) biasanya disebabkan oleh penurunan kadar gula darah atau kekurangan cairan. Cobalah minum 1-2 gelas air putih hangat diberi sejumput garam dapur atau batalkan puasa dengan makanan bernutrisi ringan.`;
        } else if (lowerQ.includes('lapar malam')) {
          replyText = `Untuk mengatasi lapar malam tanpa merusak defisit kalori (saat ini ${userContext.netDeficit} kcal), pilihlah cemilan rendah kalori seperti 1 butir telur rebus (78 kcal) atau minum 1 gelas air hangat dulu untuk mengecek hidrasi!`;
        } else {
          // Dynamic Food Nutrition Lookup for ANY food query
          const foodResult = await parseFoodNutritionWithAI(query, userApiKey);
          replyText = `1 Porsi ${foodResult.name} diperkirakan mengandung sekitar **${foodResult.nutrition.calories} kcal** (Protein: ${foodResult.nutrition.proteinGrams}g, Karbo: ${foodResult.nutrition.carbsGrams}g, Lemak: ${foodResult.nutrition.fatGrams}g).\n\nKalori masukmu saat ini ${userContext.caloriesIn} kcal. ${foodResult.aiNotes || ''}`;
        }
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: replyText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('Error sending AI chat:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.botIconBox}>
                <Bot size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Chat AI Health Coach</Text>
                <Text style={styles.sheetSub}>Tanya bebas kondisi & konsultasi gizi real-time</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>

          {/* Quick Prompts Bar */}
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={styles.quickPromptsScroll}
            contentContainerStyle={styles.quickPromptsContainer}
          >
            {QUICK_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickPromptChip}
                onPress={() => handleSendMessage(prompt)}
              >
                <Sparkles size={12} color="#10B981" />
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Messages Scroll Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <View style={styles.bubbleHeader}>
                    {isUser ? (
                      <User size={12} color="#60A5FA" />
                    ) : (
                      <Bot size={12} color="#10B981" />
                    )}
                    <Text style={styles.bubbleSender}>
                      {isUser ? userName : 'AI Health Coach'}
                    </Text>
                    <Text style={styles.bubbleTime}>{msg.timestamp}</Text>
                  </View>
                  <Text style={styles.bubbleText}>{msg.text}</Text>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.loadingText}>AI Coach sedang menganalisis...</Text>
              </View>
            )}
          </ScrollView>

          {/* Input Chat Box */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Ketik pertanyaan atau kalori makanan..."
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={inputText}
              onChangeText={setInputText}
              multiline={true}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
            >
              <Send size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
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
    padding: 16,
    height: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sheetSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  closeBtn: {
    padding: 6,
  },
  quickPromptsScroll: {
    maxHeight: 44,
    marginVertical: 8,
  },
  quickPromptsContainer: {
    gap: 8,
    alignItems: 'center',
  },
  quickPromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  quickPromptText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    marginVertical: 4,
  },
  messagesContent: {
    paddingVertical: 8,
    gap: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '88%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 4,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#10B981',
    fontStyle: 'italic',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bubbleSender: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bubbleTime: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 'auto',
  },
  bubbleText: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 19,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
    maxHeight: 80,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
