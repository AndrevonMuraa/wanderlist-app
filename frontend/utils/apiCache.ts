/**
 * Lightweight in-memory API cache with TTL and selective invalidation.
 * 
 * Usage:
 *   const data = await cachedFetch('/api/countries', token, 'countries');
 *   invalidateCache('countries');       // After a visit is registered
 *   invalidateCacheGroup('visit');      // Clears all visit-related caches
 */

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

// Cache key groups — invalidating a group clears all associated keys
const CACHE_GROUPS: Record<string, string[]> = {
  visit: ['countries', 'continent-stats', 'progress', 'stats', 'visits', 'achievements', 'country-visits'],
};

/**
 * Get cached data if still valid, otherwise return null.
 */
export function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Store data in cache with optional custom TTL.
 */
export function setCache(key: string, data: any, ttl: number = DEFAULT_TTL): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

/**
 * Invalidate a single cache key.
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache keys in a named group.
 * E.g. invalidateCacheGroup('visit') clears countries, stats, progress, etc.
 */
export function invalidateCacheGroup(group: string): void {
  const keys = CACHE_GROUPS[group];
  if (keys) {
    keys.forEach(k => cache.delete(k));
  }
}

/**
 * Clear all cached data.
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Fetch with caching. Returns cached data if available, otherwise fetches from API.
 * @param url - Full API URL
 * @param token - Auth token
 * @param cacheKey - Key to store/retrieve cached data
 * @param ttl - Cache duration in ms (default 5 min)
 */
export async function cachedFetch(
  url: string,
  token: string,
  cacheKey: string,
  ttl: number = DEFAULT_TTL
): Promise<Response> {
  const cached = getCached(cacheKey);
  if (cached !== null) {
    // Return a mock Response with cached JSON data
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok) {
    const data = await response.json();
    setCache(cacheKey, data, ttl);
    // Return a new Response so the caller can still call .json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  }

  return response;
}
