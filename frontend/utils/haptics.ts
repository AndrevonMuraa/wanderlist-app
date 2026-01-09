import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Light haptic feedback for button presses, selections
export const lightHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Silently fail if haptics not available
    }
  }
};

// Medium haptic feedback for important actions
export const mediumHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Silently fail
    }
  }
};

// Heavy haptic feedback for major achievements
export const heavyHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      // Silently fail
    }
  }
};

// Success notification haptic
export const successHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Silently fail
    }
  }
};

// Error notification haptic
export const errorHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      // Silently fail
    }
  }
};

// Selection change haptic (for tabs, toggles)
export const selectionHaptic = async () => {
  if (Platform.OS !== 'web') {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      // Silently fail
    }
  }
};
