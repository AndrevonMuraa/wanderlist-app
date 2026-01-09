import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../styles/theme';
import { darkTheme } from '../styles/darkTheme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  currentTheme: typeof theme;
  toggleTheme: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const THEME_KEY = 'app_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      let savedTheme: string | null;
      
      if (Platform.OS === 'web') {
        savedTheme = localStorage.getItem(THEME_KEY);
      } else {
        savedTheme = await AsyncStorage.getItem(THEME_KEY);
      }

      if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeModeState(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemePreference = async (mode: ThemeMode) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(THEME_KEY, mode);
      } else {
        await AsyncStorage.setItem(THEME_KEY, mode);
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await saveThemePreference(mode);
  };

  const toggleTheme = async () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    await setThemeMode(newMode);
  };

  const currentTheme = themeMode === 'dark' 
    ? { ...theme, colors: darkTheme.colors }
    : theme;

  const value = {
    isDark: themeMode === 'dark',
    themeMode,
    currentTheme,
    toggleTheme,
    setThemeMode,
  };

  if (isLoading) {
    return null; // or a loading screen
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
