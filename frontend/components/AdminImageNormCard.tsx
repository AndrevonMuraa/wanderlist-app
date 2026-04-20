import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL } from '../utils/config';
import { useTheme } from '../contexts/ThemeContext';

interface Stats {
  counters: { auto_resized: number; rejected: number };
  thresholds: {
    auto_resize_above_mb: number;
    reject_above_mb: number;
    target_dimension_px: number;
    jpeg_quality: number;
  };
}

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem('auth_token');
  return await SecureStore.getItemAsync('auth_token');
}

/**
 * Admin dashboard card for image-normalization observability.
 *
 * Powers the P5 defense-in-depth early-warning: high `auto_resized` means
 * client-side compression is being bypassed or failing; any `rejected`
 * count means real users are hitting the 5 MB hard ceiling.
 *
 * Counters reset on backend restart — see Sentry for long-term record.
 */
export default function AdminImageNormCard() {
  const { colors } = useTheme();
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const token = await getToken();
      const r = await fetch(`${BACKEND_URL}/api/admin/image-normalization-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(String(r.status));
      const body: Stats = await r.json();
      setData(body);
      setErr(null);
    } catch (e) {
      setErr('Could not load image stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }
  if (err || !data) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]} data-testid="admin-img-norm-error">
        <Text style={[styles.errText, { color: colors.textSecondary }]}>{err || 'No data'}</Text>
      </View>
    );
  }

  const { auto_resized, rejected } = data.counters;
  const total = auto_resized + rejected;
  const hasRejects = rejected > 0;
  const highVolume = auto_resized >= 50; // heuristic: >=50 resizes in one process is worth noticing

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]} data-testid="admin-img-norm-card">
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: '#C9A96120' }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#C9A961" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.title, { color: colors.text }]}>Image defense-in-depth</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Server-side compression since restart
          </Text>
        </View>
        <TouchableOpacity onPress={fetchStats} style={styles.refreshBtn} data-testid="admin-img-norm-refresh">
          <Ionicons name="refresh" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.counterRow}>
        <View style={styles.counterBlock}>
          <Text style={[
            styles.counterValue,
            { color: highVolume ? '#f59e0b' : colors.text },
          ]}>
            {auto_resized.toLocaleString()}
          </Text>
          <View style={styles.counterLabelRow}>
            <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
            <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Auto-resized</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.counterBlock}>
          <Text style={[
            styles.counterValue,
            { color: hasRejects ? '#ef4444' : colors.text },
          ]}>
            {rejected.toLocaleString()}
          </Text>
          <View style={styles.counterLabelRow}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Rejected (413)</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.counterBlock}>
          <Text style={[styles.counterValue, { color: colors.text }]}>{total.toLocaleString()}</Text>
          <View style={styles.counterLabelRow}>
            <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
            <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Total events</Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.borderSand || 'rgba(201,169,97,0.2)' }]}>
        <Text style={[styles.footerText, { color: colors.textLight || colors.textSecondary }]}>
          Resize &gt;{data.thresholds.auto_resize_above_mb} MB · Reject &gt;{data.thresholds.reject_above_mb} MB · {data.thresholds.target_dimension_px}px q{data.thresholds.jpeg_quality}
        </Text>
      </View>

      {hasRejects && (
        <View style={styles.alertBanner} data-testid="admin-img-norm-reject-banner">
          <Ionicons name="alert-circle" size={13} color="#ef4444" />
          <Text style={styles.alertText}>
            {rejected} user{rejected === 1 ? '' : 's'} hit the hard limit. Check Sentry for details.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.18)',
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 11, marginTop: 1, fontWeight: '500' },
  refreshBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
  },
  counterBlock: { flex: 1, paddingVertical: 4 },
  counterValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  counterLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  counterLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  divider: {
    width: 1,
    backgroundColor: 'rgba(201,169,97,0.16)',
    marginHorizontal: 8,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 10, fontWeight: '600', letterSpacing: 0.3,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  alertText: { fontSize: 11, color: '#ef4444', fontWeight: '600', flexShrink: 1 },
  errText: { fontSize: 12, textAlign: 'center' },
});
