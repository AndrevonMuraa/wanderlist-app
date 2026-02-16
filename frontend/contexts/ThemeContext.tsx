import React, { createContext, useContext, ReactNode } from 'react';
import { lightColors, shadows, gradients, countryAccents } from '../styles/theme';

interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  accentYellow: string;
  accentBronze: string;
  accentCopper: string;
  accentTeal: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceTinted: string;
  text: string;
  textSecondary: string;
  textLight: string;
  textInverse: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  free: string;
  basic: string;
  premium: string;
  overlay: string;
  overlayLight: string;
  overlayStrong: string;
  border: string;
  borderLight: string;
  backgroundSecondary: string;
  accentLight: string;
  accentDark: string;
  ocean: string;
  surfaceVariant: string;
  countryAccents: typeof countryAccents;
}

interface ThemeContextType {
  colors: ThemeColors;
  shadows: typeof shadows;
  gradientColors: readonly [string, string];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colors: ThemeColors = {
    ...lightColors,
    countryAccents,
  };

  const themeShadows = shadows;
  const gradientColors = gradients.oceanToSand;

  return (
    <ThemeContext.Provider
      value={{
        colors,
        shadows: themeShadows,
        gradientColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useColors() {
  const { colors } = useTheme();
  return colors;
}
