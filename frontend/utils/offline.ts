import NetInfo from '@react-native-community/netinfo';
import { getCachedData, setCachedData } from './performance';

// Offline mode utilities

export const checkOnlineStatus = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
};

export const fetchWithOfflineSupport = async (
  url: string,
  options: RequestInit = {},
  cacheKey: string
): Promise<Response> => {
  const isOnline = await checkOnlineStatus();

  if (!isOnline) {
    // Try to return cached data
    const cached = getCachedData(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error('No internet connection and no cached data available');
  }

  // Online - fetch and cache
  const response = await fetch(url, options);
  if (response.ok) {
    const data = await response.json();
    setCachedData(cacheKey, data);
    // Return a new response with the data
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return response;
};

export const useOfflineDetection = () => {
  // Hook for monitoring online/offline status
  // Can be enhanced with state management
  return {
    checkStatus: checkOnlineStatus,
  };
};
