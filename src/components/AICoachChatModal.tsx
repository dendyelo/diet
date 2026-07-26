import React, { useEffect, useRef, useState } from 'react';
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
import {
  AIChatHistoryItem,
  parseFoodNutritionWithAI,
  sendStructuredAICoachChatQuery,
  UserContextData,
} from '../services/aiService';
import { AIConnectionStatus } from '../types';
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
  connectionStatus: AIConnectionStatus;
  starterPrompt?: string | null;
  userContext: UserContextData;
}

const QUICK_PROMPTS = [
  { label: 'Makan berikutnya', prompt: 'Makan apa yang paling masuk akal dari data hari ini?' },
  { label: 'Lapar malam', prompt: 'Aku lapar malam ini. Langkah apa yang paling masuk akal?' },
  { label: 'Cukup protein?', prompt: 'Apakah protein saya hari ini sudah cukup?' },
  { label: 'Kalori gorengan', prompt: 'Berapa perkiraan nutrisi dua pisang goreng?' },
];

type ChatIntent = 'food_estimate' | 'coach';

const DATA_KEYWORDS = [
  'langkah',
  'step',
  'steps',
  'jalan',
  'kalori masuk',
  'kalori saya',
  'total kalori',
  'berapa kalori saya',
  'defisit',
  'surplus',
  'air',
  'minum',
  'gelas',
  'puasa',
  'fasting',
  'berpuasa',
  'progres',
  'progress',
  'status',
  'kondisi saya',
  'data saya',
  'ringkasan',
];

const FOOD_KEYWORDS = [
  'kalori',
  'kcal',
  'nutrisi',
  'gizi',
  'makan',
  'porsi',
  'mangkok',
  'piring',
  'nasi',
  'ayam',
  'ikan',
  'telur',
  'roti',
  'bakso',
  'mie',
  'sate',
  'goreng',
  'bakar',
  'rebus',
  'kukus',
  'panggang',
  'tumis',
  'gulai',
  'rendang',
  'cemilan',
  'snack',
  'kue',
  'pisang',
  'buah',
  'kopi',
  'teh',
  'susu',
  'jus',
];

const CONTEXT_KEYWORDS = [
  'aku',
  'saya',
  'boleh',
  'cocok',
  'pas',
  'hari ini',
  'berikutnya',
  'lapar',
  'target',
  'sisa',
  'lebih baik',
  'sebaiknya',
];

function detectChatIntent(text: string): ChatIntent {
  const normalized = text.toLocaleLowerCase();
  if (
    DATA_KEYWORDS.some((keyword) => normalized.includes(keyword)) ||
    CONTEXT_KEYWORDS.some((keyword) => normalized.includes(keyword))
  ) {
    return 'coach';
  }
  if (FOOD_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'food_estimate';
  }
  return 'coach';
}

function buildLocalCoachReply(userContext: UserContextData): string {
  const remainingCalories =
    (userContext as UserContextData & { remainingCalories?: number }).remainingCalories ??
    userContext.netDeficit ??
    0;
  const calorieSentence =
    remainingCalories >= 0
      ? `Masih ada sekitar ${Math.round(remainingCalories).toLocaleString('id-ID')} kkal dalam target.`
      : `Catatan hari ini sekitar ${Math.round(Math.abs(remainingCalories)).toLocaleString('id-ID')} kkal di atas target.`;

  return `${calorieSentence} Air tercatat ${userContext.waterGlasses} gelas dan langkah ${userContext.steps.toLocaleString('id-ID')}. Untuk saran yang lebih personal dan bisa memahami percakapan lanjutan, aktifkan Gemini di halaman Saya.`;
}

const getTimestamp = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const AICoachChatModal: React.FC<AICoachChatModalProps> = ({
  visible,
  onClose,
  userName,
  userApiKey,
  connectionStatus,
  starterPrompt,
  userContext,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [followUpPrompts, setFollowUpPrompts] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Halo ${userName}. Tanyakan soal rasa lapar, kalori, atau progres hari ini.`,
      timestamp: getTimestamp(),
      sourceTag: 'Data harian',
    },
  ]);
  const isGeminiConnected =
    Boolean(userApiKey?.trim()) && connectionStatus === 'connected';

  useEffect(() => {
    if (!visible || messages.length === 0) return;
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, visible]);

  useEffect(() => {
    if (visible && starterPrompt) {
      setInputText(starterPrompt);
    }
  }, [starterPrompt, visible]);

  if (!visible) return null;

  const appendCoachMessage = (text: string, sourceTag: string) => {
    setMessages((current) => [
      ...current,
      {
        id: createLocalId(),
        sender: 'ai',
        text,
        timestamp: getTimestamp(),
        sourceTag,
      },
    ]);
  };

  const handleSendMessage = async (preset?: string) => {
    const queryText = (preset || inputText).trim();
    if (!queryText || loading) return;

    setMessages((current) => [
      ...current,
      {
        id: createLocalId(),
        sender: 'user',
        text: queryText,
        timestamp: getTimestamp(),
      },
    ]);
    if (!preset) setInputText('');
    setLoading(true);

    try {
      if (detectChatIntent(queryText) === 'food_estimate') {
        const parsed = await parseFoodNutritionWithAI(queryText, userApiKey);
        const breakdown =
          parsed.itemsBreakdown && parsed.itemsBreakdown.length > 1
            ? `\n\n${parsed.itemsBreakdown
                .map((item) => `${item.name} · ±${item.calories} kcal`)
                .join('\n')}`
            : '';
        appendCoachMessage(
          `${parsed.name}\n±${parsed.nutrition.calories} kcal · P ${parsed.nutrition.proteinGrams} g · K ${parsed.nutrition.carbsGrams} g · L ${parsed.nutrition.fatGrams} g${breakdown}`,
          parsed.isOnlineAI ? 'Gemini' : 'Estimasi lokal'
        );
        setFollowUpPrompts([
          'Apakah porsi ini cocok dengan data hari ini?',
          'Bagaimana membuat porsinya lebih mengenyangkan?',
        ]);
      } else {
        if (!userApiKey) {
          appendCoachMessage(buildLocalCoachReply(userContext), 'Data lokal');
          return;
        }

        const history: AIChatHistoryItem[] = messages
          .filter((message) => message.id !== 'welcome')
          .slice(-8)
          .map((message) => ({
            role: message.sender === 'ai' ? 'model' : 'user',
            text: message.text,
          }));
        const response = await sendStructuredAICoachChatQuery(
          queryText,
          userName,
          userContext,
          userApiKey,
          history
        );
        if (!response) throw new Error('Empty coach response');

        appendCoachMessage(
          response.safetyNote
            ? `${response.message}\n\n${response.safetyNote}`
            : response.message,
          'Gemini · data harian'
        );
        setFollowUpPrompts(response.followUps);
      }
    } catch {
      appendCoachMessage(
        'Coach belum bisa menjawab sekarang. Coba lagi sebentar; untuk data makanan, gunakan pencatatan manual agar tidak ada angka yang ditebak.',
        'Tidak tersambung'
      );
    } finally {
      setLoading(false);
    }
  };

  const promptOptions =
    followUpPrompts.length > 0
      ? followUpPrompts.map((prompt) => ({
          label: prompt.length > 28 ? `${prompt.slice(0, 27)}…` : prompt,
          prompt,
        }))
      : QUICK_PROMPTS;

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
                  height: '92%',
                  paddingHorizontal: spacing.md,
                  paddingTop: spacing.sm,
                  paddingBottom: Math.max(spacing.sm, insets.bottom),
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
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.divider,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.h2, color: colors.textPrimary }}>Coach</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: isGeminiConnected
                            ? colors.success
                            : colors.warning,
                        }}
                      />
                      <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                        {isGeminiConnected ? 'Gemini aktif' : 'Mode lokal'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Tutup Coach"
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

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0, marginVertical: spacing.sm }}
                  contentContainerStyle={{ gap: spacing.sm }}
                >
                  {promptOptions.map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      accessibilityRole="button"
                      accessibilityLabel={item.prompt}
                      disabled={loading}
                      activeOpacity={0.7}
                      onPress={() => handleSendMessage(item.prompt)}
                      style={{
                        minHeight: 38,
                        justifyContent: 'center',
                        paddingHorizontal: 13,
                        borderWidth: 1,
                        borderColor: colors.divider,
                        borderRadius: radius.full,
                        opacity: loading ? 0.45 : 1,
                      }}
                    >
                      <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <ScrollView
                  ref={scrollViewRef}
                  style={{ flex: 1 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    gap: spacing.md,
                    paddingTop: spacing.sm,
                    paddingBottom: spacing.md,
                  }}
                >
                  {messages.map((message) => {
                    const isUser = message.sender === 'user';
                    return (
                      <View
                        key={message.id}
                        style={{
                          maxWidth: '88%',
                          alignSelf: isUser ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 11,
                            borderWidth: 1,
                            borderColor: isUser ? colors.primary : colors.divider,
                            borderRadius: radius.md,
                            borderBottomRightRadius: isUser ? 5 : radius.md,
                            borderBottomLeftRadius: isUser ? radius.md : 5,
                            backgroundColor: isUser ? colors.primary : colors.surfaceElevated,
                          }}
                        >
                          <Text
                            style={{
                              ...typography.body,
                              color: isUser ? colors.onPrimary : colors.textPrimary,
                            }}
                          >
                            {message.text}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: isUser ? 'flex-end' : 'flex-start',
                            gap: 6,
                            marginTop: 4,
                            paddingHorizontal: 4,
                          }}
                        >
                          {!isUser && message.sourceTag ? (
                            <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                              {message.sourceTag}
                            </Text>
                          ) : null}
                          <Text
                            style={{
                              fontSize: 10,
                              lineHeight: 14,
                              color: colors.textDisabled,
                            }}
                          >
                            {message.timestamp}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {loading ? (
                    <View
                      accessibilityLabel="Coach sedang menyiapkan jawaban"
                      style={{
                        minHeight: 42,
                        flexDirection: 'row',
                        alignItems: 'center',
                        alignSelf: 'flex-start',
                        gap: spacing.sm,
                        paddingHorizontal: 13,
                        borderWidth: 1,
                        borderColor: colors.divider,
                        borderRadius: radius.md,
                        backgroundColor: colors.surfaceElevated,
                      }}
                    >
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={{ ...typography.caption, color: colors.textTertiary }}>
                        Menyusun jawaban
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    gap: spacing.sm,
                    paddingTop: spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: colors.divider,
                  }}
                >
                  <TextInput
                    accessibilityLabel="Pesan untuk Coach"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={600}
                    placeholder="Tanyakan sesuatu"
                    placeholderTextColor={colors.textTertiary}
                    style={{
                      flex: 1,
                      minHeight: 46,
                      maxHeight: 100,
                      paddingHorizontal: 14,
                      paddingVertical: 11,
                      borderWidth: 1,
                      borderColor: colors.divider,
                      borderRadius: radius.md,
                      backgroundColor: colors.surfaceElevated,
                      color: colors.textPrimary,
                      ...typography.body,
                      textAlignVertical: 'top',
                    }}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Kirim pesan"
                    disabled={!inputText.trim() || loading}
                    activeOpacity={0.8}
                    onPress={() => handleSendMessage()}
                    style={{
                      minWidth: 70,
                      minHeight: 46,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radius.md,
                      backgroundColor: colors.primary,
                      opacity: !inputText.trim() || loading ? 0.42 : 1,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.caption,
                        color: colors.onPrimary,
                        fontWeight: '600',
                      }}
                    >
                      Kirim
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
