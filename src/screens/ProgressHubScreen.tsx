import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { WeightScreen } from './WeightScreen';
import { AnalyticsScreen } from './AnalyticsScreen';
import { Scale, BarChart2 } from 'lucide-react-native';

type ProgressTabMode = 'weight' | 'analytics';

export const ProgressHubScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProgressTabMode>('weight');

  return (
    <View style={styles.container}>
      {/* Top Selector Bar */}
      <View style={styles.topSelectorContainer}>
        <TouchableOpacity
          style={[styles.selectorBtn, activeTab === 'weight' && styles.activeBtn]}
          onPress={() => setActiveTab('weight')}
          activeOpacity={0.7}
        >
          <Scale size={16} color={activeTab === 'weight' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'} />
          <Text style={[styles.selectorText, activeTab === 'weight' && styles.activeText]}>
            Berat Badan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.selectorBtn, activeTab === 'analytics' && styles.activeBtn]}
          onPress={() => setActiveTab('analytics')}
          activeOpacity={0.7}
        >
          <BarChart2 size={16} color={activeTab === 'analytics' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'} />
          <Text style={[styles.selectorText, activeTab === 'analytics' && styles.activeText]}>
            Nutrisi & Tren
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Content */}
      <View style={styles.contentArea}>
        {activeTab === 'weight' ? <WeightScreen /> : <AnalyticsScreen />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    paddingTop: 50,
  },
  topSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 4,
  },
  selectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 14,
  },
  activeBtn: {
    backgroundColor: '#10B981',
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
  },
});
