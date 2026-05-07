/**
 * Widget bridge — keeps the iOS Widget Extension's App-Group UserDefaults
 * in sync with the latest moderation queue snapshot from the backend.
 *
 * Architecture:
 *   1. `setupWidgetBackgroundFetch()` registers a 15-min `BackgroundFetch` task
 *      via `expo-task-manager`. iOS will throttle if the app/widget aren't
 *      actively used, but 15min is the floor we ask for.
 *   2. `refreshWidgetSnapshot()` is called on every app foreground + after
 *      destructive admin actions, so the widget is also kept fresh while the
 *      device is awake.
 *   3. `react-native-shared-group-preferences` writes to the App Group's
 *      `UserDefaults` under the suite name in `APP_GROUP`. The Swift widget
 *      reads the same key on its `getTimeline(...)` callback.
 *   4. Widget reload is implicit: when iOS invokes the timeline provider,
 *      it picks up the new UserDefaults values. We don't need to call
 *      WidgetCenter.shared.reloadAllTimelines from JS — iOS handles it once
 *      the BackgroundTask completes.
 *
 * Web/Android: no-ops. Only iOS users see the widget.
 */
import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
// @ts-expect-error — no types ship with this lib
import SharedGroupPreferences from 'react-native-shared-group-preferences';

import { BACKEND_URL } from './config';
import { getToken } from './token';

export const APP_GROUP = 'group.com.wandermark.app.adminwidget';
export const WIDGET_KEY = 'wandermark.widget.summary';
const TASK_NAME = 'wandermark.widget.background-fetch';

type WidgetAction = { actor: string; action: string; created_at: string | null };
type WidgetPayload = {
  pending_reports: number;
  open_tickets: number;
  recent_actions: WidgetAction[];
  generated_at: string;
  // Locale-friendly relative timestamps the widget renders without doing date math
  fetched_at_epoch: number;
};

/** Hit the API and write the JSON to the App Group UserDefaults. iOS-only. */
export async function refreshWidgetSnapshot(): Promise<WidgetPayload | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const token = await getToken();
    if (!token) return null; // not logged in → leave whatever stale data is there
    const r = await fetch(`${BACKEND_URL}/api/admin/widget/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null; // 401/403 (not admin) → also no-op
    const json = (await r.json()) as Omit<WidgetPayload, 'fetched_at_epoch'>;
    const payload: WidgetPayload = { ...json, fetched_at_epoch: Math.floor(Date.now() / 1000) };
    await SharedGroupPreferences.setItem(WIDGET_KEY, JSON.stringify(payload), APP_GROUP);
    return payload;
  } catch {
    return null;
  }
}

// ---- BackgroundFetch ------------------------------------------------------

if (Platform.OS === 'ios') {
  TaskManager.defineTask(TASK_NAME, async () => {
    const result = await refreshWidgetSnapshot();
    return result
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  });
}

/** Register the 15-min background task. Idempotent. */
export async function setupWidgetBackgroundFetch(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: 15 * 60, // 15 minutes — iOS floor
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (e) {
    // Background tasks not available (simulator, restricted device) → fall back
    // to foreground-only refresh. Silently swallow.
    console.warn('[widget] background fetch register failed:', e);
  }
}

/** Tear down — call from the lockdown screen if you want to suspend the bg task. */
export async function teardownWidgetBackgroundFetch(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
  } catch {
    /* already unregistered */
  }
}
