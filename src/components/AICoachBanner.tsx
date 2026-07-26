import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { GlassCard } from './GlassCard';
import { generateAICoachMessageWithAI } from '../services/aiService';
import { Sparkles, MessageCircle, Utensils, Cookie, Droplet, RefreshCw } from 'lucide-react-native';

interface AICoachBannerProps {
  elapsedSeconds: number;
  caloriesIn: number;
  netDeficit: number;
  steps: number;
  waterGlasses: number;
  userName: string;
  userApiKey?: string;
  onOpenAddMeal: () => void;
  onOpenSnack: () => void;
  onAddWater: () => void;
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
  onOpenAddMeal,
  onOpenSnack,
  onAddWater,
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

  // Fallback Local Engine Messages if no API Key or offline
  let localMessage = aiMessage;
  let localQuestion = aiQuestion;

  if (!isCloudAI || !localMessage) {
    if (caloriesIn === 0 && currentHour >= 12) {
      localMessage = `Halo ${userName}! Sudah jam ${currentHour}:00 dan kamu belum mencatat makanan hari ini.`;
      localQuestion = 'Apakah kamu sudah lapar dan mau makan siang sekarang?';
    } else if (netDeficit > 700 && caloriesIn < 800 && currentHour >= 13) {
      localMessage = `Defisit kalorimu saat ini cukup besar (${netDeficit} kcal). Jagalah tenaga tubuhmu agar tidak terlalu lemas!`;
      localQuestion = 'Apakah perutmu mulai menyuarakan lapar asli?';
    } else if (fastingHours >= 14 && fastingHours < 18) {
      localMessage = `Luar biasa! Kamu sudah berpuasa selama ${fastingHours} jam. Tubuhmu sedang aktif dalam fase Pembakaran Lemak (Fat Adaptation)! 🔥`;
      localQuestion = 'Bagaimana rasanya? Masih merasa segar atau ingin membatalkan puasa?';
    } else if (waterGlasses < 4 && currentHour >= 14) {
      localMessage = `Asupan air minummu baru ${waterGlasses} gelas hari ini. Seringkali rasa 'ngemil' sebenarnya adalah sinyal haus dari otak.`;
      localQuestion = 'Yuk, minum 1 gelas air putih dingin sekarang?';
    } else if (steps < 2000 && currentHour >= 16) {
      localMessage = `Langkah kakimu baru ${steps} steps hari ini.`;
      localQuestion = 'Mau luangkan 10-15 menit jalan santai sore ini untuk membakar lemak lebih lancar?';
    } else {
      localMessage = `Hebat ${userName}! Pola habit dan defisit kalorimu berjalan sangat rapi hari ini.`;
      localQuestion = 'Bagaimana kondisi tubuh dan energi perasaanmu saat ini?';
    }
  }

  return (
    <GlassCard style={styles.bannerContainer}>
      <View style={styles.headerRow}>
        <View style={styles.aiBadge}>
          <Sparkles size={14} color="#10B981" />
          <Text style={styles.aiBadgeText}>
            {isCloudAI ? 'GEMINI AI COACH CLOUD 🟢' : 'AI HEALTH COACH INTERAKTIF 🟡'}
          </Text>
        </View>

        <View style={styles.rightIcons}>
          {userApiKey && (
            <TouchableOpacity onPress={fetchAICoachGreeting} disabled={loadingAI} style={styles.refreshBtn}>
              {loadingAI ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <RefreshCw size={14} color="rgba(255, 255, 255, 0.5)" />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.chatHeaderBtn} onPress={onOpenChat}>
            <MessageCircle size={16} color="#10B981" />
            <Text style={styles.chatHeaderBtnText}>Chat Coach</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.coachMessage}>{localMessage}</Text>
      <Text style={styles.questionPrompt}>{localQuestion}</Text>

      {/* Interactive Quick Answer Buttons */}
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.btnChat} onPress={onOpenChat}>
          <MessageCircle size={14} color="#FFFFFF" />
          <Text style={styles.btnText}>💬 Chat Kondisi Tubuh</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnMeal} onPress={onOpenAddMeal}>
          <Utensils size={14} color="#FFFFFF" />
          <Text style={styles.btnText}>🥗 Lapar, Makan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSnack} onPress={onOpenSnack}>
          <Cookie size={14} color="#FFFFFF" />
          <Text style={styles.btnText}>🍿 Ingin Ngemil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnWater} onPress={onAddWater}>
          <Droplet size={14} color="#FFFFFF" />
          <Text style={styles.btnText}>💧 + Air</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  refreshBtn: {
    padding: 4,
  },
  chatHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chatHeaderBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10B981',
  },
  coachMessage: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 19,
    fontWeight: '600',
  },
  questionPrompt: {
    fontSize: 12,
    color: '#34D399',
    marginTop: 4,
    marginBottom: 12,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  btnChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnSnack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnWater: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  btnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
