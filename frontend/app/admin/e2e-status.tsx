/**
 * E2E Seed Data — super-admin only.
 *
 * Shows how much namespaced (`_seed_source: "e2e"`) test data is currently
 * live in the production DB and lets the operator wipe it in one tap before
 * App Store review. Personas roster + per-collection counts at a glance.
 *
 * Backend: GET  /api/admin/e2e-status        (super-admin only)
 *          POST /api/admin/e2e-status/wipe   (super-admin only)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../../utils/config';
import { getToken } from '../../utils/token';
import { useTheme } from '../../contexts/ThemeContext';

type Count = { collection: string; label: string; count: number };
type Persona = {
  user_id: string;
  email: string;
  username?: string;
  role: string;
  subscription_tier?: string;
  trusted_traveler?: boolean;
  is_suspended?: boolean;
  suspended_until?: string | null;
  points?: number;
};
type Status = {
  tag: string;
  total: number;
  counts: Count[];
  hidden_visits: number;
  personas: Persona[];
  personas_count: number;
  generated_at: string;
};

const formatRelative = (iso?: string): string => {
  if (!iso) return '';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const diff = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const PERSONA_COLOR: Record<string, string> = {
  admin: '#dc2626',
  moderator: '#f59e0b',
  user: '#3b82f6',
};

export default function E2EStatusScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/e2e-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: Status = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load e2e status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const confirmWipe = () => {
    const message = `This will permanently delete ALL namespaced e2e seed data:\n\n• ${data?.total ?? 0} document(s) across ${data?.counts.length ?? 0} collections\n• ${data?.hidden_visits ?? 0} hidden visit(s)\n\nUser accounts (logins) will be PRESERVED. Real production users are never touched.\n\nThis cannot be undone. Continue?`;
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(message)) doWipe();
      return;
    }
    Alert.alert(
      'Wipe E2E seed data?',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Wipe', style: 'destructive', onPress: doWipe },
      ],
    );
  };

  const doWipe = async () => {
    setWiping(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/e2e-status/wipe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const summary = `Removed ${json.deleted_total} document(s).\nUser logins preserved.`;
      if (Platform.OS === 'web') window.alert(summary);
      else Alert.alert('E2E data wiped', summary);
      await fetchStatus();
    } catch (e: any) {
      const msg = e?.message ?? 'Wipe failed';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Wipe failed', msg);
    } finally {
      setWiping(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]} testID="e2e-status-loading">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Counting e2e seed data…</Text>
      </View>
    );
  }

  const isClean = (data?.total ?? 0) === 0;
  const heroBg = isClean ? '#064e3b' : '#0f766e';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchStatus(); }}
          tintColor={colors.primary}
        />
      }
      testID="e2e-status-screen"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="e2e-back-btn">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>E2E Seed Data</Text>
      </View>

      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: heroBg }]} testID="e2e-hero">
        <Ionicons name={isClean ? 'sparkles' : 'flask'} size={36} color="#fff" />
        <Text style={styles.heroTitle} testID="e2e-hero-title">
          {isClean ? 'Clean — no e2e data live' : `${data?.total} e2e document(s) live`}
        </Text>
        <Text style={styles.heroBody}>
          {isClean
            ? 'Production DB is free of namespaced test artefacts. Safe to submit to App Store review.'
            : `${data?.personas_count ?? 0} test persona(s) · ${data?.hidden_visits ?? 0} hidden visit(s) · across ${data?.counts.length ?? 0} collection(s).`}
        </Text>
        {data?.generated_at ? (
          <Text style={styles.heroTimestamp}>Updated {formatRelative(data.generated_at)}</Text>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBox} testID="e2e-error">
          <Ionicons name="alert-circle" size={18} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Per-collection counts */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Document counts</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]} testID="e2e-counts-card">
        {(data?.counts ?? []).map((c) => (
          <View key={c.collection} style={[styles.row, { borderBottomColor: colors.border }]} testID={`e2e-count-${c.collection}`}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{c.label}</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{c.collection}</Text>
            </View>
            <View style={[styles.countPill, { backgroundColor: c.count > 0 ? '#0f766e22' : colors.border + '22' }]}>
              <Text style={[styles.countPillText, { color: c.count > 0 ? '#0f766e' : colors.textSecondary }]}>{c.count}</Text>
            </View>
          </View>
        ))}
        {(data?.hidden_visits ?? 0) > 0 ? (
          <View style={[styles.row, { borderBottomColor: colors.border }]} testID="e2e-hidden-row">
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Hidden visits (mod-banner UX)</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>visits where hidden=true</Text>
            </View>
            <View style={[styles.countPill, { backgroundColor: '#f59e0b22' }]}>
              <Text style={[styles.countPillText, { color: '#b45309' }]}>{data?.hidden_visits}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Personas roster */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Test personas</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]} testID="e2e-personas-card">
        {(data?.personas ?? []).length === 0 ? (
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>No e2e personas seeded yet.</Text>
          </View>
        ) : (
          (data?.personas ?? []).map((p) => {
            const tone = PERSONA_COLOR[p.role] ?? '#3b82f6';
            return (
              <View key={p.user_id} style={[styles.row, { borderBottomColor: colors.border }]} testID={`e2e-persona-${p.username ?? p.email}`}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>
                    {p.username ?? p.email}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {p.email}
                  </Text>
                </View>
                <View style={styles.badgeColumn}>
                  <View style={[styles.tagPill, { backgroundColor: tone + '22' }]}>
                    <Text style={[styles.tagPillText, { color: tone }]}>{p.role}</Text>
                  </View>
                  {p.subscription_tier ? (
                    <View style={[styles.tagPill, { backgroundColor: p.subscription_tier === 'pro' ? '#7c3aed22' : '#64748b22' }]}>
                      <Text style={[styles.tagPillText, { color: p.subscription_tier === 'pro' ? '#7c3aed' : '#475569' }]}>
                        {p.subscription_tier}
                      </Text>
                    </View>
                  ) : null}
                  {p.is_suspended ? (
                    <View style={[styles.tagPill, { backgroundColor: '#dc262622' }]}>
                      <Text style={[styles.tagPillText, { color: '#dc2626' }]}>suspended</Text>
                    </View>
                  ) : null}
                  {p.trusted_traveler ? (
                    <View style={[styles.tagPill, { backgroundColor: '#10b98122' }]}>
                      <Text style={[styles.tagPillText, { color: '#10b981' }]}>trusted</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* How to seed */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>How to (re)seed</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 14 }]}>
        <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Render shell</Text>
        <View style={[styles.codeBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.codeText, { color: colors.text }]} selectable>
            cd /opt/render/project/src/backend && python -m scripts.seed_e2e_data
          </Text>
        </View>
        <Text style={[styles.codeLabel, { color: colors.textSecondary, marginTop: 10 }]}>Wipe via CLI</Text>
        <View style={[styles.codeBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.codeText, { color: colors.text }]} selectable>
            python -m scripts.seed_e2e_data --wipe
          </Text>
        </View>
      </View>

      {/* Wipe button */}
      <TouchableOpacity
        style={[styles.wipeBtn, (isClean || wiping) && styles.disabled]}
        disabled={isClean || wiping}
        onPress={confirmWipe}
        testID="e2e-wipe-btn"
      >
        <Ionicons name="trash" size={18} color="#fff" />
        <Text style={styles.wipeBtnText}>
          {wiping ? 'Wiping…' : isClean ? 'Already clean' : `Wipe all ${data?.total} e2e document(s)`}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.footnote, { color: colors.textSecondary }]}>
        Wipe deletes only documents tagged <Text style={{ fontWeight: '800' }}>_seed_source: &ldquo;e2e&rdquo;</Text>.
        User logins are preserved so you can re-seed without recreating accounts.
        Real production users are never touched.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 50 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '900' },

  hero: { padding: 22, borderRadius: 18, alignItems: 'flex-start', gap: 4, marginBottom: 18 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 8, letterSpacing: -0.3 },
  heroBody: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18, marginTop: 2 },
  heroTimestamp: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 6, fontWeight: '600', letterSpacing: 0.3 },

  sectionTitle: {
    fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase',
    opacity: 0.8, marginBottom: 8, marginTop: 4,
  },
  card: {
    borderRadius: 14, paddingHorizontal: 14, marginBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 14.5, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2, opacity: 0.85 },

  countPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, minWidth: 36, alignItems: 'center' },
  countPillText: { fontSize: 13, fontWeight: '900' },

  badgeColumn: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, maxWidth: '55%' },
  tagPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagPillText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },

  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: '#fee2e2', padding: 10, borderRadius: 10, marginBottom: 12,
  },
  errorText: { color: '#7f1d1d', fontSize: 13, fontWeight: '700', flex: 1 },

  codeLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  codeBlock: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 10, marginTop: 4 },
  codeText: { fontSize: 12.5, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },

  wipeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#dc2626', paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: 14, marginTop: 4,
  },
  wipeBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.2 },
  disabled: { opacity: 0.5 },

  footnote: { fontSize: 12, lineHeight: 18, fontStyle: 'italic', marginTop: 16 },
});
