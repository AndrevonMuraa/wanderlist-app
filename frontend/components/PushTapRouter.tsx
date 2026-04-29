/**
 * Listens for taps on push notifications while the app is running OR was
 * cold-started by tapping a notification. Routes deep-link payloads to the
 * correct screen.
 *
 * Currently handles:
 *   - { type: 'year_recap_ready', year: number }  →  /year-in-travel?year=Y
 *
 * Add more `case` branches here as new push types ship.
 *
 * Web is intentionally a no-op: expo-notifications has no push surface there.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export default function PushTapRouter() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const route = (data: Record<string, any> | undefined | null) => {
      if (!data) return;
      const type = data.type;
      if (type === 'year_recap_ready') {
        const year = data.year ?? '';
        router.push(`/year-in-travel${year ? `?year=${year}` : ''}`);
      }
    };

    // Cold-start: app launched by tapping a notification
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => {
        if (resp?.notification?.request?.content?.data) {
          route(resp.notification.request.content.data as Record<string, any>);
        }
      })
      .catch(() => {});

    // Warm: tapped while app is open
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data as
        | Record<string, any>
        | undefined;
      route(data);
    });

    return () => {
      sub.remove();
    };
  }, [router]);

  return null;
}
