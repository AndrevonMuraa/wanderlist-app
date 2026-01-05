// WanderList Design System - Luxury Travel Magazine Aesthetic
// Inspired by editorial travel magazines with Maldivean ocean vibes

export const colors = {
  // Primary Colors - Maldivean Ocean Blues
  primary: '#4DB8D8',        // Maldivean turquoise - vibrant ocean
  primaryDark: '#2E9AB5',    // Deep ocean blue
  primaryLight: '#7DCBE3',   // Light tropical water
  
  // Secondary Colors - Warm Beach Tones
  secondary: '#E8DCC8',      // Warm sand
  secondaryLight: '#F5F0E8', // Light sand
  
  // Luxury Accent Colors
  accent: '#C9A961',         // Rich gold - luxury touch
  accentBronze: '#B8956A',   // Bronze
  accentCopper: '#D4A574',   // Copper warmth
  
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
  
  // Country-specific accent colors (for national effects)
  countryAccents: {
    norway: '#B5C5D4',      // Nordic blue
    france: '#C8B5D4',      // Lavender
    italy: '#D4C5B5',       // Tuscan tan
    japan: '#E8C8C8',       // Cherry blossom
    egypt: '#E5D5B7',       // Sand
    peru: '#D4A58B',        // Terracotta
    australia: '#E8D4A8',   // Outback gold
    usa: '#B5C5D4',         // Liberty blue
    uk: '#C8A8A8',          // Royal rose
    china: '#E8B5B5',       // Vermillion
    spain: '#E8D4A8',       // Golden
    greece: '#B5C8D4',      // Aegean
    thailand: '#E8C8D4',    // Orchid
    india: '#E5C8A8',       // Spice
    brazil: '#A8D4A8',      // Rainforest
    mexico: '#E8C8A8',      // Adobe
    uae: '#E5D5B7',         // Desert gold
    germany: '#C8C8C8',     // Silver
    canada: '#D4B5B5',      // Maple
    south_africa: '#E8D4A8', // Savanna
  },
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
  // Headings - Lighter weight
  h1: {
    fontSize: 32,
    fontWeight: '600' as const,  // Lighter than before (was 700)
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,  // Lighter
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '500' as const,  // Lighter
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '500' as const,
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
  // Much lighter shadows
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
