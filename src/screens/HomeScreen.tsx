import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useProfile, useMeals, useHealth, useAI, useTheme } from '../context/AppContext';
import { EatingTimer } from '../components/EatingTimer';
import { EnergyGauge } from '../components/EnergyGauge';
import { HabitRings } from '../components/HabitRings';
import { MealCard } from '../components/MealCard';
import { SnackModal } from '../components/SnackModal';
import { AddMealModal } from '../components/AddMealModal';
import { EditMealModal } from '../components/EditMealModal';
import { AICoachBanner } from '../components/AICoachBanner';
import { AICoachChatModal } from '../components/AICoachChatModal';
import { Surface } from '../components/Surface';
import { MealLog, TriggerType, NutritionData, FoodItemBreakdown } from '../types';
import { Droplet, Footprints, Utensils, Cookie, Sparkles } from 'lucide-react-native';
import { isSameLocalDay } from '../utils/date';

export const HomeScreen: React.FC = () => {
  const { profile } = useProfile();
  const { mealLogs = [], totalCaloriesIn, snackCount, addMealLog, updateMealLog, deleteMealLog } = useMeals();
  const { fastingState, steps = 0, waterGlasses = 0, energy, addWaterGlass, resetFastingTimer } = useHealth();
  const { userApiKey } = useAI();
  const { colors, spacing, radius, typography } = useTheme();

  const [showSnackModal, setShowSnackModal] = useState<boolean>(false);
  const [showAddMealModal, setShowAddMealModal] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);

  const todayLogs = (mealLogs || []).filter((log) => log.timestamp && isSameLocalDay(log.timestamp));
  const elapsedSeconds = fastingState?.elapsedSeconds || 0;
  const hasMealRecorded = fastingState?.hasMealRecorded ?? true;

  const handleAddSnackSubmit = async (
    name: string,
    nutrition: NutritionData,
    trigger: TriggerType,
    itemsBreakdown?: FoodItemBreakdown[]
  ) => {
    await addMealLog(name, true, nutrition, trigger, undefined, 'ai', itemsBreakdown);
  };

  const handleStartFastingNow = async () => {
    await resetFastingTimer(new Date().toISOString());
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 100 }}>
        {/* Header Title Bar */}
        <View style={{ marginBottom: spacing.xs }}>
          <Text style={{ ...typography.h1, color: colors.textPrimary }} numberOfLines={1}>Halo, {profile?.name || 'Teman Diet'}! 👋</Text>
          <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: 2 }} numberOfLines={1}>Jaga defisit kalori & habit kesehatanmu hari ini.</Text>
        </View>

        {/* 1. AI Health Coach Banner */}
        <AICoachBanner
          elapsedSeconds={elapsedSeconds}
          caloriesIn={totalCaloriesIn || 0}
          netDeficit={energy?.netBalance || 500}
          steps={steps || 0}
          waterGlasses={waterGlasses || 0}
          userName={profile?.name || 'Teman Diet'}
          userApiKey={userApiKey}
          onOpenChat={() => setShowChatModal(true)}
        />

        {/* 2. Fasting / Eating Timer */}
        <EatingTimer
          elapsedSeconds={elapsedSeconds}
          hasMealRecorded={hasMealRecorded}
          onEditTimePress={() => setShowAddMealModal(true)}
          onStartFastingNow={handleStartFastingNow}
        />

        {/* 3. Energy Balance Gauge */}
        {energy && (
          <EnergyGauge
            caloriesIn={totalCaloriesIn || 0}
            caloriesOut={energy.totalCaloriesOut}
            dailyBMR={energy.dailyBMR}
            elapsedBMR={energy.elapsedBMR}
            stepCalories={energy.stepCalories}
            netBalance={energy.netBalance}
            targetDeficit={energy.targetDeficit}
            isDeficit={energy.isDeficit}
            isCheatDay={profile?.isCheatDay}
          />
        )}

        {/* 4. Triple Habit Rings */}
        <HabitRings
          percentageDeficit={energy?.percentageToGoal || 0}
          snackCount={snackCount || 0}
          waterGlasses={waterGlasses || 0}
        />

        {/* 5. Quick Habit Logging Bar */}
        <Surface style={{ padding: spacing.md }}>
          <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: spacing.sm }}>
            PENCATATAN KESEHATAN HARIAN
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.xs + 4 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: colors.infoSubtle, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', gap: 4 }}
              onPress={() => addWaterGlass()}
            >
              <Droplet size={18} color={colors.info} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.info }}>+1 Air</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: colors.warningSubtle, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', gap: 4 }}
              onPress={() => setShowSnackModal(true)}
            >
              <Cookie size={18} color={colors.warning} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning }}>Snack</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: colors.primarySubtle, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', gap: 4 }}
              onPress={() => setShowAddMealModal(true)}
            >
              <Utensils size={18} color={colors.primary} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryText }}>Makanan</Text>
            </TouchableOpacity>
          </View>
        </Surface>

        {/* 6. Today's Meal Timeline */}
        <Surface style={{ padding: spacing.md }}>
          <Text style={{ ...typography.caption, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: spacing.sm }}>
            JURNAL MAKANAN HARI INI ({todayLogs.length})
          </Text>

          {todayLogs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
              <Text style={{ ...typography.caption, color: colors.textTertiary }}>Belum ada pencatatan makanan hari ini.</Text>
            </View>
          ) : (
            todayLogs.map((log) => (
              <MealCard
                key={log.id}
                log={log}
                onEdit={(item) => setEditingLog(item)}
                onDelete={(id) => deleteMealLog(id)}
              />
            ))
          )}
        </Surface>
      </ScrollView>

      {/* Modals */}
      <SnackModal
        visible={showSnackModal}
        onClose={() => setShowSnackModal(false)}
        onSubmitSnack={handleAddSnackSubmit}
        onDrinkWater={() => addWaterGlass()}
        userApiKey={userApiKey}
      />

      <AddMealModal
        visible={showAddMealModal}
        onClose={() => setShowAddMealModal(false)}
        onSaveMeal={async (name, nutrition, customTimestamp, itemsBreakdown) => {
          await addMealLog(name, false, nutrition, undefined, customTimestamp, 'ai', itemsBreakdown);
        }}
        userApiKey={userApiKey}
      />

      <EditMealModal
        visible={editingLog !== null}
        log={editingLog}
        onClose={() => setEditingLog(null)}
        onSaveUpdate={async (id, updatedFields) => {
          await updateMealLog(id, updatedFields);
        }}
      />

      <AICoachChatModal
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        userName={profile?.name || 'Teman Diet'}
        userApiKey={userApiKey}
        userContext={{
          fastingHours: Math.floor(elapsedSeconds / 3600),
          caloriesIn: totalCaloriesIn || 0,
          netDeficit: energy?.netBalance || 500,
          steps: steps || 0,
          waterGlasses: waterGlasses || 0,
        }}
      />
    </SafeAreaView>
  );
};
