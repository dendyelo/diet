import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { AppProvider } from './src/context/AppContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoggerScreen } from './src/screens/LoggerScreen';
import { WeightScreen } from './src/screens/WeightScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { Home, Utensils, Scale, PieChart, User } from 'lucide-react-native';

type TabName = 'home' | 'logger' | 'weight' | 'analytics' | 'profile';

const MainNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'logger':
        return <LoggerScreen />;
      case 'weight':
        return <WeightScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090B" />
      <View style={styles.screenContainer}>{renderScreen()}</View>

      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('home')}>
          <Home size={20} color={activeTab === 'home' ? '#3B82F6' : 'rgba(255, 255, 255, 0.4)'} />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('logger')}>
          <Utensils size={20} color={activeTab === 'logger' ? '#3B82F6' : 'rgba(255, 255, 255, 0.4)'} />
          <Text style={[styles.tabLabel, activeTab === 'logger' && styles.tabLabelActive]}>AI Log</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('weight')}>
          <Scale size={20} color={activeTab === 'weight' ? '#3B82F6' : 'rgba(255, 255, 255, 0.4)'} />
          <Text style={[styles.tabLabel, activeTab === 'weight' && styles.tabLabelActive]}>Berat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('analytics')}>
          <PieChart size={20} color={activeTab === 'analytics' ? '#3B82F6' : 'rgba(255, 255, 255, 0.4)'} />
          <Text style={[styles.tabLabel, activeTab === 'analytics' && styles.tabLabelActive]}>Analisis</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
          <User size={20} color={activeTab === 'profile' ? '#3B82F6' : 'rgba(255, 255, 255, 0.4)'} />
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainNavigator />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#121215',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingBottom: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  tabLabelActive: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});
