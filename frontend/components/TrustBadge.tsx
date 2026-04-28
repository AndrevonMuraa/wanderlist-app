import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL } from '../utils/config';

const TRUST_COLOR = '#10B981';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem('auth_token');
  return await SecureStore.getItemAsync('auth_token');
};

interface TrustBadgeProps {
  trusted: boolean;
  size?: number;
  ownerOnly?: boolean; // When true, fetches own progress on tap
}

interface TrustStatus {
  trusted: boolean;
  criteria: Record<string, boolean>;
  progress: any;
  blocked_reasons: string[];
}

const CRITERIA_LABELS: Array<{ key: string; label: string; subtitle: (p: any) => string }> = [
  { key: 'account_age', label: 'Account 90+ days old', subtitle: (p) => `${p.account_days} / ${p.account_days_required} days` },
  { key: 'verified_visits', label: '10+ verified visits', subtitle: (p) => `${p.verified_visits_count} / ${p.verified_visits_required}` },
  { key: 'no_warnings', label: 'No warnings (last 90 days)', subtitle: (p) => p.warnings_in_window > 0 ? `${p.warnings_in_window} active` : 'Clean record' },
  { key: 'no_hidden', label: 'No hidden content (last 90 days)', subtitle: (p) => p.hidden_in_window > 0 ? `${p.hidden_in_window} hidden` : 'All public' },
  { key: 'not_suspended', label: 'Active in good standing', subtitle: (p) => p.is_banned ? 'Banned' : (p.is_suspended ? 'Suspended' : 'Active') },
  { key: 'engagement', label: 'Active engagement', subtitle: (p) => `${p.friends_count} friend${p.friends_count !== 1 ? 's' : ''} · ${p.likes_received} like${p.likes_received !== 1 ? 's' : ''}` },
];

export const TrustBadge: React.FC<TrustBadgeProps> = ({ trusted, size = 14, ownerOnly = false }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TrustStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const openSheet = async () => {
    setOpen(true);
    if (ownerOnly && !status) {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/users/me/trust`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setStatus(await res.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  };

  if (!trusted && !ownerOnly) return null;

  return (
    <>
      <TouchableOpacity
        onPress={openSheet}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID="trust-badge"
      >
        <Ionicons
          name={trusted ? 'shield-checkmark' : 'shield-checkmark-outline'}
          size={size}
          color={trusted ? TRUST_COLOR : '#9CA3AF'}
        />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setOpen(false)} style={styles.overlay}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} testID="trust-sheet">
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="shield-checkmark" size={28} color={TRUST_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Trusted Traveler</Text>
                <Text style={styles.subtitle}>90 days of clean, verified contribution</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} testID="trust-sheet-close">
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {ownerOnly ? (
              loading ? (
                <ActivityIndicator color={TRUST_COLOR} style={{ marginVertical: 24 }} />
              ) : status ? (
                <View style={{ marginTop: 8 }}>
                  {CRITERIA_LABELS.map((c) => {
                    const met = status.criteria[c.key];
                    return (
                      <View key={c.key} style={styles.row}>
                        <Ionicons
                          name={met ? 'checkmark-circle' : 'ellipse-outline'}
                          size={20}
                          color={met ? TRUST_COLOR : '#D1D5DB'}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.rowLabel, !met && { color: '#6B7280' }]}>{c.label}</Text>
                          <Text style={styles.rowSub}>{c.subtitle(status.progress)}</Text>
                        </View>
                      </View>
                    );
                  })}
                  {!status.trusted && (
                    <Text style={styles.footer}>
                      Keep contributing — your shield will appear on your profile, the leaderboard, and feed when you qualify.
                    </Text>
                  )}
                  {status.trusted && (
                    <Text style={[styles.footer, { color: TRUST_COLOR }]}>
                      You&apos;re trusted! Thanks for being a great community member.
                    </Text>
                  )}
                </View>
              ) : null
            ) : (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.bodyText}>
                  This member has earned the Trusted Traveler badge by maintaining a clean record and contributing verified content for 90+ days.
                </Text>
                <Text style={styles.bodyText}>
                  Earned by:
                </Text>
                {CRITERIA_LABELS.map((c) => (
                  <View key={c.key} style={styles.row}>
                    <Ionicons name="checkmark" size={18} color={TRUST_COLOR} />
                    <Text style={[styles.rowLabel, { flex: 1 }]}>{c.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 440,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rowLabel: { fontSize: 14, color: '#111827', fontWeight: '600' },
  rowSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  bodyText: { fontSize: 13, color: '#4B5563', lineHeight: 19, marginVertical: 6 },
  footer: { fontSize: 12, color: '#6B7280', marginTop: 14, lineHeight: 18, fontStyle: 'italic' },
});
