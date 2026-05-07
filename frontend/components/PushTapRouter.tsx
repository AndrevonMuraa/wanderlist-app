/**
 * Listens for taps on push notifications + sets up notification action
 * categories for inline swipe actions on iOS (Hide / Warn / Dismiss).
 *
 * Currently handles deep-link `data.type`:
 *   - year_recap_ready          → /year-in-travel?year=Y
 *   - photo_health_alert        → /admin/photo-health
 *   - store_readiness_alert     → /admin/store-readiness  (heavy haptic)
 *   - report_received           → admin can act inline via category actions
 *   - moderator_message         → /notifications
 *
 * Inline category actions (`actionIdentifier !== 'default'`) call the
 * matching admin endpoint directly without opening the screen.
 *
 * Web is intentionally a no-op: expo-notifications has no push surface.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';
import { showToast } from './ToastHost';

// Notification categories — each `identifier` matches `categoryIdentifier`
// set in the push payload data on the backend.
const CATEGORIES: Notifications.NotificationCategory[] = [
  {
    identifier: 'report_received',
    actions: [
      { identifier: 'hide',    buttonTitle: 'Hide',    options: { isDestructive: true } },
      { identifier: 'warn',    buttonTitle: 'Warn',    options: {} },
      { identifier: 'dismiss', buttonTitle: 'Dismiss', options: {} },
    ],
  } as any,
  {
    identifier: 'store_readiness_alert',
    actions: [
      { identifier: 'open', buttonTitle: 'Open dashboard', options: { opensAppToForeground: true } },
    ],
  } as any,
];

const fireHaptic = (kind: 'soft' | 'warning' | 'error') => {
  try {
    if (kind === 'soft') Haptics.selectionAsync();
    else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch { /* haptics unsupported, ignore */ }
};

const callAdmin = async (path: string, method: 'POST' = 'POST', body?: object): Promise<boolean> => {
  try {
    const token = await getToken();
    if (!token) return false;
    const r = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.ok;
  } catch {
    return false;
  }
};

export default function PushTapRouter() {
  const router = useRouter();

  // Register categories once on mount (iOS only — Android uses channels).
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    Notifications.setNotificationCategoryAsync(CATEGORIES[0].identifier, CATEGORIES[0].actions).catch(() => {});
    Notifications.setNotificationCategoryAsync(CATEGORIES[1].identifier, CATEGORIES[1].actions).catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleResponse = async (response: Notifications.NotificationResponse) => {
      const data = response?.notification?.request?.content?.data as Record<string, any> | undefined;
      if (!data) return;
      const type = data.type;
      const action = response.actionIdentifier; // 'default' for body tap

      // ---- Inline category actions (Hide / Warn / Dismiss) -----------
      if (type === 'report_received' && action !== 'default' && action !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        const ct = data.content_type;
        const cid = data.content_id;
        const uid = data.target_user_id;
        if (action === 'hide' && ct && cid) {
          const ok = await callAdmin(`/api/admin/content/${ct}/${cid}/hide`, 'POST', { reason: 'Hidden via push action' });
          showToast({ message: ok ? 'Content hidden' : 'Failed to hide', severity: ok ? 'success' : 'error', actionLabel: ok ? 'Open' : undefined, onAction: ok ? () => router.push('/admin/reports' as any) : undefined });
          return;
        }
        if (action === 'warn' && uid) {
          const ok = await callAdmin(`/api/admin/users/${uid}/warn`, 'POST', { reason: 'Warned via push action' });
          showToast({ message: ok ? 'Warning issued' : 'Failed to warn', severity: ok ? 'success' : 'error' });
          return;
        }
        if (action === 'dismiss') {
          showToast({ message: 'Report dismissed', severity: 'info' });
          return;
        }
      }

      // ---- Default tap → deep-link routing ----------------------------
      if (type === 'year_recap_ready') {
        fireHaptic('soft');
        const year = data.year ?? '';
        router.push(`/year-in-travel${year ? `?year=${year}` : ''}` as any);
      } else if (type === 'photo_health_alert') {
        fireHaptic('warning');
        router.push('/admin/photo-health' as any);
      } else if (type === 'store_readiness_alert') {
        // Heavy buzz so the operator can recognise this *without looking*
        fireHaptic('error');
        setTimeout(() => fireHaptic('error'), 220);
        router.push('/admin/store-readiness' as any);
      } else if (type === 'report_received') {
        router.push('/admin/reports' as any);
      } else if (type === 'moderator_message') {
        router.push('/notifications' as any);
      }
    };

    // Cold-start: app launched by tapping a notification
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => { if (resp) void handleResponse(resp); })
      .catch(() => {});

    // Warm: tapped while app is open
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => { sub.remove(); };
  }, [router]);

  return null;
}
