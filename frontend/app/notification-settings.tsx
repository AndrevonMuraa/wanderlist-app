import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Switch, ActivityIndicator } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';

interface NotificationSettings {
  likes_enabled: boolean;
  comments_enabled: boolean;
  friend_requests_enabled: boolean;
  achievements_enabled: boolean;
  streak_reminders_enabled: boolean;
  weekly_summary_enabled: boolean;
}

const defaultSettings: NotificationSettings = {
  likes_enabled: true,
  comments_enabled: true,
  friend_requests_enabled: true,
  achievements_enabled: true,
  streak_reminders_enabled: true,
  weekly_summary_enabled: true,
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const getToken = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem('auth_token');
    } else {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync('auth_token');
    }
  };

  const fetchSettings = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/push-settings`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...defaultSettings, ...data });
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);

    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/push-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      // Revert on error
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const settingsConfig = [
    {
      category: 'Social',
      icon: 'heart',
      color: '#FF6B6B',
      items: [
        {
          key: 'likes_enabled' as const,
          title: 'Likes',
          description: 'When someone likes your posts',
          icon: 'heart',
        },
        {
          key: 'comments_enabled' as const,
          title: 'Comments',
          description: 'When someone comments on your posts',
          icon: 'chatbubble',
        },
        {
          key: 'friend_requests_enabled' as const,
          title: 'Friend Requests',
          description: 'When someone sends you a friend request',
          icon: 'person-add',
        },
      ],
    },
    {
      category: 'Progress',
      icon: 'trophy',
      color: '#FFD700',
      items: [
        {
          key: 'achievements_enabled' as const,
          title: 'Achievements',
          description: 'When you unlock new badges',
          icon: 'ribbon',
        },
        {
          key: 'streak_reminders_enabled' as const,
          title: 'Streak Reminders',
          description: 'Daily reminders to maintain your streak',
          icon: 'flame',
        },
      ],
    },
    {
      category: 'Updates',
      icon: 'mail',
      color: theme.colors.primary,
      items: [
        {
          key: 'weekly_summary_enabled' as const,
          title: 'Weekly Summary',
          description: 'Weekly travel stats and highlights',
          icon: 'calendar',
        },
      ],
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {saving && (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.savingIndicator} />
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info Banner */}
        {Platform.OS === 'web' && (
          <Surface style={styles.infoBanner}>
            <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.infoBannerText}>
              Push notifications are only available on mobile devices. Download the app to receive notifications.
            </Text>
          </Surface>
        )}

        {/* Settings Sections */}
        {settingsConfig.map((section) => (
          <View key={section.category} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: section.color + '20' }]}>
                <Ionicons name={section.icon as any} size={20} color={section.color} />
              </View>
              <Text style={styles.sectionTitle}>{section.category}</Text>
            </View>

            <Surface style={styles.settingsCard}>
              {section.items.map((item, index) => (
                <View
                  key={item.key}
                  style={[
                    styles.settingItem,
                    index < section.items.length - 1 && styles.settingItemBorder,
                  ]}
                >
                  <View style={styles.settingInfo}>
                    <View style={styles.settingTitleRow}>
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={theme.colors.textSecondary}
                        style={styles.settingItemIcon}
                      />
                      <Text style={styles.settingTitle}>{item.title}</Text>
                    </View>
                    <Text style={styles.settingDescription}>{item.description}</Text>
                  </View>
                  <Switch
                    value={settings[item.key]}
                    onValueChange={(value) => updateSetting(item.key, value)}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary + '60',
                    }}
                    thumbColor={settings[item.key] ? theme.colors.primary : '#f4f3f4'}
                    ios_backgroundColor={theme.colors.border}
                  />
                </View>
              ))}
            </Surface>
          </View>
        ))}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              const allEnabled = Object.fromEntries(
                Object.keys(settings).map((key) => [key, true])
              ) as NotificationSettings;
              setSettings(allEnabled);
              // Save all enabled
              getToken().then((token) => {
                fetch(`${BACKEND_URL}/api/push-settings`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify(allEnabled),
                });
              });
            }}
          >
            <Ionicons name="notifications" size={20} color={theme.colors.primary} />
            <Text style={styles.quickActionText}>Enable All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              const allDisabled = Object.fromEntries(
                Object.keys(settings).map((key) => [key, false])
              ) as NotificationSettings;
              setSettings(allDisabled);
              // Save all disabled
              getToken().then((token) => {
                fetch(`${BACKEND_URL}/api/push-settings`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify(allDisabled),
                });
              });
            }}
          >
            <Ionicons name="notifications-off" size={20} color={theme.colors.error} />
            <Text style={[styles.quickActionText, { color: theme.colors.error }]}>
              Disable All
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  savingIndicator: {
    marginLeft: theme.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary + '10',
    marginBottom: theme.spacing.lg,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  settingsCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemIcon: {
    marginRight: theme.spacing.sm,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  settingDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginLeft: 26,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  quickActionText: {
    marginLeft: theme.spacing.sm,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
});
