import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';

const DISMISSED_KEY = '@wandermark/msg_notif_prompt_dismissed_v1';
const ENABLED_KEY = '@wandermark/msg_notif_prompt_enabled_v1';

/**
 * One-time onboarding card shown at the top of the Friends Hub that invites
 * users to turn on push notifications for new messages.
 *
 * Visibility rules:
 *  - hidden on web (expo-notifications is no-op there)
 *  - hidden if user has already enabled OR dismissed
 *  - hidden if OS permission is already granted (we persist ENABLED on the fly)
 */
export const NewMessageNotifPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      const [dismissed, enabled] = await Promise.all([
        AsyncStorage.getItem(DISMISSED_KEY),
        AsyncStorage.getItem(ENABLED_KEY),
      ]);
      if (dismissed || enabled) return;

      // If OS permission is already granted, silently persist so we never nag.
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          await AsyncStorage.setItem(ENABLED_KEY, '1');
          return;
        }
      } catch {
        // If permissions API unavailable, don't show anything.
        return;
      }
      setVisible(true);
    })();
  }, []);

  const handleEnable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notifications off',
          'You can enable them later in Settings → Notifications.'
        );
        await AsyncStorage.setItem(DISMISSED_KEY, '1');
        setVisible(false);
        return;
      }

      // Fetch Expo push token & sync to backend (best-effort).
      if (Device.isDevice) {
        try {
          const tokenResp = await Notifications.getExpoPushTokenAsync();
          const pushToken = tokenResp.data;
          const jwt = await getToken();
          if (pushToken && jwt) {
            await fetch(`${BACKEND_URL}/api/push-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
              },
              body: JSON.stringify({ push_token: pushToken }),
            });
          }
        } catch {
          // Push token registration failure is non-fatal — permissions are still granted.
        }
      }

      await AsyncStorage.setItem(ENABLED_KEY, '1');
      setVisible(false);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const handleDismiss = useCallback(async () => {
    await AsyncStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.card} testID="new-message-notif-prompt">
      <LinearGradient
        colors={['rgba(77, 184, 216, 0.10)', 'rgba(232, 220, 200, 0.20)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="notifications" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>Never miss a message</Text>
          <Text style={styles.subtitle}>
            Get a gentle ping when a travel friend replies — only for messages, nothing else.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleEnable}
              disabled={busy}
              activeOpacity={0.85}
              style={styles.enableBtn}
              testID="notif-prompt-enable-btn"
            >
              <Text style={styles.enableText}>{busy ? 'Enabling…' : 'Turn on'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDismiss}
              activeOpacity={0.7}
              style={styles.laterBtn}
              testID="notif-prompt-later-btn"
            >
              <Text style={styles.laterText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
    backgroundColor: theme.colors.surface,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(77, 184, 216, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  enableBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  enableText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textInverse,
    letterSpacing: 0.2,
  },
  laterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  laterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});

export default NewMessageNotifPrompt;
