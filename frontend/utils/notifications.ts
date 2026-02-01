import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const STREAK_REMINDER_ID = 'streak_reminder';

interface NotificationSettings {
  streakReminders: boolean;
  dailyReminders: boolean;
  weeklyDigest: boolean;
  achievements: boolean;
  reminderTime: string; // HH:MM format
}

const defaultSettings: NotificationSettings = {
  streakReminders: true,
  dailyReminders: false,
  weeklyDigest: true,
  achievements: true,
  reminderTime: '19:00',
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading notification settings:', error);
  }
  return defaultSettings;
}

export async function saveNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
  try {
    const current = await getNotificationSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
    
    // Update scheduled notifications based on new settings
    if (settings.streakReminders !== undefined || settings.reminderTime !== undefined) {
      await scheduleStreakReminder(updated.streakReminders, updated.reminderTime);
    }
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
}

export async function scheduleStreakReminder(enabled: boolean, time: string): Promise<void> {
  // Cancel existing reminder
  await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID).catch(() => {});
  
  if (!enabled || Platform.OS === 'web') return;
  
  const [hours, minutes] = time.split(':').map(Number);
  
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_REMINDER_ID,
    content: {
      title: '🔥 Keep Your Streak Alive!',
      body: "Don't forget to visit a landmark today to maintain your streak!",
      sound: true,
    },
    trigger: {
      hour: hours,
      minute: minutes,
      repeats: true,
    },
  });
}

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  if (Platform.OS === 'web') return;
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data,
    },
    trigger: null, // Immediate
  });
}

export async function sendAchievementNotification(badgeName: string, badgeIcon: string): Promise<void> {
  const settings = await getNotificationSettings();
  if (!settings.achievements) return;
  
  await sendLocalNotification(
    '🏆 Achievement Unlocked!',
    `You earned the "${badgeName}" badge! ${badgeIcon}`,
    { type: 'achievement', badge: badgeName }
  );
}

export async function sendStreakMilestoneNotification(days: number): Promise<void> {
  const settings = await getNotificationSettings();
  if (!settings.streakReminders) return;
  
  let message = '';
  if (days === 7) message = "Amazing! You've visited landmarks 7 days in a row!";
  else if (days === 30) message = "Incredible! A whole month of daily discoveries!";
  else if (days === 100) message = "Legendary! 100 days of exploration!";
  else message = `${days} day streak! Keep exploring!`;
  
  await sendLocalNotification('🔥 Streak Milestone!', message, { type: 'streak', days });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
