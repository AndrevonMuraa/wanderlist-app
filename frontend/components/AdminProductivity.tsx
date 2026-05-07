/**
 * Admin productivity widgets:
 *   - <ActivityTicker /> — polls /admin/recent-activity every 15s, scrolling list of last admin actions.
 *   - <UserExplainer userId={} onClose={} /> — bottom sheet with trust criteria + suspension state.
 *   - <ExportButton data={} columns={} filename /> — CSV / JSON export, web uses anchor download, native uses Share.
 *   - <SplitView left={} right={} /> — 2-pane layout when viewport ≥ 1280px (web only).
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, Share, StyleSheet, Text,
  TouchableOpacity, useWindowDimensions, View, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';
import { useTheme } from '../contexts/ThemeContext';

// ============================================================================
// Activity Ticker
// ============================================================================

type LogRow = { admin_id: string; admin_name: string; action: string; target_user_id?: string; target_name?: string; created_at?: string; reason?: string };

const formatAge = (iso?: string) => {
  if (!iso) return '';
  const diff = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

const ACTION_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  warn:               { icon: 'warning-outline',     color: '#f59e0b' },
  suspend:            { icon: 'pause-circle-outline', color: '#dc2626' },
  unsuspend:          { icon: 'play-circle-outline',  color: '#10b981' },
  hide:               { icon: 'eye-off-outline',      color: '#7c3aed' },
  restore:            { icon: 'eye-outline',          color: '#10b981' },
  delete:             { icon: 'trash-outline',        color: '#dc2626' },
  message:            { icon: 'chatbubble-outline',   color: '#3b82f6' },
  tier_change:        { icon: 'swap-vertical',        color: '#8b5cf6' },
  lockdown_enabled:   { icon: 'lock-closed',          color: '#dc2626' },
  lockdown_disabled:  { icon: 'lock-open',            color: '#10b981' },
  '2fa_enabled':      { icon: 'shield-checkmark',     color: '#10b981' },
  '2fa_disabled':     { icon: 'shield-outline',       color: '#f59e0b' },
};

export const ActivityTicker: React.FC<{ limit?: number }> = ({ limit = 10 }) => {
  const { colors } = useTheme();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const token = await getToken();
        const r = await fetch(`${BACKEND_URL}/api/admin/recent-activity?limit=${limit}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const json = await r.json();
        if (!cancelled) setRows(json.items ?? []);
      } catch { /* swallow */ }
      finally { if (!cancelled) setLoading(false); }
    };
    fetchOnce();
    const id = setInterval(fetchOnce, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [limit]);

  if (loading) {
    return <View style={[styles.tickerCard, { backgroundColor: colors.surface }]}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (rows.length === 0) {
    return (
      <View style={[styles.tickerCard, { backgroundColor: colors.surface }]} testID="activity-ticker">
        <Text style={[styles.tickerEmpty, { color: colors.textSecondary }]}>No admin activity yet.</Text>
      </View>
    );
  }
  return (
    <View style={[styles.tickerCard, { backgroundColor: colors.surface }]} testID="activity-ticker">
      <View style={styles.tickerHeader}>
        <Ionicons name="pulse" size={14} color={colors.textSecondary} />
        <Text style={[styles.tickerTitle, { color: colors.textSecondary }]}>Live admin activity</Text>
      </View>
      {rows.map((r, i) => {
        const meta = ACTION_META[r.action] ?? { icon: 'ellipse-outline', color: colors.textSecondary };
        return (
          <View key={i} style={[styles.tickerRow, { borderBottomColor: colors.border }]} testID={`ticker-row-${i}`}>
            <Ionicons name={meta.icon} size={16} color={meta.color} />
            <Text style={[styles.tickerLine, { color: colors.text }]} numberOfLines={1}>
              <Text style={{ fontWeight: '800' }}>{r.admin_name}</Text>
              <Text style={{ color: colors.textSecondary }}> {r.action.replace(/_/g, ' ')} </Text>
              {r.target_name ? <Text style={{ fontWeight: '700' }}>{r.target_name}</Text> : null}
            </Text>
            <Text style={[styles.tickerTime, { color: colors.textSecondary }]}>{formatAge(r.created_at)}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ============================================================================
// User Explainer (bottom sheet)
// ============================================================================

type Explainer = {
  user_id: string; username?: string; email?: string; role: string; subscription_tier?: string;
  trusted_traveler: boolean; account_age_days: number; is_suspended: boolean;
  suspended_until?: string | null; suspended_reason?: string | null;
  criteria: Record<string, { label: string; ok: boolean; value: any }>;
};

export const UserExplainer: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const { colors } = useTheme();
  const [data, setData] = useState<Explainer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const r = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/explain`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) setData(await r.json());
      } finally { setLoading(false); }
    })();
  }, [userId]);

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.sheetHandle} />
          {loading || !data ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 30 }} />
          ) : (
            <ScrollView>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{data.username ?? data.email}</Text>
              <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                {data.role} · {data.subscription_tier} · {data.account_age_days}d old
              </Text>

              {data.is_suspended ? (
                <View style={styles.suspBox} testID="explainer-suspended">
                  <Ionicons name="pause-circle" size={18} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suspTitle}>Suspended</Text>
                    <Text style={styles.suspBody}>
                      {data.suspended_reason ?? 'No reason recorded'}
                      {data.suspended_until ? `\nUntil ${new Date(data.suspended_until).toLocaleString()}` : ''}
                    </Text>
                  </View>
                </View>
              ) : null}

              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Trusted Traveler · {data.trusted_traveler ? 'Earned' : 'Not yet'}
              </Text>
              {Object.entries(data.criteria).map(([k, v]) => (
                <View key={k} style={[styles.critRow, { borderBottomColor: colors.border }]}>
                  <Ionicons name={v.ok ? 'checkmark-circle' : 'close-circle'} size={18} color={v.ok ? '#10b981' : '#dc2626'} />
                  <Text style={[styles.critLabel, { color: colors.text }]}>{v.label}</Text>
                  <Text style={[styles.critValue, { color: colors.textSecondary }]}>{String(v.value)}</Text>
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.background }]} testID="explainer-close">
            <Text style={[styles.closeBtnText, { color: colors.text }]}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ============================================================================
// Export Button (CSV / JSON)
// ============================================================================

type Col<T> = { key: keyof T | string; label: string };

const toCsv = <T,>(rows: T[], cols: Col<T>[]): string => {
  const escape = (v: any) => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.map((c) => escape(c.label)).join(',');
  const body = rows.map((r) => cols.map((c) => escape((r as any)[c.key])).join(',')).join('\n');
  return `${header}\n${body}`;
};

export function ExportButton<T>({ data, columns, filename = 'export', testID }: { data: T[]; columns: Col<T>[]; filename?: string; testID?: string }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  const download = async (kind: 'csv' | 'json') => {
    setBusy(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const name = `${filename}-${stamp}.${kind}`;
      const content = kind === 'csv' ? toCsv(data, columns) : JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: kind === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        await Share.share({ message: content, title: name });
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Unknown error');
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.exportRow} testID={testID ?? 'export-row'}>
      <TouchableOpacity onPress={() => download('csv')} disabled={busy || !data.length} style={[styles.exportBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} testID="export-csv">
        <Ionicons name="download-outline" size={14} color={colors.text} />
        <Text style={[styles.exportText, { color: colors.text }]}>CSV</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => download('json')} disabled={busy || !data.length} style={[styles.exportBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} testID="export-json">
        <Ionicons name="code-slash-outline" size={14} color={colors.text} />
        <Text style={[styles.exportText, { color: colors.text }]}>JSON</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// Split View (web-only, viewport ≥ 1280)
// ============================================================================

export const SplitView: React.FC<{ left: React.ReactNode; right: React.ReactNode; minWidth?: number }> = ({ left, right, minWidth = 1280 }) => {
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= minWidth;
  if (!isWide) return <>{left}</>;
  return (
    <View style={styles.split} testID="split-view">
      <View style={[styles.splitLeft, { borderRightColor: '#e5e7eb' }]}>{left}</View>
      <View style={styles.splitRight}>{right}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Ticker
  tickerCard: { borderRadius: 12, padding: 12, marginBottom: 14 },
  tickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  tickerTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  tickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  tickerLine: { fontSize: 12.5, flex: 1 },
  tickerTime: { fontSize: 11, fontWeight: '700' },
  tickerEmpty: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', padding: 8 },

  // Sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30, maxHeight: '80%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 22, fontWeight: '900' },
  sheetSub: { fontSize: 13, marginTop: 4, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 6, opacity: 0.85 },
  critRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  critLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  critValue: { fontSize: 13 },
  suspBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#dc2626', padding: 12, borderRadius: 10, marginBottom: 8 },
  suspTitle: { color: '#fff', fontWeight: '900', fontSize: 14 },
  suspBody: { color: '#fff', fontSize: 12.5, opacity: 0.9, marginTop: 2 },
  closeBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  closeBtnText: { fontWeight: '900', fontSize: 14 },

  // Export
  exportRow: { flexDirection: 'row', gap: 6, alignSelf: 'flex-end' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  exportText: { fontSize: 12, fontWeight: '800' },

  // Split
  split: { flex: 1, flexDirection: 'row' },
  splitLeft: { flex: 1, borderRightWidth: 1, maxWidth: 480 },
  splitRight: { flex: 1.6 },
});

export default ActivityTicker;
