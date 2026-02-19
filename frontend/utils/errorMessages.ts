import { Alert, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export type ErrorType = 
  | 'network'
  | 'auth'
  | 'server'
  | 'permission'
  | 'validation'
  | 'notFound'
  | 'rateLimit'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  action?: string;
  retry?: boolean;
}

const errorMessages: Record<ErrorType, { title: string; message: string; action?: string }> = {
  network: {
    title: 'No Internet Connection',
    message: "Please check your connection and try again. Your data will be saved offline.",
    action: 'Retry',
  },
  auth: {
    title: 'Session Expired',
    message: 'Please log in again to continue.',
    action: 'Log In',
  },
  server: {
    title: 'Server Error',
    message: "We're having trouble connecting. Please try again in a moment.",
    action: 'Retry',
  },
  permission: {
    title: 'Permission Required',
    message: 'Please grant the required permissions in your device settings.',
    action: 'Open Settings',
  },
  validation: {
    title: 'Invalid Input',
    message: 'Please check your information and try again.',
  },
  notFound: {
    title: 'Not Found',
    message: "The item you're looking for doesn't exist or has been removed.",
  },
  rateLimit: {
    title: 'Too Many Requests',
    message: 'Please wait a moment before trying again.',
    action: 'Retry',
  },
  unknown: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    action: 'Retry',
  },
};

export function classifyError(error: any, statusCode?: number): ErrorType {
  // Network errors
  if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
    return 'network';
  }
  
  // HTTP status codes
  if (statusCode) {
    if (statusCode === 401 || statusCode === 403) return 'auth';
    if (statusCode === 404) return 'notFound';
    if (statusCode === 422 || statusCode === 400) return 'validation';
    if (statusCode === 429) return 'rateLimit';
    if (statusCode >= 500) return 'server';
  }
  
  // Check for specific error messages
  const msg = error?.message?.toLowerCase() || '';
  if (msg.includes('permission')) return 'permission';
  if (msg.includes('unauthorized') || msg.includes('token')) return 'auth';
  if (msg.includes('not found')) return 'notFound';
  
  return 'unknown';
}

export function getErrorDetails(type: ErrorType): { title: string; message: string; action?: string } {
  return errorMessages[type];
}

export async function handleApiError(
  error: any,
  statusCode?: number,
  onRetry?: () => void,
  onAuth?: () => void
): Promise<void> {
  const errorType = classifyError(error, statusCode);
  const details = getErrorDetails(errorType);
  
  // Check if actually offline
  if (errorType === 'network') {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      // Truly offline - show offline message
      Alert.alert(
        details.title,
        details.message,
        [
          { text: 'OK', style: 'default' },
          ...(onRetry ? [{ text: 'Retry', onPress: onRetry }] : []),
        ]
      );
      return;
    }
  }
  
  // Build alert buttons
  const buttons: any[] = [{ text: 'OK', style: 'default' }];
  
  if (errorType === 'auth' && onAuth) {
    buttons.push({ text: 'Log In', onPress: onAuth, style: 'default' });
  } else if (details.action && onRetry) {
    buttons.push({ text: details.action, onPress: onRetry, style: 'default' });
  }
  
  Alert.alert(details.title, details.message, buttons);
}

export function getUserFriendlyMessage(error: any, statusCode?: number): string {
  const type = classifyError(error, statusCode);
  return errorMessages[type].message;
}

// Specific error handlers
export function handleNetworkError(onRetry?: () => void): void {
  const details = getErrorDetails('network');
  Alert.alert(
    details.title,
    details.message,
    [
      { text: 'OK' },
      ...(onRetry ? [{ text: 'Retry', onPress: onRetry }] : []),
    ]
  );
}

export function handleAuthError(onLogin?: () => void): void {
  const details = getErrorDetails('auth');
  Alert.alert(
    details.title,
    details.message,
    [
      { text: 'OK' },
      ...(onLogin ? [{ text: 'Log In', onPress: onLogin }] : []),
    ]
  );
}
