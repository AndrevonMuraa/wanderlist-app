import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

interface NotificationSettings {
  dailyReminders: boolean;
  weeklyDigest: boolean;
  achievements: boolean;
  reminderTime: string; // HH:MM format
}

const defaultSettings: NotificationSettings = {
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
  } as any),
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
    
    // Save updated settings
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
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

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
