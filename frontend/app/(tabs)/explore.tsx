import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import ContinentsScreen from '../continents';
import BucketListScreen from '../bucket-list';
import TripsScreen from '../trips';

type TabType = 'explore' | 'bucket' | 'trips';

export default function ExploreTab() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('explore');

  const renderTabButton = (tab: TabType, icon: string, label: string) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
        onPress={() => setActiveTab(tab)}
      >
        <Ionicons
          name={icon as any}
          size={20}
          color={isActive ? theme.colors.primary : theme.colors.textSecondary}
        />
        <Text
          style={[
            styles.tabLabel,
            isActive && styles.tabLabelActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'explore':
        return <ContinentsScreen />;
      case 'bucket':
        return <BucketListScreen />;
      case 'trips':
        return <TripsScreen />;
      default:
        return <ContinentsScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('explore', 'earth', 'Explore')}
        {renderTabButton('bucket', 'heart', 'Bucket List')}
        {renderTabButton('trips', 'airplane', 'My Trips')}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  tabLabelActive: {
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
});
