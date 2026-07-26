import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { calculateEnergyBalance } from '../utils/calorieCalc';
import { EnergyGauge } from '../components/EnergyGauge';
import { EatingTimer } from '../components/EatingTimer';
import { HabitRings } from '../components/HabitRings';
import { MealCard } from '../components/MealCard';
import { SnackModal } from '../components/SnackModal';
import { AddMealModal } from '../components/AddMealModal';
import { EditMealModal } from '../components/EditMealModal';
import { WelcomeBackModal } from '../components/WelcomeBackModal';
import { GlassCard } from '../components/GlassCard';
import { MealLog } from '../types';
import {
  Utensils,
  Cookie,
  Droplet,
  Footprints,
  Sparkles,
  PartyPopper,
} from 'lucide-react-native';

export const HomeScreen: React.FC = () => {
  const {
    profile,
    mealLogs,
    waterGlasses,
    steps,
    elapsedSeconds,
    showWelcomeBackModal,
    dismissWelcomeBackModal,
    addMealLog,
    updateMealLog,
    deleteMealLog,
    addWaterGlass,
    toggleCheatDay,
    freshStartToday,
  } = useApp();

  const [showSnackModal, setShowSnackModal] = useState<boolean>(false);
  const [showAddMealModal, setShowAddMealModal] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);

  // Filter today's meal logs
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = mealLogs.filter((m) => m.timestamp.startsWith(todayStr));

  // Calculate total calories IN today
  const totalCaloriesIn = todayLogs.reduce((sum, m) => sum + m.nutrition.calories, 0);
  const snackCount = todayLogs.filter((m) => m.isSnack).length;

  // Calculate Energy Balance
  const energy = calculateEnergyBalance(profile, totalCaloriesIn, steps);

  const handleAddSnackSubmit = (name: string, calories: number, trigger: any) => {
    addMealLog(name, true, { calories, proteinGrams: 4, carbsGrams: 20, fatGrams: 8 }, trigger);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#09090B" />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Halo, {profile.name || 'Teman Diet'} 👋</Text>
            <Text style={styles.subGreeting}>
              {profile.isCheatDay ? '🎉 Mode Cheat Day Aktif' : ' Target: Defisit Kalori & Habit Control'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.cheatBtn, profile.isCheatDay && styles.cheatBtnActive]}
            onPress={toggleCheatDay}
          >
            <PartyPopper size={16} color={profile.isCheatDay ? '#FFFFFF' : '#F59E0B'} />
            <Text style={[styles.cheatBtnText, profile.isCheatDay && styles.cheatBtnTextActive]}>
              {profile.isCheatDay ? 'Cheat Day' : 'Normal'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 1. Fasting Timer */}
        <EatingTimer
          elapsedSeconds={elapsedSeconds}
          onEditTimePress={() => setShowAddMealModal(true)}
        />

        {/* 2. Live Energy Balance Gauge */}
        <EnergyGauge
          caloriesIn={totalCaloriesIn}
          caloriesOut={energy.totalCaloriesOut}
          netBalance={energy.netBalance}
          targetDeficit={energy.targetDeficit}
          isDeficit={energy.isDeficit}
          isCheatDay={profile.isCheatDay}
        />

        {/* Quick Action Bar */}
        <View style={styles.quickBar}>
          <TouchableOpacity style={styles.mealActionBtn} onPress={() => setShowAddMealModal(true)}>
            <Utensils size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>+ Makan Utama</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.snackActionBtn} onPress={() => setShowSnackModal(true)}>
            <Cookie size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>🍿 Catat Ngemil</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Daily Habit Rings */}
        <HabitRings
          percentageDeficit={energy.percentageToGoal}
          snackCount={snackCount}
          maxSnacksAllowed={2}
          waterGlasses={waterGlasses}
          targetWaterGlasses={8}
        />

        {/* 4. Hydration & Automatic Sensor Steps Widget Row */}
        <View style={styles.widgetRow}>
          {/* Water Widget */}
          <GlassCard style={styles.widgetCard}>
            <View style={styles.widgetHeader}>
              <Droplet size={18} color="#3B82F6" />
              <Text style={styles.widgetTitle}>HIDRASI AIR</Text>
            </View>
            <Text style={styles.widgetValue}>{waterGlasses} / 8 Gelas</Text>
            <TouchableOpacity style={styles.widgetBtn} onPress={addWaterGlass}>
              <Text style={styles.widgetBtnText}>+ 1 Gelas Air</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Steps Widget (100% Automated Sensor Sync) */}
          <GlassCard style={styles.widgetCard}>
            <View style={styles.widgetHeader}>
              <Footprints size={18} color="#10B981" />
              <Text style={styles.widgetTitle}>LANGKAH (PEDOMETER)</Text>
            </View>
            <Text style={styles.widgetValue}>{steps.toLocaleString()} Steps</Text>
            <View style={styles.autoSensorBadge}>
              <View style={styles.sensorDot} />
              <Text style={styles.autoSensorText}>Otomatis Sensor HP</Text>
            </View>
          </GlassCard>
        </View>

        {/* Smart Activity Advice */}
        {steps < 3000 && totalCaloriesIn > 1000 && (
          <GlassCard style={styles.adviceCard}>
            <View style={styles.adviceHeader}>
              <Sparkles size={16} color="#F59E0B" />
              <Text style={styles.adviceTitle}>SARAN AKTIVITAS PINTAR</Text>
            </View>
            <Text style={styles.adviceText}>
              Kalori masukmu hari ini sudah {totalCaloriesIn} kcal, tetapi langkah kaki baru {steps} steps.
              Coba luangkan 15 menit jalan kaki sore ini untuk menjaga Defisit Kalori tetap hijau 🟢!
            </Text>
          </GlassCard>
        )}

        {/* Today's Meal Timeline Feed */}
        <Text style={styles.feedTitle}>RIWAYAT MAKAN HARI INI ({todayLogs.length})</Text>
        {todayLogs.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>Belum ada makanan atau cemilan tercatat hari ini.</Text>
            <Text style={styles.emptySub}>Klik "+ Makan Utama" atau "🍿 Catat Ngemil" di atas.</Text>
          </GlassCard>
        ) : (
          todayLogs.map((log) => (
            <MealCard key={log.id} log={log} onEdit={(item) => setEditingLog(item)} onDelete={deleteMealLog} />
          ))
        )}
      </ScrollView>

      {/* Modals */}
      <SnackModal
        visible={showSnackModal}
        onClose={() => setShowSnackModal(false)}
        onSubmitSnack={handleAddSnackSubmit}
        onDrinkWater={addWaterGlass}
      />

      <AddMealModal
        visible={showAddMealModal}
        onClose={() => setShowAddMealModal(false)}
        onSaveMeal={(name, nutrition, customTimestamp, itemsBreakdown) =>
          addMealLog(name, false, nutrition, undefined, customTimestamp, 'ai', itemsBreakdown)
        }
        userApiKey={profile.geminiApiKey}
      />

      <EditMealModal
        visible={editingLog !== null}
        log={editingLog}
        onClose={() => setEditingLog(null)}
        onSaveUpdate={(id, fields) => updateMealLog(id, fields)}
      />

      <WelcomeBackModal
        visible={showWelcomeBackModal}
        onFreshStart={freshStartToday}
        onDismiss={dismissWelcomeBackModal}
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
    padding: 16,
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
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  cheatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  cheatBtnActive: {
    backgroundColor: '#F59E0B',
  },
  cheatBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  cheatBtnTextActive: {
    color: '#FFFFFF',
  },
  quickBar: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 6,
  },
  mealActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 16,
  },
  snackActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 16,
  },
  actionBtnText: {
    fontSize: 14,
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
    padding: 14,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  widgetTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  widgetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  widgetBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  widgetBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  autoSensorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 8,
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
    fontWeight: '600',
    color: '#10B981',
  },
  adviceCard: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  adviceTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  adviceText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  feedTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
});
