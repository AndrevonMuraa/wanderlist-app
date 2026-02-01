// Dark theme variant for WanderMark - Luxury Travel Magazine at Night
// Maintains Maldivean ocean blues + warm gold accents

export const darkColors = {
  // Primary Colors - SAME Maldivean turquoise (brand consistency)
  primary: '#4DB8D8',        // Maldivean turquoise - MATCHES light theme
  primaryDark: '#2E9AB5',    // Deep ocean blue
  primaryLight: '#7DCBE3',   // Light tropical water
  
  // Secondary - Warm dark tones
  secondary: '#3D3530',      // Warm dark brown
  secondaryLight: '#4A3F38',
  
  // Luxury Accents - SAME rich gold (brand consistency)
  accent: '#C9A961',         // Rich gold - MATCHES light theme
  accentYellow: '#E8C77D',   // Soft gold
  accentBronze: '#B8956A',   // Bronze
  accentCopper: '#D4A574',   // Copper warmth
  accentDark: '#A88850',     // Deeper gold
  
  // Backgrounds - Warm dark chocolate/brown (NOT cold blue-gray)
  background: '#1F1E1C',        // Warm dark chocolate
  backgroundSecondary: '#2A2725', // Slightly lighter warm
  surface: '#2A2725',           // Warm dark brown cards
  surfaceElevated: '#323030',   // Elevated cards
  surfaceTinted: '#252320',     // Subtle warm tint
  
  // Text - Warm light tones (inverted from light theme)
  text: '#F5F3F0',              // Warm cream - INVERTED from light bg
  textSecondary: '#B8B3AD',     // Warm medium gray
  textLight: '#8A8580',         // Warm light gray
  textInverse: '#1F1E1C',       // Dark on light
  
  // Status Colors - Warmer for dark
  success: '#5DC99D',
  warning: '#C9A961',        // Use accent gold
  error: '#E8857E',
  info: '#4DB8D8',           // Use primary
  
  // Tier Colors - Same as light for consistency
  free: '#9B9B9B',
  basic: '#4DB8D8',          // Ocean blue
  premium: '#C9A961',        // Rich gold
  
  // Overlays - Adjusted for dark
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayStrong: 'rgba(0, 0, 0, 0.8)',
  
  // Borders - Warm subtle
  border: '#3D3530',
  borderLight: '#323030',
  
  // Country accents - Same as light theme for brand consistency
  countryAccents: {
    norway: '#4A90A4',
    france: '#9B7EBE',
    italy: '#C8956A',
    japan: '#E8879E',
    egypt: '#D4A574',
    peru: '#8B6F47',
    australia: '#E89B5C',
    usa: '#5B8FA3',
    uk: '#7A8E7E',
    china: '#D4534D',
    spain: '#E8A05C',
    greece: '#4DB8D8',
    thailand: '#8FBC8F',
    india: '#D4956A',
    brazil: '#5FB85F',
    mexico: '#E8A872',
    uae: '#C9A961',
    germany: '#6B8E99',
    canada: '#D46B6B',
    south_africa: '#C8854D',
  },
};

// Export combined theme object
export const darkTheme = {
  colors: darkColors,
  // Spacing, typography, etc. remain the same as light theme
};
