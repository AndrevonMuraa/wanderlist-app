import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../../styles/theme';
import ContinentsScreen from '../continents';

/**
 * Explore Tab - Simply renders the ContinentsScreen
 * The ContinentsScreen has its own internal navigation (Explore/Bucket List tabs)
 */
export default function ExploreTab() {
  return (
    <View style={styles.container}>
      <ContinentsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
