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
          <Sparkles size={12} color="#10B981" />
          <Text style={styles.aiBadgeText} numberOfLines={1}>
            GEMINI AI HEALTH COACH 🟢
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
            <MessageCircle size={14} color="#10B981" />
            <Text style={styles.chatHeaderBtnText} numberOfLines={1}>Chat Coach</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.coachMessage}>{displayMessage}</Text>
      <Text style={styles.questionPrompt}>{displayQuestion}</Text>

      {/* Interactive Quick Answer Buttons */}
      <View style={styles.actionGrid}>
        <TouchableOpacity style={[styles.actionBtn, styles.btnChat]} onPress={onOpenChat}>
          <MessageCircle size={13} color="#FFFFFF" />
          <Text style={styles.btnText} numberOfLines={1}>💬 Chat AI</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.btnMeal]} onPress={onOpenAddMeal}>
          <Utensils size={13} color="#FFFFFF" />
          <Text style={styles.btnText} numberOfLines={1}>🥗 Makan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.btnSnack]} onPress={onOpenSnack}>
          <Cookie size={13} color="#FFFFFF" />
          <Text style={styles.btnText} numberOfLines={1}>🍿 Ngemil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.btnWater]} onPress={onAddWater}>
          <Droplet size={13} color="#FFFFFF" />
          <Text style={styles.btnText} numberOfLines={1}>💧 Air</Text>
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
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexShrink: 1,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#10B981',
    letterSpacing: 0.6,
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
    paddingVertical: 3,
    borderRadius: 10,
  },
  chatHeaderBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
  },
  coachMessage: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 18,
    fontWeight: '600',
  },
  questionPrompt: {
    fontSize: 11,
    color: '#34D399',
    marginTop: 4,
    marginBottom: 10,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  btnChat: {
    backgroundColor: '#10B981',
  },
  btnMeal: {
    backgroundColor: '#3B82F6',
  },
  btnSnack: {
    backgroundColor: '#F59E0B',
  },
  btnWater: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  btnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
