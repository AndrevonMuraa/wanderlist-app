// User-friendly error messages

export const getErrorMessage = (error: any): string => {
  // Network errors
  if (error.message?.includes('Network') || error.message?.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  
  // Authentication errors
  if (error.status === 401 || error.message?.includes('Unauthorized')) {
    return 'Your session has expired. Please log in again.';
  }
  
  // Permission errors
  if (error.status === 403) {
    return 'You don\'t have permission to access this feature. Consider upgrading your plan.';
  }
  
  // Not found errors
  if (error.status === 404) {
    return 'The item you\'re looking for couldn\'t be found.';
  }
  
  // Server errors
  if (error.status >= 500) {
    return 'Our servers are having trouble. Please try again in a moment.';
  }
  
  // Default friendly message
  return 'Something went wrong. Please try again.';
};

export const showFriendlyError = (error: any, fallbackMessage?: string): string => {
  if (fallbackMessage) return fallbackMessage;
  return getErrorMessage(error);
};
