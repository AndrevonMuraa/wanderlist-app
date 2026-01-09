// Dark theme variant for WanderList

export const darkColors = {
  // Primary Colors - Maintain turquoise identity
  primary: '#20B2AA',
  primaryDark: '#1A8E87',
  primaryLight: '#4DD4CB',
  
  // Secondary
  secondary: '#2D3748',
  secondaryLight: '#4A5568',
  
  // Accents
  accent: '#F6AD55',
  accentYellow: '#FFD93D',
  accentBronze: '#D4A574',
  accentCopper: '#E8956A',
  accentDark: '#DD6B20',
  
  // Backgrounds - Dark
  background: '#1A202C',        // Deep dark blue-gray
  backgroundSecondary: '#2D3748', // Slightly lighter
  surface: '#2D3748',           // Card background
  surfaceElevated: '#374151',   // Elevated cards
  surfaceTinted: '#252F3F',     // Tinted variant
  
  // Text - Light on dark
  text: '#F7FAFC',              // Almost white
  textSecondary: '#A0AEC0',     // Medium gray
  textLight: '#718096',         // Light gray
  textInverse: '#1A202C',       // Dark on light
  
  // Status Colors - Adjusted for dark
  success: '#48BB78',
  warning: '#F6AD55',
  error: '#FC8181',
  info: '#4299E1',
  
  // Tier Colors
  free: '#A0AEC0',
  basic: '#4299E1',
  premium: '#F6AD55',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  overlayStrong: 'rgba(0, 0, 0, 0.85)',
  
  // Borders
  border: '#4A5568',
  borderLight: '#374151',
  
  // Country accents - Slightly muted for dark theme
  countryAccents: {
    norway: '#5AA4B4',
    france: '#AB8ECE',
    italy: '#D8A57A',
    japan: '#F897AE',
    egypt: '#E4B584',
    peru: '#9B7F57',
    australia: '#F8AB6C',
    usa: '#6B9FB3',
    uk: '#8A9E8E',
    china: '#E4635D',
    spain: '#F8B06C',
    greece: '#5DC8D8',
    thailand: '#9FCC9F',
    india: '#E4A57A',
    brazil: '#6FC86F',
    mexico: '#F8B882',
    uae: '#D9B971',
    germany: '#7B9EA9',
    canada: '#E47B7B',
    south_africa: '#D8955D',
  },
};

// Export combined theme object
export const darkTheme = {
  colors: darkColors,
  // Spacing, typography, etc. remain the same
};
