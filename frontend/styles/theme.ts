// WanderMark Design System - Luxury Travel Magazine Aesthetic
// Inspired by editorial travel magazines with Maldivean ocean vibes
//
// CORE DESIGN PHILOSOPHY: "Ocean to Sand" Gradient
// ================================================
// Our signature gradient flows from vibrant Maldivean turquoise (#4DB8D8) 
// to warm beach sand (#E8DCC8), evoking the feeling of standing at the 
// water's edge where ocean meets shore. This gradient is used throughout
// the app as our primary brand element - in headers, buttons, and accents.
//
// Usage: colors={['#4DB8D8', '#E8DCC8']} with horizontal direction (x: 0→1)

// Light Theme Colors
export const lightColors = {
  // Primary Colors - Maldivean Ocean Blues
  primary: '#4DB8D8',        // Maldivean turquoise - vibrant ocean
  primaryDark: '#2E9AB5',    // Deep ocean blue
  primaryLight: '#7DCBE3',   // Light tropical water
  
  // Secondary Colors - Warm Beach Tones
  secondary: '#E8DCC8',      // Warm sand
  secondaryLight: '#F5F0E8', // Light sand
  
  // Luxury Accent Colors
  accent: '#C9A961',         // Rich gold - luxury touch
  accentYellow: '#FFD700',   // Golden star color
  accentBronze: '#B8956A',   // Bronze
  accentCopper: '#D4A574',   // Copper warmth
  accentTeal: '#1E8A8A',     // Deep teal - sophisticated ocean accent
  
  // Neutrals - Editorial Sophistication
  background: '#F5F3F0',     // Warm cream background
  surface: '#FFFFFF',        // Pure white cards
  surfaceElevated: '#FFFFFF',
  surfaceTinted: '#FAF8F5',  // Subtle cream tint
  
  // Text - Editorial Quality
  text: '#2A2A2A',           // Deep charcoal - strong contrast
  textSecondary: '#6B6B6B',  // Medium gray
  textLight: '#9B9B9B',      // Light gray
  textInverse: '#FFFFFF',    // White on images
  
  // Status Colors
  success: '#4DB8D8',
  warning: '#C9A961',
  error: '#D4747E',
  info: '#4DB8D8',
  
  // Tier Colors - Luxury
  free: '#9B9B9B',           // Gray
  basic: '#4DB8D8',          // Ocean blue
  premium: '#C9A961',        // Gold
  
  // Overlays - For text on images
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',
  overlayStrong: 'rgba(0, 0, 0, 0.65)',
  
  // Borders - Subtle
  border: '#E8E4DF',
  borderLight: '#F0EDE8',
};

// Dark Theme Colors
export const darkColors = {
  // Primary Colors - Maldivean Ocean Blues (slightly adjusted for dark)
  primary: '#5CC4E4',        // Brighter ocean for dark mode
  primaryDark: '#4DB8D8',    // Ocean blue
  primaryLight: '#7DCBE3',   // Light tropical water
  
  // Secondary Colors - Warm Beach Tones (muted for dark)
  secondary: '#3D3A35',      // Dark sand tone
  secondaryLight: '#4A4640', // Slightly lighter
  
  // Luxury Accent Colors
  accent: '#D4B872',         // Brighter gold for dark mode
  accentYellow: '#FFD700',   // Golden star color
  accentBronze: '#C9A061',   // Bronze
  accentCopper: '#E5B685',   // Copper warmth
  accentTeal: '#2AA5A5',     // Brighter teal for dark mode
  
  // Neutrals - Dark Mode
  background: '#121212',     // True dark background
  surface: '#1E1E1E',        // Elevated surface
  surfaceElevated: '#2A2A2A', // More elevated
  surfaceTinted: '#2D2D2D',  // Lighter tint for stat boxes
  
  // Text - High contrast for dark mode
  text: '#FFFFFF',           // Pure white for best contrast
  textSecondary: '#C0C0C0',  // Lighter gray - improved contrast
  textLight: '#A0A0A0',      // Medium-light gray - improved visibility
  textInverse: '#1E1E1E',    // Dark text on light elements
  
  // Status Colors (same as light)
  success: '#5CC4E4',
  warning: '#D4B872',
  error: '#E57373',
  info: '#5CC4E4',
  
  // Tier Colors - Luxury
  free: '#909090',           // Gray - more visible
  basic: '#5CC4E4',          // Ocean blue
  premium: '#D4B872',        // Gold
  
  // Overlays - For text on images
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  overlayStrong: 'rgba(0, 0, 0, 0.8)',
  
  // Borders - more visible in dark mode
  border: '#404040',
  borderLight: '#353535',
};

// Country-specific accent colors (shared between themes)
export const countryAccents = {
  norway: '#4A90A4',      // Nordic fjord blue
  france: '#9B7EBE',      // Provence lavender
  italy: '#C8956A',       // Tuscan sunset
  japan: '#E8879E',       // Cherry blossom
  egypt: '#D4A574',       // Desert gold
  peru: '#8B6F47',        // Andes earth
  australia: '#E89B5C',   // Outback sunset
  usa: '#5B8FA3',         // Grand Canyon blue
  uk: '#7A8E7E',          // English countryside
  china: '#D4534D',       // Vermillion
  spain: '#E8A05C',       // Mediterranean sun
  greece: '#4DB8D8',      // Aegean blue
  thailand: '#8FBC8F',    // Tropical green
  india: '#D4956A',       // Spice market
  brazil: '#5FB85F',      // Rainforest
  mexico: '#E8A872',      // Sunset orange
  uae: '#C9A961',         // Desert gold
  germany: '#6B8E99',     // Rhine blue
  canada: '#D46B6B',      // Maple
  south_africa: '#C8854D', // Safari sunset
};

// For backward compatibility - default to light theme
export const colors = {
  ...lightColors,
  countryAccents,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,  // Large rounded cards like in the design
  round: 999,
};

export const typography = {
  // Display - Editorial Headlines (Serif feel)
  display: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  
  // Headings - Strong & Bold
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 30,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  
  // Body - Clean & Readable
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  
  // Labels
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Dark mode shadows (more subtle)
export const darkShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Gradients - Ocean to Sand (our signature look)
export const gradients = {
  // Horizontal ocean to sand - primary brand gradient
  oceanToSand: ['#4DB8D8', '#E8DCC8'] as const,
  
  // Dark mode gradient
  oceanToSandDark: ['#4DB8D8', '#3D3A35'] as const,
  
  // Vertical variations
  oceanDepth: ['#4DB8D8', '#2E9AB5'] as const,
  sandGold: ['#E8DCC8', '#C9A961'] as const,
  
  // Teal gradients for PRO features
  tealGradient: ['#4DB8D8', '#1E8A8A'] as const,
  
  // Premium gold gradient
  goldShimmer: ['#C9A961', '#E8DCC8'] as const,
  
  // Sunset accent
  sunsetGlow: ['#E8DCC8', '#D4A574'] as const,
  
  // Direction helpers
  horizontal: {
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  vertical: {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  diagonal: {
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

// Helper function to get theme colors
export const getThemeColors = (isDark: boolean) => {
  return isDark ? { ...darkColors, countryAccents } : { ...lightColors, countryAccents };
};

// Helper function to get theme shadows
export const getThemeShadows = (isDark: boolean) => {
  return isDark ? darkShadows : shadows;
};

// Helper function to get gradient colors
export const getGradientColors = (isDark: boolean) => {
  return isDark ? gradients.oceanToSandDark : gradients.oceanToSand;
};

// Default theme export (light mode for backward compatibility)
const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  gradients,
};

export default theme;
