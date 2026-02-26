import { Router } from 'expo-router';

/**
 * Safely navigate back. If there's no history to go back to,
 * navigate to the home/explore tab instead of crashing.
 */
export const safeGoBack = (router: Router) => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)/explore');
  }
};
