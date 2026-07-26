import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Surface } from './Surface';
import { generateAICoachMessageWithAI } from '../services/aiService';
import { Sparkles, MessageCircle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface AICoachBannerProps {
  elapsedSeconds: number;
  caloriesIn: number;
  netDeficit: number;
  steps: number;
  waterGlasses: number;
  userName: string;
  userApiKey?: string;
  onOpenChat: () => void;
}

export const AICoachBanner: React.FC<AICoachBannerProps> = ({
  elapsedSeconds,
  caloriesIn,
  netDeficit,
  steps,
  waterGlasses,
  userName,
  userApiKey,
  onOpenChat,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const fastingHours = Math.floor(elapsedSeconds / 3600);
  const currentHour = new Date().getHours();

  const [aiMessage, setAiMessage] = useState<string>('');
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState<boolean>(false);

  const fetchAICoachGreeting = async () => {
    if (!userApiKey || userApiKey.trim() === '') return;

    setLoadingAI(true);
    try {
      const response = await generateAICoachMessageWithAI(
        {
          name: userName,
          fastingHours,
          caloriesIn,
          netDeficit,
          steps,
          waterGlasses,
          currentHour,
        },
        userApiKey
      );

      if (response && response.coachMessage) {
        setAiMessage(response.coachMessage);
        setAiQuestion(response.questionPrompt);
      }
    } catch {
      // Fallback local rule
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    fetchAICoachGreeting();
  }, [userApiKey, fastingHours]);

  return (
    <Surface style={{ padding: spacing.md, marginVertical: spacing.xs, borderColor: colors.primarySubtle }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} color={colors.primary} />
          <Text style={{ ...typography.caption, fontWeight: '700', color: colors.primaryText, textTransform: 'uppercase' }}>
            AI Health Coach
          </Text>
        </View>

        <TouchableOpacity onPress={fetchAICoachGreeting} style={{ padding: 4 }}>
          {loadingAI ? <ActivityIndicator size="small" color={colors.primary} /> : <RefreshCw size={14} color={colors.textTertiary} />}
        </TouchableOpacity>
      </View>

      <Text style={{ ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.xs }}>
        {aiMessage || 'Tetap jaga pola makan dan hidrasimu hari ini!'}
      </Text>

      {aiQuestion ? (
        <Text style={{ ...typography.caption, color: colors.textSecondary, fontStyle: 'italic', marginBottom: spacing.sm }}>
          "{aiQuestion}"
        </Text>
      ) : null}

      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: colors.primarySubtle,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: radius.sm,
          alignSelf: 'flex-start',
        }}
        onPress={onOpenChat}
      >
        <MessageCircle size={14} color={colors.primary} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryText }}>Tanya Coach</Text>
      </TouchableOpacity>
    </Surface>
  );
};
