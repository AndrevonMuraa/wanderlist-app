import { Platform, Alert } from 'react-native';
import { successHaptic, errorHaptic } from './haptics';

// Simple toast notification system
export const showToast = {
  success: async (message: string, title?: string) => {
    await successHaptic();
    if (Platform.OS === 'web') {
      // For web, use a simple alert or could integrate a web toast library
      console.log('SUCCESS:', message);
    } else {
      Alert.alert(title || 'Success', message);
    }
  },
  
  error: async (message: string, title?: string) => {
    await errorHaptic();
    if (Platform.OS === 'web') {
      console.error('ERROR:', message);
    } else {
      Alert.alert(title || 'Error', message);
    }
  },
  
  info: (message: string, title?: string) => {
    if (Platform.OS === 'web') {
      console.info('INFO:', message);
    } else {
      Alert.alert(title || 'Info', message);
    }
  },
  
  confirm: (message: string, onConfirm: () => void, onCancel?: () => void, title?: string) => {
    Alert.alert(
      title || 'Confirm',
      message,
      [
        {
          text: 'Cancel',
          onPress: onCancel,
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: onConfirm,
        },
      ],
      { cancelable: true }
    );
  },
};
