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
import { createLocalId } from '../utils/id';

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
  'Berapa kalori makan pisang goreng?',
  'Lagi lapar malam nih, cemilan sehat apa ya?',
  'Puasa 14 jam ini bikin sedikit pusing, wajar tak?',
  'Defisitku 500 kcal hari ini, boleh makan bakso?',
];

type ChatIntent = 'food_query' | 'data_query' | 'general';

const DATA_KEYWORDS = [
  'langkah', 'step', 'steps', 'jalan',
  'kalori masuk', 'kalori saya', 'total kalori', 'berapa kalori saya',
  'defisit', 'surplus',
  'air', 'minum', 'gelas',
  'puasa', 'fasting', 'berpuasa',
  'progres', 'progress', 'status', 'kondisi saya', 'data saya', 'ringkasan',
];

const FOOD_KEYWORDS = [
  'kalori', 'kcal', 'nutrisi', 'gizi',
  'makan', 'porsi', 'mangkok', 'piring',
  'nasi', 'ayam', 'ikan', 'telur', 'roti', 'bakso', 'mie', 'sate',
  'goreng', 'bakar', 'rebus', 'kukus', 'panggang', 'tumis', 'gulai', 'rendang',
  'cemilan', 'snack', 'kue', 'pisang', 'buah',
  'kopi', 'teh', 'susu', 'jus',
];

function classifyIntent(query: string): ChatIntent {
  const lower = query.toLowerCase();

  // Data queries: user asking about their own stats
  const isDataQuery = DATA_KEYWORDS.some((kw) => lower.includes(kw));
  const isQuestion = lower.includes('?') || lower.startsWith('berapa') || lower.startsWith('sudah') ||
    lower.startsWith('apa') || lower.startsWith('gimana') || lower.startsWith('bagaimana') ||
    lower.startsWith('kapan');

  // If asking about personal data (e.g. "berapa langkah saya")
  if (isDataQuery && isQuestion && !FOOD_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'data_query';
  }
  // Also catch "berapa langkah" without question mark
  if (isDataQuery && (lower.includes('saya') || lower.includes('ku') || lower.includes('aku'))) {
    return 'data_query';
  }

  // Food queries: mentions specific food items or asks about calories of food
  const isFoodQuery = FOOD_KEYWORDS.some((kw) => lower.includes(kw));
  if (isFoodQuery) {
    return 'food_query';
  }

  // Default: general conversation/question
  return 'general';
}

interface UserContextData {
  fastingHours: number;
  caloriesIn: number;
  netDeficit: number;
  steps: number;
  waterGlasses: number;
}

function generateDataResponse(query: string, userName: string, ctx: UserContextData): string {
  const lower = query.toLowerCase();
  const name = userName || 'Teman';

  if (lower.includes('langkah') || lower.includes('step') || lower.includes('jalan')) {
    const target = 10000;
    const pct = Math.min(100, Math.round((ctx.steps / target) * 100));
    if (ctx.steps >= target) {
      return `🏃 Luar biasa ${name}! Kamu sudah mencapai **${ctx.steps.toLocaleString()} langkah** hari ini — target ${target.toLocaleString()} langkah tercapai 🎉!\n\nPertahankan aktivitasmu yang konsisten ini. Langkah harian yang cukup membantu menjaga kesehatan jantung dan pembakaran kalori aktif.`;
    }
    return `🏃 Langkah kamu hari ini: **${ctx.steps.toLocaleString()} langkah** (${pct}% dari target ${target.toLocaleString()}).\n\nSisa ${(target - ctx.steps).toLocaleString()} langkah lagi. Coba jalan kaki 10-15 menit untuk mendekati target!`;
  }

  if (lower.includes('air') || lower.includes('minum') || lower.includes('gelas')) {
    const target = 8;
    if (ctx.waterGlasses >= target) {
      return `💧 Mantap ${name}! Kamu sudah minum **${ctx.waterGlasses}/${target} gelas** hari ini — target hidrasi tercapai 🎉!\n\nTetap minum sesuai rasa haus. Hidrasi yang cukup menjaga metabolisme tetap optimal.`;
    }
    return `💧 Kamu sudah minum **${ctx.waterGlasses}/${target} gelas** hari ini.\n\nSisa ${target - ctx.waterGlasses} gelas lagi. Coba letakkan botol minum di dekatmu sebagai pengingat!`;
  }

  if (lower.includes('puasa') || lower.includes('fasting') || lower.includes('berpuasa')) {
    if (ctx.fastingHours > 0) {
      return `⏱️ Kamu sudah berpuasa selama **${ctx.fastingHours} jam**, ${name}!\n\n${ctx.fastingHours >= 16 ? 'Kamu sudah melewati jendela 16 jam — fase autophagy aktif 🔥. Pertahankan jika nyaman!' : ctx.fastingHours >= 12 ? 'Sudah melewati 12 jam — pembakaran lemak mulai meningkat. Kuat terus! 💪' : 'Teruskan puasamu. Pembakaran lemak biasanya dimulai setelah 12 jam.'}`;
    }
    return `⏱️ Kamu tidak sedang berpuasa saat ini, ${name}. Jika ingin memulai intermittent fasting, waktu terbaik biasanya dimulai setelah makan malam terakhir.`;
  }

  if (lower.includes('defisit') || lower.includes('surplus')) {
    if (ctx.netDeficit >= 0) {
      return `📊 Status energi hari ini: **Defisit ${ctx.netDeficit} kcal** — kamu dalam jalur yang tepat, ${name} 🟢!\n\nKalori masuk: ${ctx.caloriesIn} kcal. Pertahankan pola ini untuk progres yang konsisten.`;
    }
    return `📊 Status energi hari ini: **Surplus ${Math.abs(ctx.netDeficit)} kcal** 🟠.\n\nKalori masuk: ${ctx.caloriesIn} kcal. Tidak perlu panik — tambahkan aktivitas fisik atau kurangi sedikit porsi di makan berikutnya.`;
  }

  // General data summary
  return `📋 Ringkasan harimu, ${name}:\n\n🔥 Kalori masuk: **${ctx.caloriesIn} kcal**\n📊 Status: **${ctx.netDeficit >= 0 ? `Defisit ${ctx.netDeficit}` : `Surplus ${Math.abs(ctx.netDeficit)}`} kcal**\n🏃 Langkah: **${ctx.steps.toLocaleString()}**\n💧 Air: **${ctx.waterGlasses}/8 gelas**\n⏱️ Puasa: **${ctx.fastingHours} jam**\n\nTerus pantau dan konsisten! 💪`;
}

function generateOfflineCoachResponse(query: string, userName: string, ctx: UserContextData): string {
  const name = userName || 'Teman';
  const lower = query.toLowerCase();

  if (lower.includes('lapar') || lower.includes('hungry')) {
    if (ctx.fastingHours > 0) {
      return `Aku paham rasa lapar saat puasa bisa mengganggu, ${name}. Coba minum air putih dulu — sering kali tubuh bingung antara lapar dan haus.\n\nJika sudah melewati ${ctx.fastingHours} jam puasa dan merasa lemas, tidak apa-apa untuk memulai eating window-mu. Dengarkan tubuhmu! 🙏`;
    }
    return `Lapar itu wajar, ${name}! Coba cemilan sehat seperti buah, kacang almond, atau yoghurt rendah lemak.\n\nKalori masukmu saat ini ${ctx.caloriesIn} kcal. ${ctx.netDeficit >= 0 ? 'Masih ada ruang untuk cemilan sehat!' : 'Pilih cemilan rendah kalori agar tetap seimbang.'}`;
  }

  if (lower.includes('pusing') || lower.includes('lemas') || lower.includes('capek') || lower.includes('lelah')) {
    return `Pusing atau lemas bisa disebabkan beberapa hal, ${name}:\n\n1. **Dehidrasi** — kamu baru minum ${ctx.waterGlasses}/8 gelas. Coba minum air segera.\n2. **Gula darah rendah** — jika sedang puasa ${ctx.fastingHours} jam, pertimbangkan untuk makan.\n3. **Kurang tidur** atau stres.\n\nJika berlanjut, jangan ragu untuk makan dan istirahat. Kesehatan lebih penting dari target kalori! ❤️`;
  }

  if (lower.includes('saran') || lower.includes('tips') || lower.includes('rekomendasi')) {
    return `Berikut tips untuk hari ini, ${name}:\n\n${ctx.waterGlasses < 6 ? '💧 Tingkatkan minum air — baru ' + ctx.waterGlasses + '/8 gelas.\n' : ''}${ctx.steps < 5000 ? '🏃 Coba tambahkan jalan kaki 15 menit.\n' : ''}${ctx.netDeficit < 0 ? '🍽️ Kurangi sedikit porsi di makan berikutnya.\n' : '🟢 Defisitmu aman — pertahankan!\n'}\nKonsistensi lebih penting dari kesempurnaan. Kamu sudah di jalur yang benar! 💪`;
  }

  // Generic fallback
  return `Terima kasih bertanya, ${name}! Saya AI Coach yang lebih optimal jika terhubung ke Gemini Cloud.\n\nSaat ini saya bisa menjawab:\n• Pertanyaan tentang **kalori makanan** (misal: "berapa kalori nasi goreng?")\n• **Data harian** kamu (langkah, air, puasa, defisit)\n• **Tips kesehatan** umum\n\nUntuk jawaban yang lebih cerdas dan personal, konfigurasi API key Gemini di halaman Profil.`;
}

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

    const userMsgId = createLocalId('chat');
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      let replyText = '';

      // --- 1. Try Gemini Cloud first if API key is configured ---
      if (userApiKey && userApiKey.trim() !== '') {
        const key = userApiKey.trim();
        const prompt = `Anda adalah AI Health Coach pribadi bernama HabitDiet Coach.
Karakter Anda: Sangat ramah, empati, bijak, hangat, humoris santai, dan paham kuliner Indonesia.

KONTEKS REAL-TIME PENGGUNA SAAT INI:
- Nama: ${userName}
- Berpuasa: ${userContext.fastingHours} jam
- Total Kalori Masuk (Dimakan): ${userContext.caloriesIn} kcal
- Defisit Kalori Realtime: ${userContext.netDeficit} kcal
- Langkah Kaki: ${userContext.steps} steps
- Air Minum: ${userContext.waterGlasses} / 8 gelas

PERTANYAAN PENGGUNA: "${query}"

Instruksi: Jawablah pertanyaan pengguna secara informatif, ramah, dan empati. Jika pengguna menanyakan tentang makanan spesifik (misal: pisang goreng, bakso, nasi goreng, dll), berikan estimasi kalori dan nutrisinya. Jika pengguna menanyakan data pribadinya (langkah, kalori, air, puasa), jawab berdasarkan konteks real-time di atas. Berikan saran praktis 2-3 paragraf singkat.`;

        const modelsToTry = [
          'gemini-2.5-flash',
          'gemini-3.5-flash',
          'gemini-3.6-flash',
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-3.1-flash-lite-preview',
          'gemini-3-flash-preview',
          'gemini-flash-latest',
          'gemini-flash-lite-latest',
          'gemma-4-31b-it',
          'gemma-4-26b-a4b-it',
        ];
        for (const model of modelsToTry) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                }),
                signal: controller.signal,
              }
            );

            if (response.ok) {
              const data = await response.json();
              replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (replyText) break;
            }
            if (response.status === 401 || response.status === 403) break;
          } catch (fetchErr) {
            console.warn(`Gemini Cloud chat for ${model} failed:`, fetchErr);
          } finally {
            clearTimeout(timeoutId);
          }
        }
      }

      // --- 2. Offline fallback: classify intent ---
      if (!replyText) {
        const intent = classifyIntent(query);

        if (intent === 'data_query') {
          replyText = generateDataResponse(query, userName, userContext);
        } else if (intent === 'food_query') {
          const foodResult = await parseFoodNutritionWithAI(query, undefined); // force offline engine
          replyText = `1 Porsi **${foodResult.name}** diperkirakan mengandung sekitar **${foodResult.nutrition.calories} kcal** (Protein: ${foodResult.nutrition.proteinGrams}g, Karbo: ${foodResult.nutrition.carbsGrams}g, Lemak: ${foodResult.nutrition.fatGrams}g).\n\nKalori masukmu saat ini ${userContext.caloriesIn} kcal. ${userContext.netDeficit >= 0 ? 'Sisa target defisit kalori harianmu sangat terjaga 🟢!' : `Kamu sudah surplus ${Math.abs(userContext.netDeficit)} kcal, pertimbangkan untuk bergerak lebih aktif 🟠.`}`;
        } else {
          replyText = generateOfflineCoachResponse(query, userName, userContext);
        }
      }

      const aiMsgId = createLocalId('chat');
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: replyText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: any) {
      const errMsgId = createLocalId('chat');
      const errBubble: ChatMessage = {
        id: errMsgId,
        sender: 'ai',
        text: '⚠️ Terjadi gangguan koneksi. Mohon periksa jaringan internet Anda.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errBubble]);
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
                <Text style={styles.sheetTitle} numberOfLines={1}>Chat AI Health Coach</Text>
                <Text style={styles.sheetSub} numberOfLines={1}>Tanya bebas kondisi & konsultasi gizi real-time</Text>
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
                <Text style={styles.quickPromptText} numberOfLines={1}>{prompt}</Text>
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
                    <Text style={styles.bubbleSender} numberOfLines={1}>
                      {isUser ? userName : 'AI Health Coach'}
                    </Text>
                    <Text style={styles.bubbleTime} numberOfLines={1}>{msg.timestamp}</Text>
                  </View>
                  <Text style={styles.bubbleText}>{msg.text}</Text>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.loadingText} numberOfLines={1}>AI Coach sedang menganalisis...</Text>
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
