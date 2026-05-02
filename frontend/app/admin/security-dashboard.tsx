/**
 * Security Dashboard — super-admin morning-coffee check.
 * One screen, everything you need to know at a glance.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../../utils/config';
import { getToken } from '../../utils/token';
import { useTheme } from '../../contexts/ThemeContext';

type StaffRow = {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'moderator';
  totp_enabled: boolean;
  totp_enabled_at?: string | null;
  backup_codes_remaining: number;
};

type Dashboard = {
  generated_at: string;
  summary: {
    active_lockouts: number;
    staff_total: number;
    staff_with_2fa: number;
    staff_2fa_coverage_pct: number;
    lockdown_active: boolean;
  };
  active_lockouts: Array<{
    user_id: string; email: string; name: string;
    failed_login_attempts: number; locked_until: string;
  }>;
  recent_actions: Array<{
    admin_name: string; action: string; target_id: string; created_at: string;
  }>;
  action_counts_30d: Array<{ action: string; count: number }>;
  staff_2fa: StaffRow[];
  lockdown: {
    state: any;
    recent_events: Array<{ admin_name: string; action: string; created_at: string }>;
  };
  tier_quota_today: Array<{ admin_id: string; used: number; limit: number }>;
};

const fmtTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const actionColor = (action: string) => {
  if (action.includes('lockdown')) return '#dc2626';
  if (action.includes('2fa')) return '#10b981';
  if (action.includes('tier')) return '#f59e0b';
  if (action.includes('warn') || action.includes('suspend')) return '#ef4444';
  if (action.includes('hide') || action.includes('delete')) return '#a855f7';
  return '#6b7280';
};

export default function SecurityDashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      const r = await fetch(`${BACKEND_URL}/api/admin/security-dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {error ? (
          <Text style={{ color: colors.text }}>{error}</Text>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    );
  }

  const s = data.summary;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      testID="security-dashboard"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="sec-dash-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Security</Text>
        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
          Updated {fmtTime(data.generated_at)}
        </Text>
      </View>

      {/* Summary stats */}
      <View style={styles.statGrid}>
        <StatCard
          label="2FA coverage"
          value={`${s.staff_2fa_coverage_pct}%`}
          sub={`${s.staff_with_2fa}/${s.staff_total} staff`}
          tone={s.staff_2fa_coverage_pct === 100 ? 'good' : s.staff_2fa_coverage_pct > 50 ? 'warn' : 'bad'}
        />
        <StatCard
          label="Active lockouts"
          value={String(s.active_lockouts)}
          sub="brute-force locked"
          tone={s.active_lockouts === 0 ? 'good' : 'warn'}
        />
        <StatCard
          label="Lockdown"
          value={s.lockdown_active ? 'ACTIVE' : 'Off'}
          sub={s.lockdown_active ? 'writes frozen' : 'normal ops'}
          tone={s.lockdown_active ? 'bad' : 'good'}
        />
      </View>

      {/* Staff 2FA list */}
      <Section title="Staff · 2FA status">
        {data.staff_2fa.map((u) => (
          <View key={u.user_id} style={[styles.row, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                {u.name}  <Text style={[styles.roleBadge, {
                  backgroundColor: u.role === 'admin' ? '#fef3c7' : '#dbeafe',
                  color: u.role === 'admin' ? '#92400e' : '#1e40af',
                }]}>{u.role}</Text>
              </Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{u.email}</Text>
            </View>
            {u.totp_enabled ? (
              <View style={styles.okPill}>
                <Ionicons name="shield-checkmark" size={12} color="#047857" />
                <Text style={styles.okPillText}>{u.backup_codes_remaining}/10</Text>
              </View>
            ) : (
              <View style={styles.badPill}>
                <Ionicons name="warning" size={12} color="#b91c1c" />
                <Text style={styles.badPillText}>No 2FA</Text>
              </View>
            )}
          </View>
        ))}
      </Section>

      {/* Active lockouts */}
      {data.active_lockouts.length > 0 && (
        <Section title={`Active lockouts (${data.active_lockouts.length})`}>
          {data.active_lockouts.map((u) => (
            <View key={u.user_id} style={[styles.row, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{u.name || u.email}</Text>
                <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                  {u.failed_login_attempts} failures · until {fmtTime(u.locked_until)}
                </Text>
              </View>
              <Ionicons name="lock-closed" size={18} color="#dc2626" />
            </View>
          ))}
        </Section>
      )}

      {/* Recent actions */}
      <Section title="Last 10 admin actions">
        {data.recent_actions.map((a, i) => (
          <View key={i} style={[styles.row, { borderColor: colors.border }]}>
            <View style={[styles.actionDot, { backgroundColor: actionColor(a.action) }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{a.action}</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                {a.admin_name} → {a.target_id} · {fmtTime(a.created_at)}
              </Text>
            </View>
          </View>
        ))}
        {data.recent_actions.length === 0 && (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No admin actions yet.</Text>
        )}
      </Section>

      {/* Action counts 30d */}
      <Section title="Last 30 days · by action">
        {data.action_counts_30d.map((a) => (
          <View key={a.action} style={[styles.row, { borderColor: colors.border }]}>
            <View style={[styles.actionDot, { backgroundColor: actionColor(a.action) }]} />
            <Text style={[styles.rowTitle, { flex: 1, color: colors.text }]}>{a.action}</Text>
            <Text style={[styles.countNum, { color: colors.text }]}>{a.count}</Text>
          </View>
        ))}
        {data.action_counts_30d.length === 0 && (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No admin actions in the last 30 days.</Text>
        )}
      </Section>

      {/* Lockdown history */}
      {data.lockdown.recent_events.length > 0 && (
        <Section title="Lockdown history">
          {data.lockdown.recent_events.map((e, i) => (
            <View key={i} style={[styles.row, { borderColor: colors.border }]}>
              <Ionicons
                name={e.action === 'lockdown_enabled' ? 'lock-closed' : 'lock-open'}
                size={16}
                color={e.action === 'lockdown_enabled' ? '#dc2626' : '#10b981'}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  {e.action === 'lockdown_enabled' ? 'Frozen' : 'Lifted'} by {e.admin_name}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{fmtTime(e.created_at)}</Text>
              </View>
            </View>
          ))}
        </Section>
      )}

      {/* Tier quota today */}
      {data.tier_quota_today.length > 0 && (
        <Section title="Tier-change quota · today">
          {data.tier_quota_today.map((q) => (
            <View key={q.admin_id} style={[styles.row, { borderColor: colors.border }]}>
              <Text style={[styles.rowTitle, { flex: 1, color: colors.text }]}>{q.admin_id}</Text>
              <Text style={[styles.countNum, {
                color: q.used >= q.limit ? '#dc2626' : colors.text,
              }]}>
                {q.used} / {q.limit}
              </Text>
            </View>
          ))}
        </Section>
      )}
    </ScrollView>
  );
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
};

const StatCard: React.FC<{
  label: string; value: string; sub: string; tone: 'good' | 'warn' | 'bad';
}> = ({ label, value, sub, tone }) => {
  const palette = {
    good: { bg: '#d1fae5', fg: '#047857', sub: '#065f46' },
    warn: { bg: '#fef3c7', fg: '#92400e', sub: '#78350f' },
    bad: { bg: '#fee2e2', fg: '#b91c1c', sub: '#7f1d1d' },
  }[tone];
  return (
    <View style={[styles.statCard, { backgroundColor: palette.bg }]}>
      <Text style={[styles.statValue, { color: palette.fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.sub }]}>{label}</Text>
      <Text style={[styles.statSub, { color: palette.sub }]}>{sub}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginTop: 50, marginBottom: 16 },
  backBtn: { padding: 4, alignSelf: 'flex-start' },
  title: { fontSize: 26, fontWeight: '900', marginTop: 6 },
  timestamp: { fontSize: 11, marginTop: 2 },
  statGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, padding: 12, borderRadius: 12 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 },
  statSub: { fontSize: 10, marginTop: 2 },
  section: { padding: 14, borderRadius: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 13, fontWeight: '700' },
  rowSub: { fontSize: 11, marginTop: 2 },
  empty: { fontSize: 13, fontStyle: 'italic', paddingVertical: 6 },
  actionDot: { width: 8, height: 8, borderRadius: 4 },
  countNum: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  roleBadge: {
    fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: 0.5, overflow: 'hidden',
  },
  okPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#d1fae5',
  },
  okPillText: { color: '#047857', fontSize: 11, fontWeight: '800' },
  badPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#fee2e2',
  },
  badPillText: { color: '#b91c1c', fontSize: 11, fontWeight: '800' },
});
