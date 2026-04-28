import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
  Modal,
  Linking,
  TextInput,
  Alert,
  KeyboardAvoidingView,
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
  const [modMessage, setModMessage] = useState<Notification | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

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
      case 'year_recap_ready':
        if (notification.related_id) {
          router.push(`/year-in-travel?year=${notification.related_id}`);
        } else {
          router.push('/year-in-travel');
        }
        break;
      case 'moderator_message':
      case 'content_removed':
      case 'content_hidden':
      case 'warning_issued':
      case 'account_suspended':
      case 'trusted_traveler_earned':
        router.push('/terms-of-service?section=guidelines');
        break;
      case 'moderator_message':
        // Personal moderator message — open a modal so user can read the full text
        setModMessage(notification);
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
      case 'content_removed':
        return { name: 'shield', color: '#E87850' };
      case 'content_hidden':
        return { name: 'eye-off', color: '#F59E0B' };
      case 'warning_issued':
        return { name: 'warning', color: '#F59E0B' };
      case 'account_suspended':
        return { name: 'lock-closed', color: '#F97316' };
      case 'moderator_message':
        return { name: 'mail', color: '#3B82F6' };
      case 'trusted_traveler_earned':
        return { name: 'shield-checkmark', color: '#10B981' };
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
                testID={`notification-${notification.notification_id}`}
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

      {/* Moderator message modal */}
      <Modal
        visible={!!modMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setModMessage(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModMessage(null)}
          style={styles.modalOverlay}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard} testID="moderator-message-modal">
            <View style={styles.modalIconRow}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="mail" size={24} color="#3B82F6" />
              </View>
              <TouchableOpacity onPress={() => setModMessage(null)} testID="moderator-message-close">
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalTitle}>{modMessage?.title}</Text>
            <Text style={styles.modalBody}>{modMessage?.message}</Text>
            <Text style={styles.modalFooter}>
              {modMessage?.created_at ? new Date(modMessage.created_at).toLocaleString() : ''}
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => {
                  setReplyText('');
                  setReplyOpen(true);
                }}
                testID="moderator-message-reply"
              >
                <Ionicons name="arrow-undo" size={16} color="#3B82F6" />
                <Text style={[styles.modalBtnText, styles.modalBtnTextSecondary]}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => setModMessage(null)}
                testID="moderator-message-dismiss"
              >
                <Text style={styles.modalBtnText}>OK</Text>
              </TouchableOpacity>
            </View>

            {replyOpen && (
              <View style={styles.replyPane}>
                <Text style={styles.replyLabel}>Your reply</Text>
                <TextInput
                  style={styles.replyInput}
                  multiline
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Type your message to the moderator…"
                  placeholderTextColor={theme.colors.textSecondary}
                  maxLength={4000}
                  editable={!replyBusy}
                  testID="moderator-message-reply-input"
                />
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnSecondary]}
                    onPress={() => { setReplyOpen(false); setReplyText(''); }}
                    disabled={replyBusy}
                    testID="moderator-message-reply-cancel"
                  >
                    <Text style={[styles.modalBtnText, styles.modalBtnTextSecondary]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnPrimary, (!replyText.trim() || replyBusy) && { opacity: 0.5 }]}
                    onPress={async () => {
                      if (!replyText.trim() || !modMessage) return;
                      setReplyBusy(true);
                      try {
                        const token = await getToken();
                        const res = await fetch(`${BACKEND_URL}/api/support/tickets`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            subject: `Re: ${modMessage.title || 'Moderator message'}`,
                            message: replyText.trim(),
                            related_notification_id: modMessage.notification_id,
                          }),
                        });
                        if (res.ok) {
                          setReplyOpen(false);
                          setReplyText('');
                          setModMessage(null);
                          Alert.alert('Reply sent', 'A moderator will get back to you soon.');
                        } else {
                          const d = await res.json().catch(() => ({}));
                          Alert.alert('Error', d.detail || 'Failed to send reply');
                        }
                      } catch {
                        Alert.alert('Error', 'Network error');
                      } finally {
                        setReplyBusy(false);
                      }
                    }}
                    disabled={!replyText.trim() || replyBusy}
                    testID="moderator-message-reply-send"
                  >
                    <Text style={styles.modalBtnText}>{replyBusy ? 'Sending…' : 'Send'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  modalIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
    marginBottom: 16,
  },
  modalFooter: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  modalBtnPrimary: {
    flex: 1.2,
    backgroundColor: '#3B82F6',
  },
  modalBtnSecondary: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBtnTextSecondary: {
    color: '#3B82F6',
  },
  replyPane: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  replyInput: {
    minHeight: 100,
    maxHeight: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
});
