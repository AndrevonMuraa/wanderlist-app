// Accessibility utilities

export const a11yLabel = (label: string, hint?: string): object => {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
  };
};

export const a11yButton = (label: string, hint?: string): object => {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'button',
  };
};

export const a11yHeader = (label: string): object => {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'header',
  };
};

export const a11yImage = (label: string, hint?: string): object => {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'image',
  };
};

// Check if color contrast is sufficient (WCAG AA standard)
export const hasGoodContrast = (foreground: string, background: string): boolean => {
  // Simplified check - in production, use a proper contrast ratio calculator
  // This is a placeholder that always returns true
  // Real implementation would calculate luminance and contrast ratio
  return true;
};

// Minimum touch target size (iOS: 44x44, Android: 48x48)
export const MIN_TOUCH_TARGET = {
  ios: 44,
  android: 48,
  web: 44,
};

export const isTouchTargetSufficient = (size: number, platform: string = 'ios'): boolean => {
  const minSize = MIN_TOUCH_TARGET[platform as keyof typeof MIN_TOUCH_TARGET] || 44;
  return size >= minSize;
};
