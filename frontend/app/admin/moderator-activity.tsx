import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl } from 'react-native';
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

interface ModStat {
  user_id: string;
  name: string;
  email: string;
  role: string;
  picture?: string;
  reports_reviewed: number;
  resolved: number;
  dismissed: number;
  avg_response_hours: number | null;
  warnings_issued: number;
  suspensions: number;
  content_hidden: number;
  content_deleted: number;
  last_active: string | null;
}

export default function ModeratorActivityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);
  const [mods, setMods] = useState<ModStat[]>([]);

  const fetchData = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/moderator-activity?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMods(data.moderators || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [days]);

  const formatHours = (h: number | null) => {
    if (h === null || h === undefined) return '—';
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < 48) return `${h.toFixed(1)}h`;
    return `${Math.round(h / 24)}d`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.headerBack} testID="mod-activity-back">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Moderator activity</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Time range */}
      <View style={styles.rangeRow}>
        {[7, 30, 90].map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setDays(d)}
            style={[styles.rangeBtn, { backgroundColor: days === d ? colors.primary : colors.surface }]}
            testID={`mod-activity-range-${d}`}
          >
            <Text style={{ color: days === d ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>
              Last {d}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        >
          {mods.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>No moderators on record.</Text>
          ) : mods.map((m) => (
            <View key={m.user_id} style={[styles.card, { backgroundColor: colors.surface }]} testID={`mod-activity-row-${m.user_id}`}>
              <View style={styles.cardHeader}>
                <View style={styles.modMeta}>
                  <Text style={[styles.modName, { color: colors.text }]}>{m.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: m.role === 'admin' ? '#8b5cf6' : '#3b82f6' }]}>
                    <Text style={styles.roleText}>{m.role === 'admin' ? 'SUPER' : 'MOD'}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {m.last_active ? new Date(m.last_active).toLocaleDateString() : 'never active'}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{m.email}</Text>

              <View style={styles.statsGrid}>
                <Stat label="Reviewed" value={m.reports_reviewed} />
                <Stat label="Resolved" value={m.resolved} color="#10B981" />
                <Stat label="Dismissed" value={m.dismissed} color="#6B7280" />
                <Stat label="Avg resp" value={formatHours(m.avg_response_hours)} />
                <Stat label="Warnings" value={m.warnings_issued} color="#F59E0B" />
                <Stat label="Suspended" value={m.suspensions} color="#F97316" />
                <Stat label="Hidden" value={m.content_hidden} color="#8B5CF6" />
                <Stat label="Deleted" value={m.content_deleted} color="#DC2626" />
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const Stat = ({ label, value, color }: { label: string; value: number | string; color?: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.statCell}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: color || colors.text }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  rangeRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 0 },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  empty: { textAlign: 'center', padding: 32, fontStyle: 'italic' },
  card: { padding: 14, borderRadius: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modName: { fontSize: 15, fontWeight: '700' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 4 },
  statCell: { width: '24%', alignItems: 'center', paddingVertical: 8 },
});
