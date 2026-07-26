import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { GlassCard } from './GlassCard';
import { generateAICoachMessageWithAI } from '../services/aiService';
import { Sparkles, MessageCircle, RefreshCw } from 'lucide-react-native';

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
  const fastingHours = Math.floor(elapsedSeconds / 3600);
  const currentHour = new Date().getHours();

  const [aiMessage, setAiMessage] = useState<string>('');
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [isCloudAI, setIsCloudAI] = useState<boolean>(false);

  const fetchAICoachGreeting = async () => {
    if (!userApiKey || userApiKey.trim() === '') {
      setIsCloudAI(false);
      return;
    }

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
        setIsCloudAI(true);
      }
    } catch (err) {
      console.error('Failed to fetch AI coach message:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    fetchAICoachGreeting();
  }, [userApiKey, caloriesIn, waterGlasses]);

  let displayMessage = aiMessage;
  let displayQuestion = aiQuestion;

  if (!isCloudAI || !displayMessage) {
    if (caloriesIn === 0 && currentHour >= 12) {
      displayMessage = `Halo ${userName}! Sudah jam ${currentHour}:00 dan kamu belum mencatat makanan hari ini.`;
      displayQuestion = 'Apakah kamu sudah lapar dan mau makan siang sekarang?';
    } else if (netDeficit > 700 && caloriesIn < 800 && currentHour >= 13) {
      displayMessage = `Defisit kalorimu saat ini cukup besar (${netDeficit} kcal). Jagalah tenaga tubuhmu agar tidak terlalu lemas!`;
      displayQuestion = 'Apakah perutmu mulai menyuarakan lapar asli?';
    } else if (fastingHours >= 14 && fastingHours < 18) {
      displayMessage = `Luar biasa! Kamu sudah berpuasa selama ${fastingHours} jam. Tubuhmu sedang aktif dalam fase Pembakaran Lemak (Fat Adaptation)! 🔥`;
      displayQuestion = 'Bagaimana rasanya? Masih merasa segar atau ingin membatalkan puasa?';
    } else if (waterGlasses < 4 && currentHour >= 14) {
      displayMessage = `Asupan air minummu baru ${waterGlasses} gelas hari ini. Seringkali rasa 'ngemil' sebenarnya adalah sinyal haus dari otak.`;
      displayQuestion = 'Yuk, minum 1 gelas air putih dingin sekarang?';
    } else if (steps < 2000 && currentHour >= 16) {
      displayMessage = `Langkah kakimu baru ${steps} steps hari ini.`;
      displayQuestion = 'Mau luangkan 10-15 menit jalan santai sore ini untuk membakar lemak lebih lancar?';
    } else {
      displayMessage = `Hebat ${userName}! Pola habit dan defisit kalorimu berjalan sangat rapi hari ini.`;
      displayQuestion = 'Bagaimana kondisi tubuh dan energi perasaanmu saat ini?';
    }
  }

  return (
    <GlassCard style={styles.bannerContainer}>
      <View style={styles.headerRow}>
        <View style={styles.aiBadge}>
          <Sparkles size={13} color="#10B981" />
          <Text style={styles.aiBadgeText} numberOfLines={1}>AI HEALTH COACH</Text>
        </View>

        <View style={styles.rightGroup}>
          {userApiKey && (
            <TouchableOpacity onPress={fetchAICoachGreeting} disabled={loadingAI} style={styles.refreshBtn}>
              {loadingAI ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <RefreshCw size={13} color="rgba(255, 255, 255, 0.4)" />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.chatPillBtn} onPress={onOpenChat}>
            <MessageCircle size={13} color="#10B981" />
            <Text style={styles.chatPillText} numberOfLines={1}>Tanya AI</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.coachMessage}>{displayMessage}</Text>
      {displayQuestion !== '' && (
        <Text style={styles.questionPrompt}>{displayQuestion}</Text>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    marginBottom: 10,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  refreshBtn: {
    padding: 2,
  },
  chatPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  chatPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10B981',
  },
  coachMessage: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 19,
  },
  questionPrompt: {
    fontSize: 12,
    color: '#34D399',
    marginTop: 6,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
});
