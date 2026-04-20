/**
 * Sentry bootstrapping for React Native (Expo SDK 51+).
 *
 * Safe no-op if EXPO_PUBLIC_SENTRY_DSN is not set — the app boots normally
 * in preview / local / web-only environments without any Sentry config.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const NOISY_PATTERNS: Array<string | RegExp> = [
  'Network request failed',
  'Failed to fetch',
  'NetworkError',
  'AbortError',
  'User cancelled',
  'User denied',
  'Request aborted',
  /aborted/i,
  /canceled/i,
];

export function initSentry(): boolean {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    // Silent: intentional no-op when DSN is not configured.
    return false;
  }

  const envName =
    process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ||
    (__DEV__ ? 'development' : 'production');

  const appVersion = (Constants.expoConfig?.version ?? '0.0.0') as string;
  const buildNumber =
    (Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : (Constants.expoConfig as any)?.android?.versionCode) ?? 'unknown';
  const release = `wandermark@${appVersion}+${buildNumber}`;

  Sentry.init({
    dsn,
    environment: envName,
    release,
    // 10% performance sampling in production keeps us inside the free tier;
    // 100% in dev so integration testing is thorough.
    tracesSampleRate: envName === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
    ignoreErrors: NOISY_PATTERNS,
    // Session replay — only capture on error (free-tier friendly).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });

  return true;
}

/** Attach the signed-in user to the Sentry scope. */
export function setSentryUser(user: { user_id: string; username?: string; email?: string } | null) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.user_id,
    username: user.username,
    email: user.email,
  });
}
