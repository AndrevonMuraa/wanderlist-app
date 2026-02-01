import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

type ThemeOption = 'light' | 'dark' | 'system';

interface ThemeOptionConfig {
  key: ThemeOption;
  title: string;
  description: string;
  icon: string;
}

const themeOptions: ThemeOptionConfig[] = [
  {
    key: 'light',
    title: 'Light',
    description: 'Always use light theme',
    icon: 'sunny',
  },
  {
    key: 'dark',
    title: 'Dark',
    description: 'Always use dark theme',
    icon: 'moon',
  },
  {
    key: 'system',
    title: 'System',
    description: 'Follow device settings',
    icon: 'phone-portrait',
  },
];

export default function AppearanceSettingsScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode, isDark, colors } = useTheme();

  const handleThemeSelect = async (mode: ThemeOption) => {
    await setThemeMode(mode);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Appearance</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Preview Card */}
      <View style={styles.content}>
        <Surface style={[styles.previewCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.previewContent, { backgroundColor: colors.background }]}>
            <View style={styles.previewHeader}>
              <View style={[styles.previewIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="globe" size={20} color="#fff" />
              </View>
              <View style={styles.previewText}>
                <View style={[styles.previewLine, { backgroundColor: colors.text, width: 80 }]} />
                <View style={[styles.previewLine, { backgroundColor: colors.textSecondary, width: 120, marginTop: 6 }]} />
              </View>
            </View>
            <View style={styles.previewStats}>
              {[colors.primary, colors.accent, colors.accentTeal].map((color, i) => (
                <View key={i} style={[styles.previewStat, { backgroundColor: colors.surface }]}>
                  <View style={[styles.previewStatIcon, { backgroundColor: color }]} />
                  <View style={[styles.previewStatLine, { backgroundColor: colors.textLight }]} />
                </View>
              ))}
            </View>
          </View>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
            {isDark ? 'Dark Mode' : 'Light Mode'} Preview
          </Text>
        </Surface>

        {/* Theme Options */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>THEME</Text>
        <Surface style={[styles.optionsCard, { backgroundColor: colors.surface }]}>
          {themeOptions.map((option, index) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.optionItem,
                index < themeOptions.length - 1 && [styles.optionItemBorder, { borderBottomColor: colors.border }],
              ]}
              onPress={() => handleThemeSelect(option.key)}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.background }]}>
                <Ionicons 
                  name={option.icon as any} 
                  size={22} 
                  color={themeMode === option.key ? colors.primary : colors.textSecondary} 
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              {themeMode === option.key && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </Surface>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textLight} />
          <Text style={[styles.infoText, { color: colors.textLight }]}>
            When set to "System", the app will automatically switch between light and dark mode based on your device settings.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  previewCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  previewContent: {
    borderRadius: 12,
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    marginLeft: 12,
  },
  previewLine: {
    height: 10,
    borderRadius: 5,
  },
  previewStats: {
    flexDirection: 'row',
    gap: 8,
  },
  previewStat: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  previewStatIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 6,
  },
  previewStatLine: {
    width: 30,
    height: 6,
    borderRadius: 3,
  },
  previewLabel: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  optionsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  optionItemBorder: {
    borderBottomWidth: 1,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    lineHeight: 18,
  },
});
