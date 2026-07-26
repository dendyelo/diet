import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { EatingTimer } from '../components/EatingTimer';
import { EnergyGauge } from '../components/EnergyGauge';
import { HabitRings } from '../components/HabitRings';
import { MealCard } from '../components/MealCard';
import { SnackModal } from '../components/SnackModal';
import { AddMealModal } from '../components/AddMealModal';
import { EditMealModal } from '../components/EditMealModal';
import { AICoachBanner } from '../components/AICoachBanner';
import { AICoachChatModal } from '../components/AICoachChatModal';
import { GlassCard } from '../components/GlassCard';
import { MealLog, TriggerType, NutritionData, FoodItemBreakdown } from '../types';
import { Droplet, Footprints, Utensils, Cookie, Sparkles } from 'lucide-react-native';

export const HomeScreen: React.FC = () => {
  const {
    profile,
    mealLogs = [],
    fastingState,
    steps = 0,
    waterGlasses = 0,
    energy,
    addMealLog,
    updateMealLog,
    deleteMealLog,
    addWaterGlass,
  } = useApp();

  const [showSnackModal, setShowSnackModal] = useState<boolean>(false);
  const [showAddMealModal, setShowAddMealModal] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = (mealLogs || []).filter((log) => log.timestamp && log.timestamp.startsWith(todayStr));

  const totalCaloriesIn = todayLogs.reduce((acc, item) => acc + (item.nutrition?.calories || 0), 0);
  const snackCount = todayLogs.filter((item) => item.isSnack).length;

  const elapsedSeconds = fastingState?.elapsedSeconds || 0;

  const handleAddSnackSubmit = async (
    name: string,
    nutrition: NutritionData,
    trigger: TriggerType,
    itemsBreakdown?: FoodItemBreakdown[]
  ) => {
    await addMealLog(name, true, nutrition, trigger, undefined, 'ai', itemsBreakdown);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header Title Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting} numberOfLines={1}>Halo, {profile?.name || 'Teman Diet'}! 👋</Text>
            <Text style={styles.subGreeting} numberOfLines={1}>Jaga defisit kalori & habit kesehatanmu hari ini.</Text>
          </View>

          {profile?.isCheatDay && (
            <View style={styles.cheatBadge}>
              <Text style={styles.cheatBadgeText} numberOfLines={1}>cheat day 🍕</Text>
            </View>
          )}
        </View>

        {/* 1. Fasting Timer */}
        <EatingTimer
          elapsedSeconds={elapsedSeconds}
          onEditTimePress={() => setShowAddMealModal(true)}
        />

        {/* 2. Sleek Minimalist AI Health Coach Banner */}
        <AICoachBanner
          elapsedSeconds={elapsedSeconds}
          caloriesIn={totalCaloriesIn}
          netDeficit={energy?.netBalance || 0}
          steps={steps}
          waterGlasses={waterGlasses}
          userName={profile?.name || 'Teman Diet'}
          userApiKey={profile?.geminiApiKey}
          onOpenChat={() => setShowChatModal(true)}
        />

        {/* 3. Live Synchronized Energy Balance Gauge */}
        <EnergyGauge
          caloriesIn={totalCaloriesIn}
          caloriesOut={energy?.totalCaloriesOut || 1600}
          dailyBMR={energy?.dailyBMR || 1600}
          elapsedBMR={energy?.elapsedBMR || 800}
          stepCalories={energy?.stepCalories || 0}
          netBalance={energy?.netBalance || 0}
          targetDeficit={energy?.targetDeficit || 500}
          isDeficit={energy?.isDeficit ?? true}
          isCheatDay={profile?.isCheatDay}
        />

        {/* Quick Action Bar */}
        <View style={styles.quickBar}>
          <TouchableOpacity style={styles.mealActionBtn} onPress={() => setShowAddMealModal(true)}>
            <Utensils size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText} numberOfLines={1}>+ Catat Makanan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.snackActionBtn} onPress={() => setShowSnackModal(true)}>
            <Cookie size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText} numberOfLines={1}>🍿 Catat Ngemil</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Daily Habit Rings */}
        <HabitRings
          percentageDeficit={energy?.percentageToGoal || 0}
          snackCount={snackCount}
          maxSnacksAllowed={2}
          waterGlasses={waterGlasses}
          targetWaterGlasses={8}
        />

        {/* 5. Hydration & Automatic Sensor Steps Widget Row */}
        <View style={styles.widgetRow}>
          {/* Water Widget */}
          <GlassCard style={styles.widgetCard}>
            <View style={styles.widgetHeader}>
              <Droplet size={16} color="#3B82F6" />
              <Text style={styles.widgetTitle} numberOfLines={1}>HIDRASI AIR</Text>
            </View>
            <Text style={styles.widgetValue} numberOfLines={1}>{waterGlasses} / 8 Gelas</Text>
            <TouchableOpacity style={styles.widgetBtn} onPress={addWaterGlass}>
              <Text style={styles.widgetBtnText} numberOfLines={1}>+ 1 Gelas Air</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Steps Widget (100% Automated Sensor Sync) */}
          <GlassCard style={styles.widgetCard}>
            <View style={styles.widgetHeader}>
              <Footprints size={16} color="#10B981" />
              <Text style={styles.widgetTitle} numberOfLines={1}>LANGKAH KAKI</Text>
            </View>
            <Text style={styles.widgetValue} numberOfLines={1}>{steps.toLocaleString()} Steps</Text>
            <View style={styles.autoSensorBadge}>
              <View style={styles.sensorDot} />
              <Text style={styles.autoSensorText} numberOfLines={1}>Sensor Otomatis</Text>
            </View>
          </GlassCard>
        </View>

        {/* Smart Activity Advice */}
        {steps < 3000 && totalCaloriesIn > 1000 && (
          <GlassCard style={styles.adviceCard}>
            <View style={styles.adviceHeader}>
              <Sparkles size={16} color="#F59E0B" />
              <Text style={styles.adviceTitle} numberOfLines={1}>SARAN AKTIVITAS PINTAR</Text>
            </View>
            <Text style={styles.adviceText}>
              Kalori masukmu hari ini sudah {totalCaloriesIn} kcal, tetapi langkah kaki baru {steps} steps.
              Coba luangkan 15 menit jalan kaki sore ini untuk menjaga Defisit Kalori tetap hijau 🟢!
            </Text>
          </GlassCard>
        )}

        {/* Today's Meal Timeline Feed */}
        <Text style={styles.feedTitle} numberOfLines={1}>RIWAYAT MAKAN HARI INI ({todayLogs.length})</Text>
        {todayLogs.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>Belum ada makanan atau cemilan tercatat hari ini.</Text>
            <Text style={styles.emptySub}>Klik "+ Catat Makanan" atau "🍿 Catat Ngemil" di atas.</Text>
          </GlassCard>
        ) : (
          todayLogs.map((log) => (
            <MealCard key={log.id} log={log} onEdit={(item) => setEditingLog(item)} onDelete={deleteMealLog} />
          ))
        )}
      </ScrollView>

      {/* Modals */}
      <AICoachChatModal
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        userName={profile?.name || 'Teman Diet'}
        userApiKey={profile?.geminiApiKey}
        userContext={{
          fastingHours: Math.floor(elapsedSeconds / 3600),
          caloriesIn: totalCaloriesIn,
          netDeficit: energy?.netBalance || 0,
          steps,
          waterGlasses,
        }}
      />

      <SnackModal
        visible={showSnackModal}
        onClose={() => setShowSnackModal(false)}
        onSubmitSnack={handleAddSnackSubmit}
        onDrinkWater={addWaterGlass}
        userApiKey={profile?.geminiApiKey}
      />

      <AddMealModal
        visible={showAddMealModal}
        onClose={() => setShowAddMealModal(false)}
        onSaveMeal={(name, nutrition, customTimestamp, itemsBreakdown) =>
          addMealLog(name, false, nutrition, undefined, customTimestamp, 'ai', itemsBreakdown)
        }
        userApiKey={profile?.geminiApiKey}
      />

      <EditMealModal
        visible={editingLog !== null}
        log={editingLog}
        onClose={() => setEditingLog(null)}
        onSaveUpdate={(id, fields) => updateMealLog(id, fields)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subGreeting: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  cheatBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  cheatBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F59E0B',
    textTransform: 'uppercase',
  },
  quickBar: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 8,
  },
  mealActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 14,
  },
  snackActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  widgetRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 4,
  },
  widgetCard: {
    flex: 1,
    padding: 12,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  widgetTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.8,
    flex: 1,
  },
  widgetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  widgetBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  widgetBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#60A5FA',
  },
  autoSensorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  sensorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  autoSensorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
  },
  adviceCard: {
    borderColor: 'rgba(245, 158, 11, 0.25)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    marginVertical: 8,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  adviceTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  adviceText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
  feedTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 8,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptySub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
});
