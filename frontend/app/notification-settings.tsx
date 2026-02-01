import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { Text, Switch, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import UniversalHeader from '../components/UniversalHeader';
import {
  requestNotificationPermissions,
  getNotificationSettings,
  saveNotificationSettings,
  scheduleStreakReminder,
} from '../utils/notifications';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [settings, setSettings] = useState({
    streakReminders: true,
    dailyReminders: false,
    weeklyDigest: true,
    achievements: true,
    reminderTime: '19:00',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await getNotificationSettings();
      setSettings(currentSettings);
      
      if (Platform.OS !== 'web') {
        const granted = await requestNotificationPermissions();
        setPermissionGranted(granted);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof typeof settings) => {
    const newValue = !settings[key];
    const newSettings = { ...settings, [key]: newValue };
    setSettings(newSettings);
    await saveNotificationSettings({ [key]: newValue });
  };

  const handleTimeChange = () => {
    Alert.alert(
      'Reminder Time',
      'Select when you want to receive your daily streak reminder',
      [
        { text: 'Morning (9:00)', onPress: () => updateTime('09:00') },
        { text: 'Afternoon (14:00)', onPress: () => updateTime('14:00') },
        { text: 'Evening (19:00)', onPress: () => updateTime('19:00') },
        { text: 'Night (21:00)', onPress: () => updateTime('21:00') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const updateTime = async (time: string) => {
    setSettings(prev => ({ ...prev, reminderTime: time }));
    await saveNotificationSettings({ reminderTime: time });
    await scheduleStreakReminder(settings.streakReminders, time);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <UniversalHeader title="Notifications" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <UniversalHeader title="Notifications" onBack={() => router.back()} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Permission Warning */}
        {Platform.OS !== 'web' && !permissionGranted && (
          <TouchableOpacity
            style={styles.permissionWarning}
            onPress={requestNotificationPermissions}
          >
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <View style={styles.permissionTextContainer}>
              <Text style={styles.permissionTitle}>Notifications Disabled</Text>
              <Text style={styles.permissionMessage}>
                Tap to enable notifications in settings
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
          </TouchableOpacity>
        )}

        {/* Streak Reminders */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#ff6b3520' }]}>
              <Ionicons name="flame" size={22} color="#ff6b35" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Streak Reminders
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Don't break your streak!
              </Text>
            </View>
            <Switch
              value={settings.streakReminders}
              onValueChange={() => handleToggle('streakReminders')}
              color={theme.colors.primary}
            />
          </View>
          
          {settings.streakReminders && (
            <TouchableOpacity style={styles.timeSelector} onPress={handleTimeChange}>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                Reminder Time
              </Text>
              <View style={styles.timeValue}>
                <Text style={[styles.timeText, { color: colors.text }]}>
                  {formatTime(settings.reminderTime)}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Achievements */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#fbbf2420' }]}>
              <Ionicons name="trophy" size={22} color="#fbbf24" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Achievement Alerts
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Badge unlocks & milestones
              </Text>
            </View>
            <Switch
              value={settings.achievements}
              onValueChange={() => handleToggle('achievements')}
              color={theme.colors.primary}
            />
          </View>
        </View>

        {/* Weekly Digest */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="calendar" size={22} color="#8b5cf6" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Weekly Digest
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Summary of your progress
              </Text>
            </View>
            <Switch
              value={settings.weeklyDigest}
              onValueChange={() => handleToggle('weeklyDigest')}
              color={theme.colors.primary}
            />
          </View>
        </View>

        {/* Daily Reminders */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#10b98120' }]}>
              <Ionicons name="notifications" size={22} color="#10b981" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Daily Reminders
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Explore new landmarks
              </Text>
            </View>
            <Switch
              value={settings.dailyReminders}
              onValueChange={() => handleToggle('dailyReminders')}
              color={theme.colors.primary}
            />
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          You can change these settings at any time. We'll only send notifications you've enabled.
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
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
  },
  permissionMessage: {
    fontSize: 13,
    color: '#b45309',
    marginTop: 2,
  },
  section: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
    marginLeft: 56,
  },
  timeLabel: {
    fontSize: 14,
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});
