import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, shadows, darkShadows, gradients, countryAccents } from '../styles/theme';

type ThemeMode = 'light' | 'dark' | 'system';

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
  themeMode: ThemeMode;
  colors: ThemeColors;
  shadows: typeof shadows;
  gradientColors: readonly [string, string];
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = 'theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Calculate if dark mode should be active
  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  // Get colors based on current theme
  const colors: ThemeColors = {
    ...(isDark ? darkColors : lightColors),
    countryAccents,
  };

  // Get shadows based on current theme
  const themeShadows = isDark ? darkShadows : shadows;

  // Get gradient colors
  const gradientColors = isDark ? gradients.oceanToSandDark : gradients.oceanToSand;

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = isDark ? 'light' : 'dark';
    await setThemeMode(newMode);
  };

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        themeMode,
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

// Helper hook for getting just the colors
export function useColors() {
  const { colors } = useTheme();
  return colors;
}

// Helper hook for checking dark mode
export function useIsDark() {
  const { isDark } = useTheme();
  return isDark;
}
