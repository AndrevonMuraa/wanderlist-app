import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL } from '../utils/config';

// Storage keys
const STORAGE_KEYS = {
  CACHED_LANDMARKS: 'offline_landmarks',
  CACHED_VISITS: 'offline_visits',
  CACHED_COUNTRIES: 'offline_countries',
  CACHED_PROGRESS: 'offline_progress',
  PENDING_VISITS: 'offline_pending_visits',
  LAST_SYNC: 'offline_last_sync',
};

interface PendingVisit {
  id: string;
  landmark_id: string;
  timestamp: string;
  synced: boolean;
}

interface CachedData {
  landmarks: Record<string, any[]>;  // country_id -> landmarks[]
  visits: any[];
  countries: any[];
  progress: any;
  lastSync: string | null;
}

interface OfflineContextType {
  isOnline: boolean;
  isInitialized: boolean;
  pendingVisitsCount: number;
  lastSyncTime: string | null;
  // Cache operations
  getCachedLandmarks: (countryId: string) => Promise<any[] | null>;
  cacheLandmarks: (countryId: string, landmarks: any[]) => Promise<void>;
  getCachedVisits: () => Promise<any[] | null>;
  cacheVisits: (visits: any[]) => Promise<void>;
  getCachedCountries: () => Promise<any[] | null>;
  cacheCountries: (countries: any[]) => Promise<void>;
  getCachedProgress: () => Promise<any | null>;
  cacheProgress: (progress: any) => Promise<void>;
  // Offline visit queue
  queueVisit: (landmarkId: string) => Promise<void>;
  syncPendingVisits: () => Promise<{ synced: number; failed: number }>;
  clearCache: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingVisitsCount, setPendingVisitsCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Initialize network listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online ?? true);
      
      // Auto-sync when coming back online
      if (online && !isOnline) {
        syncPendingVisits();
      }
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
      setIsInitialized(true);
    });

    // Load pending visits count
    loadPendingVisitsCount();
    loadLastSyncTime();

    return () => unsubscribe();
  }, []);

  const loadPendingVisitsCount = async () => {
    try {
      const pending = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_VISITS);
      if (pending) {
        const visits: PendingVisit[] = JSON.parse(pending);
        setPendingVisitsCount(visits.filter(v => !v.synced).length);
      }
    } catch (error) {
      console.error('Error loading pending visits count:', error);
    }
  };

  const loadLastSyncTime = async () => {
    try {
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      setLastSyncTime(lastSync);
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  };

  // Cache landmarks for a country
  const cacheLandmarks = useCallback(async (countryId: string, landmarks: any[]) => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_LANDMARKS);
      const cached: Record<string, any[]> = existing ? JSON.parse(existing) : {};
      cached[countryId] = landmarks;
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_LANDMARKS, JSON.stringify(cached));
    } catch (error) {
      console.error('Error caching landmarks:', error);
    }
  }, []);

  const getCachedLandmarks = useCallback(async (countryId: string): Promise<any[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_LANDMARKS);
      if (cached) {
        const data: Record<string, any[]> = JSON.parse(cached);
        return data[countryId] || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting cached landmarks:', error);
      return null;
    }
  }, []);

  // Cache visits
  const cacheVisits = useCallback(async (visits: any[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_VISITS, JSON.stringify(visits));
    } catch (error) {
      console.error('Error caching visits:', error);
    }
  }, []);

  const getCachedVisits = useCallback(async (): Promise<any[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_VISITS);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached visits:', error);
      return null;
    }
  }, []);

  // Cache countries
  const cacheCountries = useCallback(async (countries: any[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_COUNTRIES, JSON.stringify(countries));
    } catch (error) {
      console.error('Error caching countries:', error);
    }
  }, []);

  const getCachedCountries = useCallback(async (): Promise<any[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_COUNTRIES);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached countries:', error);
      return null;
    }
  }, []);

  // Cache progress
  const cacheProgress = useCallback(async (progress: any) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_PROGRESS, JSON.stringify(progress));
    } catch (error) {
      console.error('Error caching progress:', error);
    }
  }, []);

  const getCachedProgress = useCallback(async (): Promise<any | null> => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_PROGRESS);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached progress:', error);
      return null;
    }
  }, []);

  // Queue a visit when offline
  const queueVisit = useCallback(async (landmarkId: string) => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_VISITS);
      const pendingVisits: PendingVisit[] = existing ? JSON.parse(existing) : [];
      
      // Check if already queued
      if (pendingVisits.some(v => v.landmark_id === landmarkId && !v.synced)) {
        return;
      }

      const newVisit: PendingVisit = {
        id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        landmark_id: landmarkId,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      pendingVisits.push(newVisit);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_VISITS, JSON.stringify(pendingVisits));
      setPendingVisitsCount(prev => prev + 1);
      
      // Update cached visits to include this pending one
      const cachedVisits = await getCachedVisits();
      if (cachedVisits) {
        cachedVisits.push({
          landmark_id: landmarkId,
          created_at: newVisit.timestamp,
          is_pending: true,
        });
        await cacheVisits(cachedVisits);
      }
    } catch (error) {
      console.error('Error queueing visit:', error);
    }
  }, [getCachedVisits, cacheVisits]);

  // Sync pending visits when back online
  const syncPendingVisits = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    let synced = 0;
    let failed = 0;

    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_VISITS);
      if (!existing) return { synced, failed };

      const pendingVisits: PendingVisit[] = JSON.parse(existing);
      const unsynced = pendingVisits.filter(v => !v.synced);

      if (unsynced.length === 0) return { synced, failed };

      const token = await getToken();
      if (!token) return { synced, failed };

      for (const visit of unsynced) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/visits`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ landmark_id: visit.landmark_id }),
          });

          if (response.ok || response.status === 400) {
            // 400 means already visited - still mark as synced
            visit.synced = true;
            synced++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }

      // Update storage
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_VISITS, JSON.stringify(pendingVisits));
      setPendingVisitsCount(pendingVisits.filter(v => !v.synced).length);

      // Update last sync time
      const now = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
      setLastSyncTime(now);

      if (synced > 0) {
        // Refresh visits cache
        try {
          const visitsResponse = await fetch(`${BACKEND_URL}/api/visits`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (visitsResponse.ok) {
            const visits = await visitsResponse.json();
            await cacheVisits(visits);
          }
        } catch (error) {
          console.error('Error refreshing visits:', error);
        }
      }

    } catch (error) {
      console.error('Error syncing pending visits:', error);
    }

    return { synced, failed };
  }, [cacheVisits]);

  // Clear all cached data
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CACHED_LANDMARKS,
        STORAGE_KEYS.CACHED_VISITS,
        STORAGE_KEYS.CACHED_COUNTRIES,
        STORAGE_KEYS.CACHED_PROGRESS,
        STORAGE_KEYS.PENDING_VISITS,
        STORAGE_KEYS.LAST_SYNC,
      ]);
      setPendingVisitsCount(0);
      setLastSyncTime(null);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, []);

  const value: OfflineContextType = {
    isOnline,
    isInitialized,
    pendingVisitsCount,
    lastSyncTime,
    getCachedLandmarks,
    cacheLandmarks,
    getCachedVisits,
    cacheVisits,
    getCachedCountries,
    cacheCountries,
    getCachedProgress,
    cacheProgress,
    queueVisit,
    syncPendingVisits,
    clearCache,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

export default OfflineContext;
