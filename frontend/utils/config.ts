import { Platform } from 'react-native';

// For web, use relative URLs (same origin) which routes to localhost:8001 via proxy
// For mobile, use the external URL
export const BACKEND_URL = Platform.OS === 'web' 
  ? '' 
  : (process.env.EXPO_PUBLIC_BACKEND_URL || '');
