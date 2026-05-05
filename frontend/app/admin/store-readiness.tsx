/**
 * Store Readiness — live "can we submit Build N?" checklist for super-admins.
 *
 * Aggregates server-side checks (privacy/terms authored, demo reviewer,
 * super-admin, moderation queue, Photo Health freshness, Sentry, Pro users)
 * with client-side environment checks (backend URL points to prod, build
 * number, encryption flag).
 *
 * Backend: GET /api/admin/store-readiness  (super-admin only)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { BACKEND_URL } from '../../utils/config';
import { getToken } from '../../utils/token';
import { useTheme } from '../../contexts/ThemeContext';

type CheckStatus = 'ok' | 'warn' | 'fail';
type Check = { id: string; label: string; status: CheckStatus; hint?: string };
type Summary = {
  total: number;
  passed: number;
  warnings: number;
  failures: number;
  ready_to_submit: boolean;
};
type Report = { checks: Check[]; summary: Summary; generated_at: string };

const STATUS_META: Record<CheckStatus, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  ok:   { icon: 'checkmark-circle', color: '#10b981', label: 'Pass' },
  warn: { icon: 'alert-circle',     color: '#f59e0b', label: 'Warn' },
  fail: { icon: 'close-circle',     color: '#dc2626', label: 'Fail' },
};

const formatRelative = (iso?: string): string => {
  if (!iso) return '';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

const buildClientChecks = (): Check[] => {
  const checks: Check[] = [];

  // iOS-specific config is stripped from Constants.expoConfig on web/Android.
  // Only assert these when we're actually on the iOS runtime; otherwise mark
  // as informational warn so they don't trip the "ready to submit" gate from
  // a desktop preview session.
  const expoConfig = Constants.expoConfig as any;
  const onIOS = Platform.OS === 'ios';
  const buildNumber = expoConfig?.ios?.buildNumber as string | undefined;
  const versionName = expoConfig?.version as string | undefined;
  const usesNonExempt = expoConfig?.ios?.config?.usesNonExemptEncryption;

  if (onIOS) {
    checks.push({
      id: 'client-build-number',
      label: 'iOS build number set',
      status: buildNumber ? 'ok' : 'fail',
      hint: buildNumber ? `v${versionName} (${buildNumber})` : 'Set ios.buildNumber in app.json',
    });
    checks.push({
      id: 'client-encryption-flag',
      label: 'Encryption export flag declared',
      status: usesNonExempt === false ? 'ok' : 'warn',
      hint: usesNonExempt === false
        ? 'ITSAppUsesNonExemptEncryption=false (form auto-skipped)'
        : 'Set ios.config.usesNonExemptEncryption=false in app.json',
    });
  } else {
    checks.push({
      id: 'client-build-number',
      label: 'iOS build number (verified at EAS build)',
      status: 'warn',
      hint: `Currently viewing on ${Platform.OS} — verify in EAS build logs / TestFlight`,
    });
    checks.push({
      id: 'client-encryption-flag',
      label: 'Encryption export flag (verified at EAS build)',
      status: 'warn',
      hint: 'iOS-only check — confirm app.json has ios.config.usesNonExemptEncryption=false',
    });
  }

  // Backend URL must not be a preview URL — runs on every platform
  const backendUrl = BACKEND_URL || '';
  const isPreview = /\.preview\.emergentagent\.com/i.test(backendUrl);
  checks.push({
    id: 'client-backend-url',
    label: 'Backend URL points to production',
    status: backendUrl && !isPreview ? 'ok' : 'fail',
    hint: backendUrl
      ? (isPreview ? `Still on preview: ${backendUrl}` : backendUrl)
      : 'EXPO_PUBLIC_BACKEND_URL not set',
  });

  // Sentry frontend DSN
  const sentryDsn = (process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim();
  checks.push({
    id: 'client-sentry-frontend',
    label: 'Sentry DSN configured (frontend)',
    status: sentryDsn ? 'ok' : 'warn',
    hint: sentryDsn ? 'EXPO_PUBLIC_SENTRY_DSN set' : 'EXPO_PUBLIC_SENTRY_DSN missing — crashes won\'t be reported',
  });

  return checks;
};

export default function StoreReadinessScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientChecks = useMemo(buildClientChecks, []);

  const fetchReport = useCallback(async () => {
    setError(null);
    try {
      const token = await getToken();
      const r = await fetch(`${BACKEND_URL}/api/admin/store-readiness`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        let detail = `HTTP ${r.status}`;
        try { const j = await r.json(); detail = typeof j.detail === 'string' ? j.detail : detail; } catch (_e) { /* ignore */ }
        throw new Error(detail);
      }
      const data: Report = await r.json();
      setReport(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load readiness');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Combined summary blends server + client checks for the hero card
  const combined = useMemo(() => {
    const serverChecks = report?.checks ?? [];
    const all = [...serverChecks, ...clientChecks];
    const passed = all.filter((c) => c.status === 'ok').length;
    const warnings = all.filter((c) => c.status === 'warn').length;
    const failures = all.filter((c) => c.status === 'fail').length;
    return { total: all.length, passed, warnings, failures, ready: failures === 0 };
  }, [report, clientChecks]);

  const renderCheck = (c: Check) => {
    const meta = STATUS_META[c.status];
    return (
      <View key={c.id} style={[styles.checkRow, { borderBottomColor: colors.border }]} testID={`readiness-check-${c.id}`}>
        <Ionicons name={meta.icon} size={22} color={meta.color} style={styles.checkIcon} />
        <View style={styles.checkBody}>
          <Text style={[styles.checkLabel, { color: colors.text }]}>{c.label}</Text>
          {c.hint ? (
            <Text style={[styles.checkHint, { color: colors.textSecondary }]} numberOfLines={2}>{c.hint}</Text>
          ) : null}
        </View>
        <View style={[styles.statusPill, { backgroundColor: meta.color + '22' }]}>
          <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]} testID="readiness-loading">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Checking launch readiness…</Text>
      </View>
    );
  }

  const heroBg = combined.ready
    ? (combined.warnings === 0 ? '#064e3b' : '#854d0e')
    : '#7f1d1d';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchReport(); }}
          tintColor={colors.primary}
        />
      }
      testID="store-readiness-screen"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="readiness-back-btn">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Store Readiness</Text>
      </View>

      {/* Hero summary */}
      <View style={[styles.hero, { backgroundColor: heroBg }]} testID="readiness-hero">
        <Ionicons
          name={combined.ready ? (combined.warnings === 0 ? 'rocket' : 'rocket-outline') : 'warning'}
          size={36}
          color="#fff"
        />
        <Text style={styles.heroTitle} testID="readiness-hero-title">
          {combined.ready
            ? (combined.warnings === 0 ? 'Ready to submit' : 'Ready — with warnings')
            : `${combined.failures} blocker${combined.failures === 1 ? '' : 's'} before submit`}
        </Text>
        <Text style={styles.heroBody}>
          {combined.passed} passed · {combined.warnings} warning{combined.warnings === 1 ? '' : 's'} · {combined.failures} blocker{combined.failures === 1 ? '' : 's'} ({combined.total} total)
        </Text>
        {report?.generated_at ? (
          <Text style={styles.heroTimestamp}>Updated {formatRelative(report.generated_at)}</Text>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBox} testID="readiness-error">
          <Ionicons name="alert-circle" size={18} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Server-side checks */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Server checks</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]} testID="readiness-server-card">
        {(report?.checks ?? []).map(renderCheck)}
      </View>

      {/* Client-side checks */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Build &amp; environment</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]} testID="readiness-client-card">
        {clientChecks.map(renderCheck)}
      </View>

      {/* Manual actions still required */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Manual checklist (App Store Connect)</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {[
          'Privacy nutrition labels filled in (Email, Coarse Location, Photos, User Content, Identifiers, Diagnostics, Usage Data)',
          'Demo reviewer credentials added under "App Review" section (test@wandermark.app / Test1234!)',
          'Privacy URL + EULA URL added to App Information',
          'Screenshots uploaded for all required device classes',
          'Subscription Group + localized titles configured',
          'Export compliance: confirmed app uses standard encryption only',
        ].map((label, idx) => (
          <View key={idx} style={[styles.checkRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="square-outline" size={20} color={colors.textSecondary} style={styles.checkIcon} />
            <Text style={[styles.manualLabel, { color: colors.text }]}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.footnote, { color: colors.textSecondary }]}>
        Server checks refresh on pull-down. Client checks reflect the current build&apos;s app.json /
        environment variables — rebuild via EAS to update them.
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

  hero: {
    padding: 22, borderRadius: 18, alignItems: 'flex-start', gap: 4, marginBottom: 18,
  },
  heroTitle: {
    fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 8, letterSpacing: -0.3,
  },
  heroBody: {
    fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18, marginTop: 2,
  },
  heroTimestamp: {
    fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 6, fontWeight: '600', letterSpacing: 0.3,
  },

  sectionTitle: {
    fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase',
    opacity: 0.8, marginBottom: 8, marginTop: 4,
  },
  card: {
    borderRadius: 14, paddingHorizontal: 14, marginBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 1,
  },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkIcon: { width: 24, alignItems: 'center' },
  checkBody: { flex: 1, minWidth: 0 },
  checkLabel: { fontSize: 14.5, fontWeight: '700' },
  checkHint: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  manualLabel: { flex: 1, fontSize: 14, lineHeight: 19 },

  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  statusPillText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: '#fee2e2', padding: 10, borderRadius: 10, marginBottom: 12,
  },
  errorText: { color: '#7f1d1d', fontSize: 13, fontWeight: '700', flex: 1 },

  footnote: { fontSize: 12, lineHeight: 18, fontStyle: 'italic', marginTop: 4 },
});
