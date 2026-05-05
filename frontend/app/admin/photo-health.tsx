/**
 * Photo Health — admin tool to scan & repair broken Unsplash / external image URLs.
 * Super-admin only. Two-step flow: scan (read-only) → review → repair (destructive).
 *
 * Backend:
 *   GET  /api/admin/photos/healthcheck
 *   POST /api/admin/photos/healthcheck/repair
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../../utils/config';
import { getToken } from '../../utils/token';
import { useTheme } from '../../contexts/ThemeContext';

type ScanReport = {
  scanned: number;
  broken_count: number;
  broken_urls: string[];
  broken_by_collection: Record<string, string[]>;
};

type RepairReport = {
  scanned: number;
  broken_count: number;
  removed: Record<string, number>;
  verified_revoked: number;
  users_recomputed: number;
};

const COLLECTION_LABELS: Record<string, string> = {
  visits: 'Verified visits',
  user_created_visits: 'Custom visits',
  country_visits: 'Country visits',
  landmarks: 'Landmark covers',
  users: 'Profile photos',
};

const api = {
  get: async (path: string) => {
    const t = await getToken();
    const r = await fetch(`${BACKEND_URL}${path}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) {
      let detail = `HTTP ${r.status}`;
      try { const j = await r.json(); detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail); } catch (_e) { /* ignore */ }
      throw new Error(detail);
    }
    return r.json();
  },
  post: async (path: string) => {
    const t = await getToken();
    const r = await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    });
    if (!r.ok) {
      let detail = `HTTP ${r.status}`;
      try { const j = await r.json(); detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail); } catch (_e) { /* ignore */ }
      throw new Error(detail);
    }
    return r.json();
  },
};

export default function PhotoHealthScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [scan, setScan] = useState<ScanReport | null>(null);
  const [repair, setRepair] = useState<RepairReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setScanning(true); setError(null); setRepair(null);
    try {
      const r = await api.get('/api/admin/photos/healthcheck');
      setScan(r);
    } catch (e: any) {
      setError(e?.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => { runScan(); }, [runScan]);

  const confirmRepair = () => {
    if (!scan || scan.broken_count === 0) return;
    Alert.alert(
      `Remove ${scan.broken_count} broken photo URL${scan.broken_count === 1 ? '' : 's'}?`,
      'This deletes dead Unsplash / 404 image URLs from visits, landmarks, and user profiles. Visits that lose their last proof will be unverified and points recalculated.\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Repair now',
          style: 'destructive',
          onPress: async () => {
            setRepairing(true); setError(null);
            try {
              const r = await api.post('/api/admin/photos/healthcheck/repair');
              setRepair(r);
              // re-scan to refresh "remaining broken" view
              await runScan();
            } catch (e: any) {
              setError(e?.message || 'Repair failed');
            } finally {
              setRepairing(false);
            }
          },
        },
      ],
    );
  };

  const totalRemoved = repair
    ? Object.values(repair.removed).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      testID="photo-health-screen"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="photo-health-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Photo Health</Text>
      </View>

      {/* Status / scan summary */}
      <View
        style={[
          styles.statusCard,
          {
            backgroundColor:
              scan && scan.broken_count > 0 ? '#7f1d1d' : '#064e3b',
          },
        ]}
        testID="photo-health-status"
      >
        <Ionicons
          name={scan && scan.broken_count > 0 ? 'warning' : 'shield-checkmark'}
          size={32}
          color={scan && scan.broken_count > 0 ? '#fecaca' : '#a7f3d0'}
        />
        <Text style={styles.statusTitle}>
          {scanning && !scan ? 'Scanning…'
            : scan && scan.broken_count > 0 ? `${scan.broken_count} broken URL${scan.broken_count === 1 ? '' : 's'}`
            : 'All photos healthy'}
        </Text>
        {scan && (
          <Text style={styles.statusBody}>
            Scanned {scan.scanned.toLocaleString()} unique URL{scan.scanned === 1 ? '' : 's'} across visits, landmarks &amp; profiles.
          </Text>
        )}
      </View>

      {/* Per-collection breakdown */}
      {scan && scan.broken_count > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Where the breaks are</Text>
          {Object.entries(scan.broken_by_collection).map(([col, urls]) => (
            <View key={col} style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                {COLLECTION_LABELS[col] || col}
              </Text>
              <Text
                style={[styles.rowValue, { color: urls.length > 0 ? '#dc2626' : colors.text }]}
                testID={`photo-health-count-${col}`}
              >
                {urls.length}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Last repair result */}
      {repair && (
        <View style={[styles.card, { backgroundColor: colors.surface }]} testID="photo-health-result">
          <Text style={[styles.cardTitle, { color: colors.text }]}>Last repair</Text>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>URLs removed</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{totalRemoved}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Visits unverified</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{repair.verified_revoked}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Users recomputed</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{repair.users_recomputed}</Text>
          </View>
        </View>
      )}

      {error && <Text style={styles.error} testID="photo-health-error">{error}</Text>}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }, scanning && styles.disabled]}
          onPress={runScan}
          disabled={scanning || repairing}
          testID="photo-health-rescan-btn"
        >
          {scanning ? <ActivityIndicator color={colors.text} /> : (
            <>
              <Ionicons name="refresh" size={16} color={colors.text} />
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Rescan</Text>
            </>
          )}
        </TouchableOpacity>

        {scan && scan.broken_count > 0 && (
          <TouchableOpacity
            style={[styles.dangerBtn, repairing && styles.disabled]}
            onPress={confirmRepair}
            disabled={repairing || scanning}
            testID="photo-health-repair-btn"
          >
            {repairing ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="trash" size={16} color="#fff" />
                <Text style={styles.dangerBtnText}>Repair {scan.broken_count}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.footnote, { color: colors.textSecondary }]}>
        Repair is safe to re-run. Verified visits that lose their last photo become unverified and the
        owner&apos;s leaderboard points are recalculated automatically.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 50 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '900' },

  statusCard: {
    padding: 22, borderRadius: 16, alignItems: 'flex-start', gap: 6, marginBottom: 14,
  },
  statusTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 0.4, marginTop: 6, color: '#fff' },
  statusBody: { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.85)' },

  card: {
    padding: 18, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },

  actions: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 18 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtnText: { fontWeight: '700' },
  dangerBtn: {
    flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 999, backgroundColor: '#dc2626',
  },
  dangerBtnText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.5 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 8 },
  footnote: { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
});
