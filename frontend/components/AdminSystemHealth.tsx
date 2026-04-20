import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL } from '../utils/config';
import { useTheme } from '../contexts/ThemeContext';

interface ImageNormData {
  counters: { auto_resized: number; rejected: number };
  thresholds: { auto_resize_above_mb: number; reject_above_mb: number };
}

interface AdminStatsShape {
  users: { banned: number; total: number; new_this_week: number };
  reports: { pending: number; total: number };
}

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem('auth_token');
  return await SecureStore.getItemAsync('auth_token');
}

type Severity = 'ok' | 'info' | 'warn' | 'alert';

function severityColor(s: Severity) {
  switch (s) {
    case 'alert': return '#ef4444';
    case 'warn': return '#f59e0b';
    case 'info': return '#3b82f6';
    default: return '#10b981';
  }
}

/**
 * Compact "System Health" grid for the admin dashboard — 2x2 tiles giving
 * a one-glance "is everything OK?" read across:
 *
 *   🛡️ Image defense  (auto_resized + rejected)
 *   🚩 Moderation     (pending reports)
 *   🚫 Banned users   (count vs total)
 *   📈 Weekly growth  (new signups this week)
 *
 * Tiles color their own icon circle by severity. Zero-state = green.
 */
export default function AdminSystemHealth({ adminStats }: { adminStats: AdminStatsShape | null }) {
  const { colors } = useTheme();
  const [imageNorm, setImageNorm] = useState<ImageNormData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchImageNorm = useCallback(async () => {
    try {
      const token = await getToken();
      const r = await fetch(`${BACKEND_URL}/api/admin/image-normalization-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setImageNorm(await r.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchImageNorm(); }, [fetchImageNorm]);

  if (loading || !imageNorm || !adminStats) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const { auto_resized, rejected } = imageNorm.counters;
  const pending = adminStats.reports.pending;
  const banned = adminStats.users.banned;
  const newWeek = adminStats.users.new_this_week;

  type Tile = {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string | number;
    subtitle: string;
    severity: Severity;
    testId?: string;
  };

  const tiles: Tile[] = [
    {
      key: 'image-defense',
      icon: 'shield-checkmark-outline',
      label: 'Image defense',
      value: rejected,
      subtitle: rejected > 0
        ? `rejected · ${auto_resized} resized`
        : auto_resized > 0 ? `${auto_resized} auto-resized` : 'all clean',
      severity: rejected > 0 ? 'alert' : auto_resized >= 50 ? 'warn' : 'ok',
      testId: 'health-image-defense',
    },
    {
      key: 'moderation',
      icon: 'flag-outline',
      label: 'Moderation',
      value: pending,
      subtitle: pending > 0 ? `pending · ${adminStats.reports.total} total` : 'queue empty',
      severity: pending >= 5 ? 'alert' : pending > 0 ? 'warn' : 'ok',
      testId: 'health-moderation',
    },
    {
      key: 'banned',
      icon: 'ban-outline',
      label: 'Banned',
      value: banned,
      subtitle: banned > 0 ? `of ${adminStats.users.total} users` : 'no bans',
      severity: banned > 0 ? 'info' : 'ok',
      testId: 'health-banned',
    },
    {
      key: 'weekly-growth',
      icon: 'trending-up-outline',
      label: 'New this week',
      value: newWeek,
      subtitle: newWeek > 0 ? 'signups' : 'no new users',
      severity: newWeek > 0 ? 'ok' : 'info',
      testId: 'health-growth',
    },
  ];

  return (
    <View style={styles.grid}>
      {tiles.map((t) => {
        const color = severityColor(t.severity);
        return (
          <View
            key={t.key}
            style={[styles.tile, { backgroundColor: colors.surface }]}
            data-testid={t.testId}
          >
            <View style={styles.tileHeader}>
              <View style={[styles.iconCircle, { backgroundColor: color + '18' }]}>
                <Ionicons name={t.icon} size={14} color={color} />
              </View>
              <Text style={[styles.tileLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {t.label}
              </Text>
            </View>
            <View style={styles.tileValueRow}>
              <Text style={[
                styles.tileValue,
                { color: t.severity === 'alert' ? color : colors.text },
              ]}>
                {typeof t.value === 'number' ? t.value.toLocaleString() : t.value}
              </Text>
              {t.severity === 'alert' && (
                <View style={[styles.severityDot, { backgroundColor: color }]} />
              )}
            </View>
            <Text style={[styles.tileSubtitle, { color: colors.textLight || colors.textSecondary }]} numberOfLines={1}>
              {t.subtitle}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  tile: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.14)',
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  iconCircle: {
    width: 22, height: 22, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flex: 1,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  severityDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  tileSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
