import { useCallback, useRef } from 'react';

// Simple cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCachedData = (key: string): any | null => {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

export const setCachedData = (key: string, data: any): void => {
  apiCache.set(key, { data, timestamp: Date.now() });
};

export const clearCache = (key?: string): void => {
  if (key) {
    apiCache.delete(key);
  } else {
    apiCache.clear();
  }
};

// Debounce hook for search inputs
export const useDebounce = (callback: Function, delay: number = 300) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay) as unknown as NodeJS.Timeout;
    },
    [callback, delay]
  );
};

// Throttle for scroll events
export const useThrottle = (callback: Function, delay: number = 100) => {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args: any[]) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    },
    [callback, delay]
  );
};
