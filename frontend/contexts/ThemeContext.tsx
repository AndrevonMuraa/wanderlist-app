import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  countryAccents: typeof countryAccents;
}

interface ThemeContextType {
  isDark: boolean;
  themeMode: string;
  colors: ThemeColors;
  shadows: typeof shadows;
  gradientColors: readonly [string, string];
  setThemeMode: (mode: string) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always use light mode
  const isDark = false;

  const colors: ThemeColors = {
    ...lightColors,
    countryAccents,
  };

  const themeShadows = shadows;
  const gradientColors = gradients.oceanToSand;

  // No-op functions for backwards compatibility
  const setThemeMode = async (_mode: string) => {};
  const toggleTheme = async () => {};

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        themeMode: 'light',
        colors,
        shadows: themeShadows,
        gradientColors,
        setThemeMode,
        toggleTheme,
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

export function useIsDark() {
  return false;
}
