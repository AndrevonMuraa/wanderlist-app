import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { languages, setLanguage } from '../i18n';
import theme from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function LanguageSettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const currentLanguage = i18n.language;

  const handleLanguageSelect = async (languageCode: string) => {
    await setLanguage(languageCode);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.selectLanguage')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Language Options */}
      <View style={styles.content}>
        <Surface style={[styles.languageCard, { backgroundColor: colors.surface }]}>
          {languages.map((language, index) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageItem,
                index < languages.length - 1 && [styles.languageItemBorder, { borderBottomColor: colors.border }],
              ]}
              onPress={() => handleLanguageSelect(language.code)}
            >
              <Text style={styles.languageFlag}>{language.flag}</Text>
              <Text style={[styles.languageName, { color: colors.text }]}>{language.name}</Text>
              {currentLanguage === language.code && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </Surface>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {currentLanguage === 'es' 
            ? 'La app usará automáticamente el idioma de tu teléfono al iniciar.'
            : 'The app will automatically use your phone\'s language on startup.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  content: {
    padding: theme.spacing.md,
  },
  languageCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  languageItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  languageFlag: {
    fontSize: 28,
    marginRight: theme.spacing.md,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  hint: {
    marginTop: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
});
