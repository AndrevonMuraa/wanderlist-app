import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../../utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../../contexts/ThemeContext';
import { BACKEND_URL } from '../../utils/config';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem('auth_token');
  return await SecureStore.getItemAsync('auth_token');
};

interface TMsg {
  message_id: string;
  from_name: string;
  from_role: 'user' | 'moderator';
  body: string;
  created_at: string;
}
interface Ticket {
  ticket_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  subject: string;
  status: 'open' | 'closed';
  messages: TMsg[];
  updated_at: string;
  last_message_from: 'user' | 'moderator';
  unread_for_mods?: boolean;
}

export default function AdminTicketsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [active, setActive] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const qs = filter === 'all' ? '' : `?status=${filter}`;
      const res = await fetch(`${BACKEND_URL}/api/admin/tickets${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setTickets(d.tickets || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openTicket = async (t: Ticket) => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/tickets/${t.ticket_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActive(await res.json());
        setReply('');
      }
    } catch {
      Alert.alert('Error', 'Failed to load ticket');
    }
  };

  const sendReply = async (closeAfter: boolean) => {
    if (!active || !reply.trim() || busy) return;
    setBusy(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/tickets/${active.ticket_id}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim(), close_after: closeAfter }),
      });
      if (res.ok) {
        setReply('');
        await openTicket(active); // refresh thread
        await load();
        if (closeAfter) setActive(null);
      } else {
        Alert.alert('Error', 'Failed to send');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    } finally {
      setBusy(false);
    }
  };

  const closeTicket = async () => {
    if (!active) return;
    Alert.alert('Close ticket', 'Mark this conversation as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        onPress: async () => {
          const token = await getToken();
          await fetch(`${BACKEND_URL}/api/admin/tickets/${active.ticket_id}/close`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          setActive(null);
          load();
        },
      },
    ]);
  };

  // --- Detail view ---
  if (active) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setActive(null)} style={styles.headerBack} testID="admin-ticket-back">
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{active.subject}</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{active.user_name} · {active.user_email}</Text>
            </View>
            {active.status === 'open' ? (
              <TouchableOpacity onPress={closeTicket} style={styles.headerClose} testID="admin-ticket-close">
                <Ionicons name="checkmark-done" size={22} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={[styles.statusPill, { backgroundColor: '#6B7280' }]}>
                <Text style={styles.statusPillText}>CLOSED</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
            {(active.messages || []).map((m) => (
              <View
                key={m.message_id}
                style={[
                  styles.bubble,
                  m.from_role === 'moderator'
                    ? { alignSelf: 'flex-end', backgroundColor: '#3B82F6' }
                    : { alignSelf: 'flex-start', backgroundColor: colors.surface },
                ]}
              >
                <Text style={{ fontSize: 11, color: m.from_role === 'moderator' ? 'rgba(255,255,255,0.8)' : colors.textSecondary, marginBottom: 3 }}>
                  {m.from_name} · {new Date(m.created_at).toLocaleString()}
                </Text>
                <Text style={{ fontSize: 14, color: m.from_role === 'moderator' ? '#fff' : colors.text }}>
                  {m.body}
                </Text>
              </View>
            ))}
          </ScrollView>

          {active.status === 'open' && (
            <View style={[styles.replyBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.replyInput, { color: colors.text, backgroundColor: colors.background }]}
                multiline
                value={reply}
                onChangeText={setReply}
                placeholder="Type your reply…"
                placeholderTextColor={colors.textSecondary}
                maxLength={4000}
                editable={!busy}
                testID="admin-ticket-reply-input"
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: '#6B7280', flex: 1, opacity: (!reply.trim() || busy) ? 0.5 : 1 }]}
                  onPress={() => sendReply(true)}
                  disabled={!reply.trim() || busy}
                  testID="admin-ticket-reply-close"
                >
                  <Ionicons name="checkmark-done" size={16} color="#fff" />
                  <Text style={styles.sendBtnText}>Reply & Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: '#3B82F6', flex: 1.2, opacity: (!reply.trim() || busy) ? 0.5 : 1 }]}
                  onPress={() => sendReply(false)}
                  disabled={!reply.trim() || busy}
                  testID="admin-ticket-reply-send"
                >
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.sendBtnText}>{busy ? 'Sending…' : 'Send'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- List view ---
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.headerBack} testID="admin-tickets-back">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Support inbox</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <View style={styles.rangeRow}>
        {(['open', 'closed', 'all'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.rangeBtn, { backgroundColor: filter === f ? colors.primary : colors.surface }]}
            onPress={() => setFilter(f)}
            testID={`admin-tickets-filter-${f}`}
          >
            <Text style={{ color: filter === f ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>
              {f === 'open' ? 'Open' : f === 'closed' ? 'Closed' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {tickets.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>No tickets in this view.</Text>
          ) : tickets.map((t) => {
            const lastMsg = t.messages[t.messages.length - 1];
            const isUnread = t.unread_for_mods && t.status === 'open';
            return (
              <TouchableOpacity
                key={t.ticket_id}
                style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: isUnread ? '#3B82F6' : 'transparent' }]}
                onPress={() => openTicket(t)}
                testID={`admin-ticket-row-${t.ticket_id}`}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.ticketSubject, { color: colors.text }]} numberOfLines={1}>
                    {isUnread && '● '}{t.subject}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: t.status === 'open' ? '#10B981' : '#6B7280' }]}>
                    <Text style={styles.statusPillText}>{t.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {t.user_name} · {new Date(t.updated_at).toLocaleString()}
                </Text>
                {lastMsg && (
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }} numberOfLines={2}>
                    <Text style={{ fontWeight: '600' }}>{lastMsg.from_role === 'moderator' ? 'You: ' : `${lastMsg.from_name}: `}</Text>
                    {lastMsg.body}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.25)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  rangeRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 0 },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  empty: { textAlign: 'center', padding: 32, fontStyle: 'italic' },
  card: { padding: 14, borderRadius: 12, borderLeftWidth: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ticketSubject: { fontSize: 15, fontWeight: '700', flex: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  bubble: { padding: 12, borderRadius: 14, maxWidth: '85%' },
  replyBar: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
  replyInput: { minHeight: 60, maxHeight: 160, padding: 12, borderRadius: 10, fontSize: 14, textAlignVertical: 'top' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
