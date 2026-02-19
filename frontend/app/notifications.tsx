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
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';

import { HeaderBranding } from '../components/BrandedGlobeIcon';
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Navigate back to profile tab explicitly
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
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationTap = async (notification: Notification) => {
    // Mark as read
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
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on type
    if (notification.related_id) {
      if (notification.type === 'like' || notification.type === 'comment' || notification.type === 'reply') {
        router.push(`/visit-detail/${notification.related_id}`);
      }
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
      console.error('Error marking all as read:', error);
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
      case 'achievement':
        return { name: 'trophy', color: '#FFD700' };
      case 'streak_milestone':
        return { name: 'flame', color: '#FF6B35' };
      case 'rank_up':
        return { name: 'star', color: '#FFD700' };
      default:
        return { name: 'notifications', color: theme.colors.textSecondary };
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  // Get safe area insets for proper header padding
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
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
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <HeaderBranding size={18} textColor="#2A2A2A" />
          </TouchableOpacity>
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
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandingTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  markAllButton: {
    padding: theme.spacing.xs,
  },
  headerRight: {
    width: 40,
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
