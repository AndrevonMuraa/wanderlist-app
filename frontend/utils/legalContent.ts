/**
 * Legal Content Fetcher
 *
 * Strategy: CDN-first with bundled fallback.
 *   1. Try to fetch the latest markdown from the Trust Center CDN
 *      (configurable via EXPO_PUBLIC_TRUST_CENTER_URL, defaults to
 *      https://wandermark.app). 8-second timeout.
 *   2. On success: cache the content + ETag in AsyncStorage so the next
 *      launch renders instantly while a background revalidation happens.
 *   3. On failure (offline, 5xx, slow network): return the most recently
 *      cached copy; if none, return the bundled version that shipped
 *      with this App Store build.
 *
 * Result: you can update privacy.md / terms.md on the CDN and users see
 * the new text on the next app open — no App Store re-submission needed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BUNDLED_PRIVACY_MD, BUNDLED_TERMS_MD } from '../constants/legal';

export type LegalDoc = 'privacy' | 'terms';

const BASE_URL =
  (process.env.EXPO_PUBLIC_TRUST_CENTER_URL ?? 'https://wandermark.app').replace(/\/$/, '');

const TIMEOUT_MS = 8000;
// Revalidate at most every 6 hours to avoid hammering the CDN
const REVALIDATE_AFTER_MS = 6 * 60 * 60 * 1000;

const PATH: Record<LegalDoc, string> = {
  privacy: '/privacy.md',
  terms: '/terms.md',
};

const BUNDLED: Record<LegalDoc, string> = {
  privacy: BUNDLED_PRIVACY_MD,
  terms: BUNDLED_TERMS_MD,
};

const cacheKey = (doc: LegalDoc) => `@wandermark/legal/${doc}/v1`;
const cacheMetaKey = (doc: LegalDoc) => `@wandermark/legal/${doc}/meta/v1`;

interface CacheMeta {
  fetchedAt: number;
  source: 'network' | 'bundled';
}

export interface LegalContent {
  markdown: string;
  source: 'network' | 'cache' | 'bundled';
  fetchedAt: number | null;
}

async function fetchFromNetwork(doc: LegalDoc): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${PATH[doc]}`, {
      signal: controller.signal,
      headers: { Accept: 'text/markdown, text/plain, */*' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Sanity check: must look like markdown (has a heading) and be non-trivial
    if (text.length < 500 || !text.includes('#')) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function readCache(doc: LegalDoc): Promise<{ markdown: string; meta: CacheMeta } | null> {
  try {
    const [markdown, metaRaw] = await Promise.all([
      AsyncStorage.getItem(cacheKey(doc)),
      AsyncStorage.getItem(cacheMetaKey(doc)),
    ]);
    if (!markdown || !metaRaw) return null;
    return { markdown, meta: JSON.parse(metaRaw) as CacheMeta };
  } catch {
    return null;
  }
}

async function writeCache(doc: LegalDoc, markdown: string) {
  try {
    const meta: CacheMeta = { fetchedAt: Date.now(), source: 'network' };
    await Promise.all([
      AsyncStorage.setItem(cacheKey(doc), markdown),
      AsyncStorage.setItem(cacheMetaKey(doc), JSON.stringify(meta)),
    ]);
  } catch {
    // Best-effort cache — ignore failures
  }
}

/**
 * Get the freshest available version of a legal document.
 *
 * Behavior:
 *   - If we have a fresh cache (< 6h old), return it immediately and skip network
 *   - Otherwise try the network, cache on success
 *   - On any failure, fall through to cache → bundled
 */
export async function getLegalContent(doc: LegalDoc): Promise<LegalContent> {
  const cached = await readCache(doc);
  const now = Date.now();

  if (cached && now - cached.meta.fetchedAt < REVALIDATE_AFTER_MS) {
    return { markdown: cached.markdown, source: 'cache', fetchedAt: cached.meta.fetchedAt };
  }

  const fresh = await fetchFromNetwork(doc);
  if (fresh) {
    await writeCache(doc, fresh);
    return { markdown: fresh, source: 'network', fetchedAt: Date.now() };
  }

  if (cached) {
    return { markdown: cached.markdown, source: 'cache', fetchedAt: cached.meta.fetchedAt };
  }

  return { markdown: BUNDLED[doc], source: 'bundled', fetchedAt: null };
}

/** Force a network refetch, bypassing the freshness window. Used by a pull-to-refresh gesture. */
export async function refreshLegalContent(doc: LegalDoc): Promise<LegalContent> {
  const fresh = await fetchFromNetwork(doc);
  if (fresh) {
    await writeCache(doc, fresh);
    return { markdown: fresh, source: 'network', fetchedAt: Date.now() };
  }
  const cached = await readCache(doc);
  if (cached) {
    return { markdown: cached.markdown, source: 'cache', fetchedAt: cached.meta.fetchedAt };
  }
  return { markdown: BUNDLED[doc], source: 'bundled', fetchedAt: null };
}
