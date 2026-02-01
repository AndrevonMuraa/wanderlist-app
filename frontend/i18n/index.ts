import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';
import no from './locales/no.json';
import de from './locales/de.json';
import fr from './locales/fr.json';

const LANGUAGE_KEY = 'user_language';

// Get saved language or device language
const getInitialLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      return savedLanguage;
    }
    // Get device language (e.g., 'en-US', 'es-ES')
    const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
    // Map language variants
    const supportedLanguages = ['en', 'es', 'no', 'nb', 'nn', 'de', 'fr'];
    if (deviceLanguage === 'nb' || deviceLanguage === 'nn') {
      return 'no'; // Map Norwegian variants to 'no'
    }
    if (supportedLanguages.includes(deviceLanguage)) {
      return deviceLanguage;
    }
    return 'en';
  } catch {
    return 'en';
  }
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      no: { translation: no },
      de: { translation: de },
      fr: { translation: fr },
    },
    lng: 'en', // Default, will be overridden
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Set initial language asynchronously
getInitialLanguage().then((lang) => {
  i18n.changeLanguage(lang);
});

// Helper to save language preference
export const setLanguage = async (language: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Available languages
export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export default i18n;
