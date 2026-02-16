import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_URL } from '../utils/config';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const { user } = useAuth();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          setExpoPushToken(token);
          // Save token to backend if user is logged in
          if (user) {
            savePushTokenToBackend(token);
          }
        }
      })
      .catch((err) => {
        setError(err.message);
      });

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      handleNotificationResponse(data);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);

  // Save token to backend when user logs in
  useEffect(() => {
    if (user && expoPushToken) {
      savePushTokenToBackend(expoPushToken);
    }
  }, [user, expoPushToken]);

  const savePushTokenToBackend = async (token: string) => {
    try {
      let authToken: string | null = null;
      if (Platform.OS === 'web') {
        authToken = localStorage.getItem('auth_token');
      } else {
        const SecureStore = require('expo-secure-store');
        authToken = await SecureStore.getItemAsync('auth_token');
      }

      if (!authToken) return;

      await fetch(`${BACKEND_URL}/api/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ push_token: token }),
      });
    } catch (err) {
      console.error('Error saving push token:', err);
    }
  };

  const handleNotificationResponse = (data: any) => {
    // Navigate based on notification type
    // This will be handled by the app's navigation
    console.log('Notification tapped with data:', data);
  };

  return {
    expoPushToken,
    notification,
    error,
  };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Push notifications don't work on web
  if (Platform.OS === 'web') {
    console.log('Push notifications are not supported on web');
    return null;
  }

  // Check if running on a physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission for push notifications not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    
    if (!projectId) {
      // For development, use a placeholder
      console.log('No project ID found, using development mode');
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    token = tokenData.data;
    console.log('Expo push token:', token);
  } catch (err) {
    console.error('Error getting push token:', err);
  }

  // Configure notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4DB8D8',
    });

    await Notifications.setNotificationChannelAsync('social', {
      name: 'Social',
      description: 'Likes, comments, and friend activity',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4DB8D8',
    });

    await Notifications.setNotificationChannelAsync('achievements', {
      name: 'Achievements',
      description: 'Badges and milestones',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500],
      lightColor: '#FFD700',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      description: 'Streak reminders and tips',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return token;
}

// Helper function to schedule a local notification
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  trigger?: Notifications.NotificationTriggerInput
) {
  if (Platform.OS === 'web') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger || null, // null = immediate
  });
}

// Helper to cancel all scheduled notifications
export async function cancelAllNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get badge count
export async function getBadgeCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  return await Notifications.getBadgeCountAsync();
}

// Set badge count
export async function setBadgeCount(count: number) {
  if (Platform.OS === 'web') return;
  await Notifications.setBadgeCountAsync(count);
}
