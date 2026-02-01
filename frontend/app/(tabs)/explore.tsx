import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import ContinentsScreen from '../continents';

/**
 * Explore Tab - Simply renders the ContinentsScreen
 * The ContinentsScreen has its own internal navigation (Explore/Bucket List tabs)
 */
export default function ExploreTab() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ContinentsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
