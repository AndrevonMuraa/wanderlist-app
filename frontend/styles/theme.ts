// WanderList Design System - Ultra Light & Airy Aesthetic

export const colors = {
  // Primary Colors - Ultra Light
  primary: '#A8C5A8',        // Very light sage - soft, natural
  primaryDark: '#8BAF8B',    // Muted sage
  primaryLight: '#C8DBC8',   // Almost white sage
  
  // Secondary Colors - Soft Tones
  secondary: '#B5D4D3',      // Pale aqua - very light ocean
  secondaryLight: '#D4E8E7', // Almost white aqua
  
  // Accent Colors - Subtle Gold
  accent: '#E5D5B7',         // Pale gold - very subtle
  accentWarm: '#E8DCC8',     // Barely-there terracotta
  
  // Neutrals - Ultra Light
  background: '#FDFCFA',     // Almost white cream
  surface: '#FFFFFF',        // Pure white
  surfaceElevated: '#FFFFFF',
  surfaceTinted: '#F8F6F4',  // Barely tinted
  
  // Text - Softer
  text: '#5A5A5A',           // Soft charcoal (lighter)
  textSecondary: '#8A8A8A',  // Light gray
  textLight: '#B5B5B5',      // Very light gray
  textInverse: '#FFFFFF',    // White on dark
  
  // Status Colors (ultra muted)
  success: '#A8C5A8',
  warning: '#E8DCC8',
  error: '#D4B5B5',
  info: '#B5C5D4',
  
  // Tier Colors - Softer
  free: '#B5B5B5',           // Light gray
  basic: '#B5C5D4',          // Soft blue
  premium: '#E5D5B7',        // Pale gold
  
  // Overlays - Lighter
  overlay: 'rgba(0, 0, 0, 0.3)',
  overlayLight: 'rgba(0, 0, 0, 0.15)',
  
  // Borders - Ultra Subtle
  border: '#F0EDE8',
  borderLight: '#F8F6F3',
  
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
