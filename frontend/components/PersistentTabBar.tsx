import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import theme from '../styles/theme';
import { lightHaptic } from '../utils/haptics';

export const PersistentTabBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { name: 'Explore', icon: 'compass-outline', route: '/(tabs)/explore' },
    { name: 'My Journey', icon: 'map-outline', route: '/(tabs)/journey' },
    { name: 'Social', icon: 'people-outline', route: '/(tabs)/social' },
    { name: 'Profile', icon: 'person-outline', route: '/(tabs)/profile' },
  ];

  const isActive = (route: string) => {
    return pathname?.includes('journey') ? route.includes('journey') :
           pathname?.includes('explore') ? route.includes('explore') :
           pathname?.includes('social') ? route.includes('social') :
           pathname?.includes('profile') ? route.includes('profile') :
           false;
  };

  const handlePress = async (route: string) => {
    await lightHaptic();
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const active = isActive(tab.route);
        return (
          <TouchableOpacity
            key={index}
            style={styles.tab}
            onPress={() => handlePress(tab.route)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={24}
              color={active ? theme.colors.primary : theme.colors.textLight}
            />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 90 : 78,
    ...theme.shadows.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    color: theme.colors.textLight,
  },
  tabLabelActive: {
    color: theme.colors.primary,
  },
});
