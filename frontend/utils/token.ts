import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};
