import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL } from '../utils/config';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

export interface SubscriptionStatus {
  subscription_tier: 'free' | 'pro';
  is_pro: boolean;
  expires_at: string | null;
  limits: {
    max_friends: number;
    photos_per_visit: number;
    can_access_premium_landmarks: boolean;
    can_create_custom_visits: boolean;
  };
  usage: {
    friends_count: number;
    friends_limit: number;
    friends_remaining: number;
  };
}

const DEFAULT_STATUS: SubscriptionStatus = {
  subscription_tier: 'free',
  is_pro: false,
  expires_at: null,
  limits: {
    max_friends: 5,
    photos_per_visit: 1,
    can_access_premium_landmarks: false,
    can_create_custom_visits: false,
  },
  usage: {
    friends_count: 0,
    friends_limit: 5,
    friends_remaining: 5,
  },
};

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        setStatus(DEFAULT_STATUS);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError(null);
      } else {
        // If endpoint doesn't exist or fails, assume free tier
        setStatus(DEFAULT_STATUS);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setStatus(DEFAULT_STATUS);
      setError('Failed to fetch subscription status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const refresh = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Helper functions
  const isPro = status.is_pro;
  const canAccessPremiumLandmarks = status.limits.can_access_premium_landmarks;
  const canCreateCustomVisits = status.limits.can_create_custom_visits;
  const maxPhotosPerVisit = status.limits.photos_per_visit;
  const maxFriends = status.limits.max_friends;
  const friendsRemaining = status.usage.friends_remaining;
  const isAtFriendLimit = status.usage.friends_remaining <= 0;

  return {
    status,
    loading,
    error,
    refresh,
    // Quick access helpers
    isPro,
    canAccessPremiumLandmarks,
    canCreateCustomVisits,
    maxPhotosPerVisit,
    maxFriends,
    friendsRemaining,
    isAtFriendLimit,
  };
}
