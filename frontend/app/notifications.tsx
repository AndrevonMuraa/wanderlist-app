import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { formatTimeAgo } from '../utils/formatTime';
import { lightHaptic, successHaptic } from '../utils/haptics';

import { HeaderBranding } from '../components/BrandedGlobeIcon';
import { getToken } from '../utils/token';

interface Notification {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  related_id?: string;
  related_user_id?: string;
  related_user_name?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  const handleBack = () => {
    router.push('/(tabs)/profile');
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await lightHaptic();
    await loadNotifications();
    await successHaptic();
    setRefreshing(false);
  };

  const handleNotificationTap = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        const token = await getToken();
        await fetch(`${BACKEND_URL}/api/notifications/${notification.notification_id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });

        setNotifications(prev =>
          prev.map(n =>
            n.notification_id === notification.notification_id
              ? { ...n, is_read: true }
              : n
          )
        );
      } catch (error) {
      }
    }

    // Navigate based on type
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'reply':
        if (notification.related_id) {
          router.push(`/visit-detail/${notification.related_id}`);
        }
        break;
      case 'friend_request':
      case 'friend_accepted':
        router.push('/friends');
        break;
      case 'rank_up':
        router.push('/(tabs)/journey');
        break;
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return { name: 'heart', color: '#FF6B6B' };
      case 'comment':
        return { name: 'chatbubble', color: theme.colors.primary };
      case 'reply':
        return { name: 'chatbubbles', color: theme.colors.primary };
      case 'friend_request':
        return { name: 'person-add', color: theme.colors.success };
      case 'friend_accepted':
        return { name: 'people', color: theme.colors.success };
      case 'rank_up':
        return { name: 'trophy', color: '#FFD700' };
      default:
        return { name: 'notifications', color: theme.colors.textSecondary };
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gradients.oceanToSand}
          start={gradients.horizontal.start}
          end={gradients.horizontal.end}
          style={[styles.header, { paddingTop: topPadding }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleWithBack}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.brandingContainer}
              onPress={() => router.push('/about')}
              activeOpacity={0.7}
            >
              <HeaderBranding size={18} textColor="#2A2A2A" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleWithBack}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                style={styles.markAllButton}
                activeOpacity={0.7}
                data-testid="mark-all-read-btn"
              >
                <Ionicons name="checkmark-done" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.brandingContainer}
              onPress={() => router.push('/about')}
              activeOpacity={0.7}
            >
              <HeaderBranding size={18} textColor="#2A2A2A" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const icon = getNotificationIcon(notification.type);
            return (
              <TouchableOpacity
                key={notification.notification_id}
                activeOpacity={0.7}
                onPress={() => handleNotificationTap(notification)}
                data-testid={`notification-${notification.notification_id}`}
              >
                <Surface
                  style={[
                    styles.notificationCard,
                    !notification.is_read && styles.notificationCardUnread,
                  ]}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: `${icon.color}20` },
                    ]}
                  >
                    <Ionicons name={icon.name as any} size={24} color={icon.color} />
                  </View>

                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>
                      {formatTimeAgo(notification.created_at)}
                    </Text>
                  </View>

                  {!notification.is_read && <View style={styles.unreadDot} />}
                </Surface>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>{t('notifications.noNotifications')}</Text>
            <Text style={styles.emptyText}>
              {t('notifications.emptyMessage')}
            </Text>
          </View>
        )}

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  titleWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: theme.spacing.sm,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  notificationCardUnread: {
    backgroundColor: `${theme.colors.primary}08`,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  notificationMessage: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  notificationTime: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 3,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
