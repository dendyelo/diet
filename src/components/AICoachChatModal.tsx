import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { parseFoodNutritionWithAI, sendAICoachChatQuery, UserContextData } from '../services/aiService';
import { X, Send, Sparkles, User, Bot } from 'lucide-react-native';
import { createLocalId } from '../utils/id';
import { useTheme } from '../context/ThemeContext';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sourceTag?: string;
}

interface AICoachChatModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userApiKey?: string;
  userContext: UserContextData;
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

function detectChatIntent(text: string): ChatIntent {
  const lower = text.toLowerCase();
  const isData = DATA_KEYWORDS.some((kw) => lower.includes(kw));
  if (isData) return 'data_query';

  const isFood = FOOD_KEYWORDS.some((kw) => lower.includes(kw));
  if (isFood) return 'food_query';

  return 'general';
}

export const AICoachChatModal: React.FC<AICoachChatModalProps> = ({
  visible,
  onClose,
  userName,
  userApiKey,
  userContext,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Halo ${userName}! Saya Health Coach AI kamu. Ada yang mau ditanyakan tentang pola makan, kalori, atau progres kesehatanmu hari ini?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceTag: 'Data Harian',
    },
  ]);

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, visible]);

  if (!visible) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || inputText).trim();
    if (!queryText || loading) return;

    const userMsg: ChatMessage = {
      id: createLocalId(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    const intent = detectChatIntent(queryText);

    try {
      if (intent === 'food_query') {
        const parsed = await parseFoodNutritionWithAI(queryText, userApiKey);
        let responseText = '';
        if (parsed.itemsBreakdown && parsed.itemsBreakdown.length > 1) {
          const breakdownStr = parsed.itemsBreakdown
            .map((item) => `• ${item.name}: ~${item.calories} kcal`)
            .join('\n');
          responseText = `Estimasi nutrisi untuk "${parsed.name}":\n\n📌 Rincian:\n${breakdownStr}\n\n🔥 Total: ~${parsed.nutrition.calories} kcal | Protein: ${parsed.nutrition.proteinGrams}g | Karbo: ${parsed.nutrition.carbsGrams}g | Lemak: ${parsed.nutrition.fatGrams}g.`;
        } else {
          responseText = `Estimasi nutrisi untuk "${parsed.name}":\n🔥 ~${parsed.nutrition.calories} kcal (Protein: ${parsed.nutrition.proteinGrams}g, Karbo: ${parsed.nutrition.carbsGrams}g, Lemak: ${parsed.nutrition.fatGrams}g).`;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: createLocalId(),
            sender: 'ai',
            text: responseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sourceTag: userApiKey ? 'Gemini Cloud' : 'Estimasi Offline',
          },
        ]);
      } else {
        const aiResponse = (await sendAICoachChatQuery(queryText, userName, userContext, userApiKey)) || 'Maaf, terjadi masalah jaringan saat menghubungi Coach. Tetap jaga hidrasi dan pola makanmu!';

        let tag = 'Gemini Cloud';
        if (aiResponse.includes('Target kalori') || aiResponse.includes('Defisit')) {
          tag = 'Data Harian';
        } else if (!userApiKey) {
          tag = 'Estimasi Offline';
        }

        setMessages((prev) => [
          ...prev,
          {
            id: createLocalId(),
            sender: 'ai',
            text: aiResponse,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sourceTag: tag,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: createLocalId(),
          sender: 'ai',
          text: 'Maaf, terjadi gangguan saat menghubungi Coach. Tetap jaga pola makan dan hidrasimu!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceTag: 'Estimasi Offline',
        },
      ]);
    } finally {
      setLoading(false);
    }
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
            height: '90%',
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
              paddingBottom: spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.primarySubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={{ ...typography.h3, color: colors.textPrimary }}>AI Health Coach</Text>
                <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                  {userApiKey ? '🟢 Online (Gemini AI Cloud)' : '🟡 Offline Mode (Aturan Cerdas)'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <X size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Quick Prompts */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 44, marginVertical: spacing.xs }}
            contentContainerStyle={{ gap: spacing.xs, alignItems: 'center' }}
          >
            {QUICK_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: colors.primarySubtle,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  borderColor: colors.primarySubtle,
                }}
                onPress={() => handleSendMessage(prompt)}
                activeOpacity={0.7}
              >
                <Sparkles size={12} color={colors.primary} />
                <Text style={{ fontSize: 11, color: colors.primaryText, fontWeight: '600' }} numberOfLines={1}>
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Messages Scroll Area */}
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1, marginVertical: 4 }}
            contentContainerStyle={{ paddingVertical: 8, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <View
                  key={msg.id}
                  style={{
                    padding: 12,
                    borderRadius: radius.md,
                    maxWidth: '88%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    backgroundColor: isUser ? colors.primary : colors.surfaceElevated,
                    borderWidth: isUser ? 0 : 1,
                    borderColor: colors.divider,
                    borderBottomRightRadius: isUser ? 4 : radius.md,
                    borderBottomLeftRadius: isUser ? radius.md : 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {isUser ? (
                      <User size={12} color="#FFFFFF" />
                    ) : (
                      <Bot size={12} color={colors.primary} />
                    )}
                    <Text style={{ fontSize: 10, fontWeight: '700', color: isUser ? '#FFFFFF' : colors.textSecondary }} numberOfLines={1}>
                      {isUser ? userName : 'AI Health Coach'}
                    </Text>
                    {msg.sourceTag && !isUser && (
                      <View
                        style={{
                          backgroundColor: colors.primarySubtle,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: colors.primarySubtle,
                        }}
                      >
                        <Text style={{ fontSize: 8, color: colors.primaryText, fontWeight: '600' }}>{msg.sourceTag}</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 9, color: isUser ? 'rgba(255, 255, 255, 0.7)' : colors.textTertiary, marginLeft: 'auto' }} numberOfLines={1}>
                      {msg.timestamp}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: isUser ? '#FFFFFF' : colors.textPrimary, lineHeight: 19 }}>
                    {msg.text}
                  </Text>
                </View>
              );
            })}

            {loading && (
              <View
                style={{
                  padding: 12,
                  borderRadius: radius.md,
                  alignSelf: 'flex-start',
                  backgroundColor: colors.surfaceElevated,
                  borderWidth: 1,
                  borderColor: colors.divider,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primaryText, fontStyle: 'italic' }} numberOfLines={1}>
                  AI Coach sedang menganalisis...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Input Chat Box */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs + 4, borderTopWidth: 1, borderTopColor: colors.divider }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.surfaceElevated,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.divider,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: colors.textPrimary,
                fontSize: 13,
                maxHeight: 80,
              }}
              placeholder="Ketik pertanyaan atau kalori makanan..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline={true}
            />
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (!inputText.trim() || loading) ? 0.4 : 1,
              }}
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
