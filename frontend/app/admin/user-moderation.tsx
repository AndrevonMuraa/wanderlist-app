import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { safeGoBack } from '../../utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../../contexts/ThemeContext';
import { BACKEND_URL } from '../../utils/config';
import { useAuth } from '../../contexts/AuthContext';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem('auth_token');
  return await SecureStore.getItemAsync('auth_token');
};

interface Warning {
  warning_id: string;
  reason: string;
  message?: string;
  issued_by_name?: string;
  issued_at?: string;
  related_report_id?: string;
}

interface ReportAgainst {
  report_id: string;
  reason: string;
  status: string;
  created_at: string;
}

interface ModerationHistory {
  user_id: string;
  warning_count: number;
  warnings: Warning[];
  last_warning_at?: string;
  is_banned?: boolean;
  ban_reason?: string;
  suspended_until?: string;
  suspension_reason?: string;
  reports_against: ReportAgainst[];
}

interface UserInfo {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
  role: string;
  subscription_tier: string;
  is_banned: boolean;
}

// Platform-aware prompt helper
const promptReason = (title: string, message: string, defaultValue = ''): Promise<string | null> => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const val = window.prompt(`${title}\n\n${message}`, defaultValue);
      resolve(val && val.trim().length > 0 ? val.trim() : null);
      return;
    }
    // @ts-ignore
    if (Alert.prompt) {
      // @ts-ignore
      Alert.prompt(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'OK', onPress: (val: string) => resolve(val?.trim() || null) },
      ], 'plain-text', defaultValue);
    } else {
      Alert.alert(title, message, [{ text: 'OK', onPress: () => resolve(defaultValue || 'No reason provided') }]);
    }
  });
};

export default function UserModerationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [history, setHistory] = useState<ModerationHistory | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const token = await getToken();
      const [uRes, hRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/admin/users/${id}/moderation-history`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (uRes.ok) setUser(await uRes.json());
      if (hRes.ok) setHistory(await hRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const warn = async () => {
    const reason = await promptReason('Issue warning', 'Reason (shown to user):');
    if (!reason) return;
    const token = await getToken();
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${id}/warn`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      const data = await res.json();
      Alert.alert(
        'Warning issued',
        data.auto_suspended
          ? `User auto-suspended for ${data.suspend_days} days (total: ${data.warning_count} warnings).`
          : `Total warnings: ${data.warning_count}.`,
      );
      fetchData();
    } else {
      const data = await res.json().catch(() => ({}));
      Alert.alert('Error', data.detail || 'Failed');
    }
  };

  const suspend = async () => {
    const daysStr = await promptReason('Suspend user', 'Number of days (1-365):', '7');
    if (!daysStr) return;
    const days = parseInt(daysStr, 10);
    if (!days || days < 1 || days > 365) {
      Alert.alert('Invalid', 'Must be a number between 1 and 365.');
      return;
    }
    const reason = await promptReason('Suspend user', 'Reason:');
    if (!reason) return;
    const token = await getToken();
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${id}/suspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_days: days, reason }),
    });
    if (res.ok) {
      Alert.alert('Suspended', `User suspended for ${days} days.`);
      fetchData();
    } else {
      Alert.alert('Error', 'Failed');
    }
  };

  const unsuspend = async () => {
    Alert.alert('Lift suspension', 'Allow this user to sign in immediately?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unsuspend',
        onPress: async () => {
          const token = await getToken();
          const res = await fetch(`${BACKEND_URL}/api/admin/users/${id}/unsuspend`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            Alert.alert('Done', 'Suspension lifted.');
            fetchData();
          } else {
            Alert.alert('Error', 'Failed');
          }
        },
      },
    ]);
  };

  const sendMessage = async () => {
    const msg = await promptReason('Message user', 'Text shown to user as a notification:');
    if (!msg) return;
    const token = await getToken();
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${id}/message`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    });
    if (res.ok) Alert.alert('Sent', 'Message delivered.');
    else Alert.alert('Error', 'Failed');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isSuspended = !!(history?.suspended_until && new Date(history.suspended_until) > new Date());
  const warningCount = history?.warning_count || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.headerBack} testID="user-mod-back">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Moderation</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        {/* User header */}
        <View style={[styles.card, { backgroundColor: colors.surface }]} testID="user-mod-profile">
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          <View style={styles.badgesRow}>
            {user?.role === 'admin' && <Badge label="SUPER ADMIN" color="#8b5cf6" />}
            {user?.role === 'moderator' && <Badge label="MODERATOR" color="#3b82f6" />}
            {user?.subscription_tier === 'pro' && <Badge label="PRO" color="#f59e0b" />}
            {user?.is_banned && <Badge label="BANNED" color="#ef4444" />}
            {isSuspended && <Badge label="SUSPENDED" color="#F97316" />}
            {warningCount > 0 && <Badge label={`${warningCount} warning${warningCount !== 1 ? 's' : ''}`} color="#F59E0B" />}
          </View>
        </View>

        {/* Current state summary */}
        {(isSuspended || history?.is_banned) && (
          <View style={[styles.card, { backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderLeftColor: '#F59E0B' }]}>
            {isSuspended && history?.suspended_until && (
              <Text style={{ fontSize: 14, color: '#92400E' }}>
                Suspended until {new Date(history.suspended_until).toLocaleString()}
                {history.suspension_reason ? `. Reason: ${history.suspension_reason}` : ''}
              </Text>
            )}
            {history?.is_banned && (
              <Text style={{ fontSize: 14, color: '#92400E', marginTop: isSuspended ? 8 : 0 }}>
                Permanently banned. {history.ban_reason ? `Reason: ${history.ban_reason}` : ''}
              </Text>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionsGrid}>
          <ActionButton icon="warning" label="Warn" color="#F59E0B" onPress={warn} testID="user-mod-warn-btn" />
          {!isSuspended ? (
            <ActionButton icon="time" label="Suspend" color="#F97316" onPress={suspend} testID="user-mod-suspend-btn" />
          ) : (
            <ActionButton icon="lock-open" label="Unsuspend" color="#10B981" onPress={unsuspend} testID="user-mod-unsuspend-btn" />
          )}
          <ActionButton icon="mail" label="Message" color="#3B82F6" onPress={sendMessage} testID="user-mod-message-btn" />
        </View>

        {/* Warnings history */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Warning history ({warningCount})</Text>
          {(history?.warnings || []).length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>No warnings issued.</Text>
          ) : (
            (history?.warnings || []).slice().reverse().map((w) => (
              <View key={w.warning_id} style={[styles.warningRow, { borderBottomColor: colors.border }]}>
                <Ionicons name="warning" size={16} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, color: colors.text, fontWeight: '600' }}>{w.reason}</Text>
                  {w.message ? (
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{w.message}</Text>
                  ) : null}
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                    by {w.issued_by_name || 'Unknown'} · {w.issued_at ? new Date(w.issued_at).toLocaleString() : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Reports against */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Reports against this user ({history?.reports_against?.length || 0})</Text>
          {(history?.reports_against || []).length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>No reports on file.</Text>
          ) : (
            (history?.reports_against || []).map((r) => (
              <View key={r.report_id} style={[styles.warningRow, { borderBottomColor: colors.border }]}>
                <Ionicons name="flag" size={14} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: colors.text }}>{r.reason}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {r.status} · {new Date(r.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const Badge = ({ label, color }: { label: string; color: string }) => (
  <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{label}</Text>
  </View>
);

const ActionButton = ({ icon, label, color, onPress, testID }: any) => (
  <TouchableOpacity
    style={[styles.actionBtn, { backgroundColor: color + '20', borderColor: color }]}
    onPress={onPress}
    testID={testID}
  >
    <Ionicons name={icon} size={22} color={color} />
    <Text style={{ color, fontWeight: '700', fontSize: 13, marginTop: 4 }}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  card: { padding: 16, borderRadius: 14 },
  userName: { fontSize: 20, fontWeight: '700' },
  userEmail: { fontSize: 13, marginTop: 2 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  actionsGrid: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  warningRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start' },
  empty: { fontSize: 13, fontStyle: 'italic' },
});
