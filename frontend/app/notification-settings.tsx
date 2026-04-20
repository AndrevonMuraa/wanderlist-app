import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { Text, Switch, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../utils/navigation';
import theme from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import UniversalHeader from '../components/UniversalHeader';
import { requestNotificationPermissions } from '../utils/notifications';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';

type PushKey =
  | 'messages_enabled'
  | 'likes_enabled'
  | 'comments_enabled'
  | 'friend_requests_enabled'
  | 'achievements_enabled'
  | 'weekly_summary_enabled';

type PushSettings = Record<PushKey, boolean>;

const DEFAULT_SETTINGS: PushSettings = {
  messages_enabled: true,
  likes_enabled: true,
  comments_enabled: true,
  friend_requests_enabled: true,
  achievements_enabled: true,
  weekly_summary_enabled: true,
};

interface ToggleRow {
  key: PushKey;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  testId: string;
}

const ROWS: ToggleRow[] = [
  {
    key: 'messages_enabled',
    title: 'Messages',
    subtitle: 'When a friend sends you a chat message',
    icon: 'chatbubbles',
    accent: '#4DB8D8',
    testId: 'toggle-messages',
  },
  {
    key: 'likes_enabled',
    title: 'Likes',
    subtitle: 'When someone likes your visit',
    icon: 'heart',
    accent: '#D4747E',
    testId: 'toggle-likes',
  },
  {
    key: 'comments_enabled',
    title: 'Comments',
    subtitle: 'When someone comments on your post',
    icon: 'chatbox-ellipses',
    accent: '#C9A961',
    testId: 'toggle-comments',
  },
  {
    key: 'friend_requests_enabled',
    title: 'Friend requests',
    subtitle: 'When another traveler wants to connect',
    icon: 'person-add',
    accent: '#7DCBE3',
    testId: 'toggle-friend-requests',
  },
  {
    key: 'achievements_enabled',
    title: 'Achievements',
    subtitle: 'Rank ups, badges, and milestones',
    icon: 'trophy',
    accent: '#FFD700',
    testId: 'toggle-achievements',
  },
  {
    key: 'weekly_summary_enabled',
    title: 'Weekly digest',
    subtitle: 'A summary of your week, every Sunday',
    icon: 'newspaper',
    accent: '#B8956A',
    testId: 'toggle-weekly',
  },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [settings, setSettings] = useState<PushSettings>(DEFAULT_SETTINGS);
  const [savingKey, setSavingKey] = useState<PushKey | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const granted = await requestNotificationPermissions();
        setPermissionGranted(granted);
      }

      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const resp = await fetch(`${BACKEND_URL}/api/push-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setSettings({
          messages_enabled: data.messages_enabled ?? true,
          likes_enabled: data.likes_enabled ?? true,
          comments_enabled: data.comments_enabled ?? true,
          friend_requests_enabled: data.friend_requests_enabled ?? true,
          achievements_enabled: data.achievements_enabled ?? true,
          weekly_summary_enabled: data.weekly_summary_enabled ?? true,
        });
      }
    } catch {
      // keep defaults on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggle = useCallback(
    async (key: PushKey) => {
      if (savingKey) return;
      const previous = settings[key];
      const nextValue = !previous;

      // Optimistic update
      setSettings((s) => ({ ...s, [key]: nextValue }));
      setSavingKey(key);

      try {
        const token = await getToken();
        if (!token) throw new Error('no token');
        const resp = await fetch(`${BACKEND_URL}/api/push-settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ [key]: nextValue }),
        });
        if (!resp.ok) throw new Error(`status ${resp.status}`);
      } catch {
        // Rollback on failure
        setSettings((s) => ({ ...s, [key]: previous }));
        Alert.alert(
          'Couldn’t save',
          'We couldn’t update your notification preference. Please try again.'
        );
      } finally {
        setSavingKey(null);
      }
    },
    [settings, savingKey]
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <UniversalHeader title="Notifications" onBack={() => safeGoBack(router)} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <UniversalHeader title="Notifications" onBack={() => safeGoBack(router)} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Permission warning */}
        {Platform.OS !== 'web' && !permissionGranted && (
          <TouchableOpacity
            style={styles.permissionWarning}
            onPress={async () => {
              const granted = await requestNotificationPermissions();
              setPermissionGranted(granted);
            }}
            activeOpacity={0.85}
            data-testid="notif-permission-warning"
          >
            <Ionicons name="warning" size={22} color="#b45309" />
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionTitle}>Notifications Disabled</Text>
              <Text style={styles.permissionMessage}>
                Tap to grant permission. Your preferences below still save for later.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#b45309" />
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
          What should ping you?
        </Text>

        {ROWS.map((row) => (
          <View
            key={row.key}
            style={[styles.row, { backgroundColor: colors.surface }]}
            data-testid={`${row.testId}-row`}
          >
            <View style={[styles.iconContainer, { backgroundColor: row.accent + '1F' }]}>
              <Ionicons name={row.icon} size={20} color={row.accent} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{row.title}</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                {row.subtitle}
              </Text>
            </View>
            <Switch
              value={settings[row.key]}
              onValueChange={() => handleToggle(row.key)}
              disabled={savingKey === row.key}
              color={theme.colors.primary}
              data-testid={row.testId}
            />
          </View>
        ))}

        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          These preferences apply across all your devices. You can change them any time.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.2)',
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  permissionMessage: {
    fontSize: 12.5,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 17,
  },
  footer: {
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
