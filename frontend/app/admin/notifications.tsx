import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { BACKEND_URL } from '../../utils/config';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface NotificationRecord {
  notification_id: string;
  title: string;
  body: string;
  target: string;
  sent_by_name: string;
  target_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

interface NotificationStats {
  total_notifications: number;
  sent_this_week: number;
  users_with_tokens: number;
  total_delivered: number;
}

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'pro' | 'free'>('all');
  const [sending, setSending] = useState(false);
  
  // History state
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getToken();
      
      // Fetch stats
      const statsRes = await fetch(`${BACKEND_URL}/api/admin/notifications/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      // Fetch history
      const historyRes = await fetch(`${BACKEND_URL}/api/admin/notifications?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setNotifications(historyData.notifications);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Error', 'Please enter both title and message');
      return;
    }

    Alert.alert(
      'Confirm Send',
      `Send notification to ${target === 'all' ? 'all users' : target === 'pro' ? 'Pro users only' : 'Free users only'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const token = await getToken();
              const response = await fetch(`${BACKEND_URL}/api/admin/notifications/send`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, body, target }),
              });

              if (response.ok) {
                const result = await response.json();
                Alert.alert(
                  'Success',
                  `Notification sent!\n\nTarget: ${result.target_count} users\nDelivered: ${result.sent_count}\nFailed: ${result.failed_count}`,
                  [{ text: 'OK', onPress: () => {
                    setTitle('');
                    setBody('');
                    fetchData();
                  }}]
                );
              } else {
                const error = await response.json();
                Alert.alert('Error', error.detail || 'Failed to send notification');
              }
            } catch (err) {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const TargetButton = ({ value, label, icon }: { value: 'all' | 'pro' | 'free'; label: string; icon: keyof typeof Ionicons.glyphMap }) => (
    <TouchableOpacity
      style={[
        styles.targetButton,
        { 
          backgroundColor: target === value ? colors.primary : colors.surface,
          borderColor: target === value ? colors.primary : colors.border,
        }
      ]}
      onPress={() => setTarget(value)}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={target === value ? '#fff' : colors.textSecondary} 
      />
      <Text style={[
        styles.targetButtonText,
        { color: target === value ? '#fff' : colors.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const StatCard = ({ title, value, icon, color }: { 
    title: string; 
    value: number; 
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
  }) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Push Notifications</Text>
          <TouchableOpacity 
            onPress={() => setShowHistory(!showHistory)} 
            style={styles.headerBackButton}
          >
            <Ionicons name={showHistory ? "create" : "time"} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* Stats */}
          {stats && (
            <View style={styles.statsRow}>
              <StatCard 
                title="Users w/ Push" 
                value={stats.users_with_tokens} 
                icon="notifications" 
                color="#3b82f6"
              />
              <StatCard 
                title="Sent This Week" 
                value={stats.sent_this_week} 
                icon="send" 
                color="#10b981"
              />
              <StatCard 
                title="Total Delivered" 
                value={stats.total_delivered} 
                icon="checkmark-circle" 
                color="#8b5cf6"
              />
            </View>
          )}

          {!showHistory ? (
            /* Compose Form */
            <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="create" size={18} color={colors.primary} /> Compose Notification
              </Text>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Notification title..."
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={50}
                />
                <Text style={[styles.charCount, { color: colors.textSecondary }]}>{title.length}/50</Text>
              </View>

              {/* Body Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Message</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Write your message..."
                  placeholderTextColor={colors.textSecondary}
                  value={body}
                  onChangeText={setBody}
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={[styles.charCount, { color: colors.textSecondary }]}>{body.length}/200</Text>
              </View>

              {/* Target Selection */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target Audience</Text>
                <View style={styles.targetRow}>
                  <TargetButton value="all" label="All Users" icon="people" />
                  <TargetButton value="pro" label="Pro Only" icon="diamond" />
                  <TargetButton value="free" label="Free Only" icon="person" />
                </View>
              </View>

              {/* Send Button */}
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: colors.primary, opacity: sending ? 0.7 : 1 }]}
                onPress={sendNotification}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.sendButtonText}>Send Notification</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* History View */
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
                <Ionicons name="time" size={18} color={colors.primary} /> Notification History
              </Text>
              
              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : notifications.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                  <Ionicons name="notifications-off" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No notifications sent yet
                  </Text>
                </View>
              ) : (
                notifications.map((notif) => (
                  <View key={notif.notification_id} style={[styles.historyCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.historyHeader}>
                      <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
                        {notif.title}
                      </Text>
                      <View style={[styles.targetBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.targetBadgeText, { color: colors.primary }]}>
                          {notif.target.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.historyBody, { color: colors.textSecondary }]} numberOfLines={2}>
                      {notif.body}
                    </Text>
                    <View style={styles.historyFooter}>
                      <View style={styles.historyStats}>
                        <Ionicons name="people" size={14} color={colors.textSecondary} />
                        <Text style={[styles.historyStatText, { color: colors.textSecondary }]}>
                          {notif.target_count} targeted
                        </Text>
                        <Ionicons name="checkmark-circle" size={14} color="#10b981" style={{ marginLeft: 12 }} />
                        <Text style={[styles.historyStatText, { color: '#10b981' }]}>
                          {notif.sent_count} sent
                        </Text>
                        {notif.failed_count > 0 && (
                          <>
                            <Ionicons name="close-circle" size={14} color={colors.error} style={{ marginLeft: 12 }} />
                            <Text style={[styles.historyStatText, { color: colors.error }]}>
                              {notif.failed_count} failed
                            </Text>
                          </>
                        )}
                      </View>
                      <Text style={[styles.historyDate, { color: colors.textLight }]}>
                        {formatDate(notif.created_at)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statTitle: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  formCard: {
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  targetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  targetButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  historyCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  targetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  targetBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historyBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyStatText: {
    fontSize: 12,
    marginLeft: 4,
  },
  historyDate: {
    fontSize: 12,
  },
  bottomSpacer: {
    height: 40,
  },
});
