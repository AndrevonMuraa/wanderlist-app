import { Platform } from 'react-native';

// Production backend URL — used as fallback when the build-time env var
// EXPO_PUBLIC_BACKEND_URL is missing. Must match the value wired in eas.json
// so EAS builds always hit a reachable backend even if env injection fails.
const PRODUCTION_BACKEND_URL = 'https://memory-recap-2026.preview.emergentagent.com';

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
  
  // Use environment variable if available, otherwise use hardcoded production URL
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  return envUrl || PRODUCTION_BACKEND_URL;
};

export const BACKEND_URL = getBackendURL();

