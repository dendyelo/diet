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
  const currentMinute = new Date().getMinutes();

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
  }, [userApiKey, caloriesIn, waterGlasses, netDeficit]);

  let displayMessage = aiMessage;
  let displayQuestion = aiQuestion;

  if (!isCloudAI || !displayMessage) {
    const rotateIndex = (currentHour + Math.floor(currentMinute / 5)) % 4;
    const isSurplus = netDeficit < 0;
    const absNet = Math.abs(netDeficit);

    if (isSurplus) {
      displayMessage = `Perhatian ${userName}! Kalori masukmu saat ini surplus ${absNet} kcal 🔴. Tenang, seiring berjalannya hari, BMR istirahat dan langkah kakimu akan terus membakar kalori ini!`;
      displayQuestion = 'Yuk, luangkan 10-15 menit jalan kaki santai untuk kembali ke defisit hijau 🟢?';
    } else if (caloriesIn === 0 && currentHour >= 12) {
      displayMessage = `Halo ${userName}! Sudah jam ${currentHour}:00 dan kamu belum mencatat makanan hari ini.`;
      displayQuestion = 'Apakah kamu sudah lapar dan mau makan siang sekarang?';
    } else if (rotateIndex === 0 && fastingHours >= 6) {
      displayMessage = `Hebat ${userName}! Kamu sudah berpuasa selama ${fastingHours} jam. Tubuhmu sedang aktif membakar cadangan lemak! 🔥`;
      displayQuestion = 'Bagaimana perasaannya saat ini? Masih merasa bertenaga?';
    } else if (rotateIndex === 1 && steps < 3000 && currentHour >= 15) {
      displayMessage = `Langkah kakimu baru ${steps} steps hari ini. Jalan santai 15 menit dapat memperlancar metabolisme.`;
      displayQuestion = 'Mau luangkan 15 menit berjalan kaki sore ini?';
    } else if (rotateIndex === 2 && waterGlasses < 6 && currentHour >= 13) {
      displayMessage = `Asupan air minummu saat ini ${waterGlasses} / 8 gelas. Hidrasi yang terjaga mencegah pusing saat puasa.`;
      displayQuestion = 'Yuk, minum 1 gelas air putih dingin sekarang?';
    } else {
      displayMessage = `Hebat ${userName}! Defisit kalorimu saat ini ${absNet} kcal. Pola habitmu berjalan sangat seimbang hari ini.`;
      displayQuestion = 'Bagaimana kondisi tubuh dan energi perasaanmu saat ini?';
    }
  }

  return (
    <GlassCard style={styles.bannerContainer}>
      <View style={styles.headerRow}>
        <View style={styles.aiBadge}>
          <Sparkles size={13} color="#10B981" />
          <Text style={styles.aiBadgeText} numberOfLines={1}>
            {isCloudAI ? 'GEMINI AI CLOUD 🟢' : 'AI HEALTH COACH'}
          </Text>
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
