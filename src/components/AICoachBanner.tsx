import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from './GlassCard';
import { Sparkles, MessageCircle, Utensils, Cookie, Droplet, Smile } from 'lucide-react-native';

interface AICoachBannerProps {
  elapsedSeconds: number;
  caloriesIn: number;
  netDeficit: number;
  steps: number;
  waterGlasses: number;
  userName: string;
  onOpenAddMeal: () => void;
  onOpenSnack: () => void;
  onAddWater: () => void;
}

export const AICoachBanner: React.FC<AICoachBannerProps> = ({
  elapsedSeconds,
  caloriesIn,
  netDeficit,
  steps,
  waterGlasses,
  userName,
  onOpenAddMeal,
  onOpenSnack,
  onAddWater,
}) => {
  const fastingHours = Math.floor(elapsedSeconds / 3600);
  const currentHour = new Date().getHours();

  // Dynamic AI Persona Logic based on real-time state
  let coachMessage = '';
  let questionPrompt = '';
  let highlightType: 'meal' | 'fasting' | 'water' | 'steps' | 'snack' = 'meal';

  if (caloriesIn === 0 && currentHour >= 12) {
    coachMessage = `Halo ${userName}! Sudah jam ${currentHour}:00 dan kamu belum mencatat makanan hari ini.`;
    questionPrompt = 'Apakah kamu sudah lapar dan mau makan siang sekarang?';
    highlightType = 'meal';
  } else if (netDeficit > 700 && caloriesIn < 800 && currentHour >= 13) {
    coachMessage = `Defisit kalorimu saat ini cukup besar (${netDeficit} kcal). Jagalah tenaga tubuhmu agar tidak terlalu lemas!`;
    questionPrompt = 'Apakah perutmu mulai menyuarakan lapar asli?';
    highlightType = 'meal';
  } else if (fastingHours >= 14 && fastingHours < 18) {
    coachMessage = `Luar biasa! Kamu sudah berpuasa selama ${fastingHours} jam. Tubuhmu sedang aktif dalam fase Pembakaran Lemak (Fat Adaptation)! 🔥`;
    questionPrompt = 'Bagaimana rasanya? Masih merasa segar atau ingin membatalkan puasa?';
    highlightType = 'fasting';
  } else if (waterGlasses < 4 && currentHour >= 14) {
    coachMessage = `Asupan air minummu baru ${waterGlasses} gelas hari ini. Seringkali rasa 'ngemil' sebenarnya adalah sinyal haus dari otak.`;
    questionPrompt = 'Yuk, minum 1 gelas air putih dingin sekarang?';
    highlightType = 'water';
  } else if (steps < 2000 && currentHour >= 16) {
    coachMessage = `Langkah kakimu baru ${steps} steps hari ini.`;
    questionPrompt = 'Mau luangkan 10-15 menit jalan santai sore ini untuk membakar lemak lebih lancar?';
    highlightType = 'steps';
  } else {
    coachMessage = `Hebat ${userName}! Pola habit dan defisit kalorimu berjalan sangat rapi hari ini.`;
    questionPrompt = 'Bagaimana kondisi tubuh dan energi perasaanmu saat ini?';
    highlightType = 'snack';
  }

  return (
    <GlassCard style={styles.bannerContainer}>
      <View style={styles.headerRow}>
        <View style={styles.aiBadge}>
          <Sparkles size={14} color="#10B981" />
          <Text style={styles.aiBadgeText}>AI HEALTH COACH INTERAKTIF</Text>
        </View>
        <MessageCircle size={16} color="rgba(255, 255, 255, 0.4)" />
      </View>

      <Text style={styles.coachMessage}>{coachMessage}</Text>
      <Text style={styles.questionPrompt}>{questionPrompt}</Text>

      {/* Interactive Quick Answer Buttons */}
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.btnMeal} onPress={onOpenAddMeal}>
          <Utensils size={14} color="#FFFFFF" />
          <Text style={styles.btnText}>🥗 Lapar Asli, Makan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSnack} onPress={onOpenSnack}>
          <Cookie size={14} color="#FFFFFF" />
          <Text style={styles.btnText}>🍿 Ingin Ngemil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnWater} onPress={onAddWater}>
          <Droplet size={14} color="#FFFFFF" />
          <Text style={styles.btnText}>💧 Cuma Haus (+Air)</Text>
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
    gap: 8,
  },
  btnMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnSnack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnWater: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
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
