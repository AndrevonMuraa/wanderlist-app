// WanderList Design System - Sophisticated Travel Aesthetic

export const colors = {
  // Primary Colors
  primary: '#7A9D7E',        // Sage green - nature, calm
  primaryDark: '#5A7D5E',    // Darker sage
  primaryLight: '#A4BDA8',   // Light sage
  
  // Secondary Colors
  secondary: '#2C5F5D',      // Deep teal - ocean
  secondaryLight: '#4A7D7B', // Light teal
  
  // Accent Colors
  accent: '#C9A961',         // Gold - premium
  accentWarm: '#D4A574',     // Terracotta
  
  // Neutrals
  background: '#F9F6F2',     // Warm cream
  surface: '#FFFFFF',        // Pure white
  surfaceElevated: '#FFFFFF',
  
  // Text
  text: '#3A3A3A',           // Charcoal
  textSecondary: '#6B6B6B',  // Medium gray
  textLight: '#9A9A9A',      // Light gray
  textInverse: '#FFFFFF',    // White on dark
  
  // Status Colors (muted)
  success: '#7A9D7E',
  warning: '#D4A574',
  error: '#B87878',
  info: '#7A9DB8',
  
  // Tier Colors
  free: '#9A9A9A',           // Gray
  basic: '#7A9DB8',          // Muted blue
  premium: '#C9A961',        // Gold
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Borders
  border: '#E8E4DF',
  borderLight: '#F2EFEA',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const typography = {
  // Headings
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  
  // Body
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  
  // Labels
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  
  // Captions
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};

export default theme;
