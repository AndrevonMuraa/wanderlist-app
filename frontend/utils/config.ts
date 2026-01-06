import { Platform } from 'react-native';

// Determine the correct backend URL based on environment
const getBackendURL = () => {
  // For native mobile, always use the external URL
  if (Platform.OS !== 'web') {
    return process.env.EXPO_PUBLIC_BACKEND_URL || '';
  }
  
  // For web, check if we're accessing via localhost or remote URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If accessing via localhost, use relative URLs (proxy will handle routing)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
    
    // If accessing via remote URL (like emergentagent.com), use full backend URL
    // This handles iPhone browsers accessing the web version
    return process.env.EXPO_PUBLIC_BACKEND_URL || '';
  }
  
  // Default fallback
  return '';
};

export const BACKEND_URL = getBackendURL();

