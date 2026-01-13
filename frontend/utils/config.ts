import { Platform } from 'react-native';

// Determine the correct backend URL based on environment
const getBackendURL = () => {
  // For web, check if we're accessing via localhost or remote URL
  if (typeof window !== 'undefined' && Platform.OS === 'web') {
    const hostname = window.location.hostname;
    
    // If accessing via localhost, use port 8001 directly
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8001';
    }
  }
  
  // For all other cases, use the environment variable
  return process.env.EXPO_PUBLIC_BACKEND_URL || '';
};

export const BACKEND_URL = getBackendURL();

