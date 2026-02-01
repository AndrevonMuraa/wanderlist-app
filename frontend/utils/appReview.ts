import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const REVIEW_STATE_KEY = 'app_review_state';

interface ReviewState {
  hasReviewed: boolean;
  lastPromptDate: string | null;
  visitCount: number;
  promptCount: number;
  declinedCount: number;
}

const defaultState: ReviewState = {
  hasReviewed: false,
  lastPromptDate: null,
  visitCount: 0,
  promptCount: 0,
  declinedCount: 0,
};

// Configuration
const CONFIG = {
  MIN_VISITS_BEFORE_PROMPT: 5,      // First prompt after 5 visits
  MIN_DAYS_BETWEEN_PROMPTS: 14,      // Wait 14 days between prompts
  MAX_PROMPTS: 3,                    // Max 3 prompts total
  VISITS_INCREMENT_THRESHOLD: 10,   // Re-prompt after every 10 more visits
};

async function getReviewState(): Promise<ReviewState> {
  try {
    const stored = await AsyncStorage.getItem(REVIEW_STATE_KEY);
    if (stored) {
      return { ...defaultState, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading review state:', error);
  }
  return defaultState;
}

async function saveReviewState(state: ReviewState): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving review state:', error);
  }
}

/**
 * Call this after each successful landmark visit
 */
export async function trackVisitForReview(): Promise<void> {
  const state = await getReviewState();
  state.visitCount += 1;
  await saveReviewState(state);
}

/**
 * Check if we should prompt for review and show prompt if appropriate
 * Returns true if prompt was shown
 */
export async function maybePromptForReview(): Promise<boolean> {
  const state = await getReviewState();
  
  // Already reviewed or max prompts reached
  if (state.hasReviewed || state.promptCount >= CONFIG.MAX_PROMPTS) {
    return false;
  }
  
  // Check visit threshold
  const visitThreshold = CONFIG.MIN_VISITS_BEFORE_PROMPT + 
    (state.promptCount * CONFIG.VISITS_INCREMENT_THRESHOLD);
  
  if (state.visitCount < visitThreshold) {
    return false;
  }
  
  // Check time since last prompt
  if (state.lastPromptDate) {
    const lastPrompt = new Date(state.lastPromptDate);
    const daysSince = (Date.now() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < CONFIG.MIN_DAYS_BETWEEN_PROMPTS) {
      return false;
    }
  }
  
  // Show custom pre-prompt
  return new Promise((resolve) => {
    Alert.alert(
      '🌍 Enjoying WanderMark?',
      "We'd love to hear your feedback! Would you take a moment to rate us?",
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: async () => {
            state.lastPromptDate = new Date().toISOString();
            state.promptCount += 1;
            state.declinedCount += 1;
            await saveReviewState(state);
            resolve(false);
          },
        },
        {
          text: 'Rate App',
          onPress: async () => {
            state.lastPromptDate = new Date().toISOString();
            state.promptCount += 1;
            state.hasReviewed = true; // Assume they'll review
            await saveReviewState(state);
            await requestReview();
            resolve(true);
          },
        },
      ]
    );
  });
}

/**
 * Request native store review dialog
 */
export async function requestReview(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // On web, open store URL in browser
      Alert.alert(
        'Rate Us',
        'Thank you for your support! Reviews help other travelers discover WanderMark.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const isAvailable = await StoreReview.isAvailableAsync();
    
    if (isAvailable) {
      await StoreReview.requestReview();
    } else {
      // Fallback to opening store manually
      const storeUrl = Platform.select({
        ios: 'https://apps.apple.com/app/wandermark/id123456789', // Replace with real ID
        android: 'https://play.google.com/store/apps/details?id=com.wandermark.app',
        default: '',
      });
      
      if (storeUrl) {
        await Linking.openURL(storeUrl);
      }
    }
  } catch (error) {
    console.error('Error requesting review:', error);
  }
}

/**
 * Manually mark as reviewed (if user navigates to store themselves)
 */
export async function markAsReviewed(): Promise<void> {
  const state = await getReviewState();
  state.hasReviewed = true;
  await saveReviewState(state);
}

/**
 * Reset review state (for testing)
 */
export async function resetReviewState(): Promise<void> {
  await AsyncStorage.removeItem(REVIEW_STATE_KEY);
}

/**
 * Get current review stats (for debugging/admin)
 */
export async function getReviewStats(): Promise<ReviewState> {
  return await getReviewState();
}
