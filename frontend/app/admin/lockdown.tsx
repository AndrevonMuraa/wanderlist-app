/**
 * Emergency Lockdown — break-glass panel.
 * Super-admin only. Freezes all moderator/admin write actions across the app.
 * Disabling requires a fresh TOTP code (proof-of-possession).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../../utils/config';
import { getToken } from '../../utils/token';
import { useTheme } from '../../contexts/ThemeContext';
import { useBiometricGate } from '../../utils/biometricGate';

type LockdownState = {
  admin_lockdown: boolean;
  lockdown_started_at?: string;
  lockdown_started_by?: string;
};

const api = {
  get: async (path: string) => {
    const t = await getToken();
    const r = await fetch(`${BACKEND_URL}${path}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  post: async (path: string, body?: any) => {
    const t = await getToken();
    const r = await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(body || {}),
    });
    if (!r.ok) {
      let detail = `HTTP ${r.status}`;
      try { const j = await r.json(); detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail); } catch (_) { /* */ }
      throw new Error(detail);
    }
    return r.json();
  },
};

export default function LockdownScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [state, setState] = useState<LockdownState | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guard = useBiometricGate();

  const refresh = useCallback(async () => {
    try {
      setState(await api.get('/api/admin/lockdown/status'));
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const enable = () => {
    Alert.alert(
      'Enable Lockdown?',
      'This will INSTANTLY freeze ALL moderator and admin write actions (tier changes, bans, content hide/restore, warnings, suspensions, mod messages). Reads remain available so you can audit.\n\nLifting requires your 2FA code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Freeze everything',
          style: 'destructive',
          onPress: () => guard('Confirm emergency lockdown', async () => {
            setBusy(true); setError(null);
            try {
              const next = await api.post('/api/admin/lockdown/enable');
              setState(next);
            } catch (e: any) {
              setError(e?.message || 'Could not enable');
            } finally { setBusy(false); }
          }),
        },
      ],
    );
  };

  const disable = async () => {
    if (!code.trim()) {
      setError('Enter your 2FA code or backup code first.');
      return;
    }
    setBusy(true); setError(null);
    try {
      const next = await api.post('/api/admin/lockdown/disable', { code: code.replace(/\s/g, '') });
      setState(next);
      setCode('');
    } catch (e: any) {
      setError(e?.message || 'Could not lift lockdown');
    } finally { setBusy(false); }
  };

  if (!state) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isLocked = state.admin_lockdown;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      testID="lockdown-screen"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="lockdown-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Emergency Lockdown</Text>
      </View>

      <View
        style={[
          styles.statusCard,
          { backgroundColor: isLocked ? '#7f1d1d' : '#064e3b' },
        ]}
      >
        <Ionicons
          name={isLocked ? 'lock-closed' : 'shield-checkmark'}
          size={32}
          color={isLocked ? '#fecaca' : '#a7f3d0'}
        />
        <Text style={[styles.statusTitle, { color: '#fff' }]}>
          {isLocked ? 'LOCKDOWN ACTIVE' : 'System healthy'}
        </Text>
        <Text style={[styles.statusBody, { color: 'rgba(255,255,255,0.85)' }]}>
          {isLocked
            ? 'All moderator/admin write actions are frozen. Reads still available.'
            : 'No lockdown in effect. Moderation works normally.'}
        </Text>
        {isLocked && state.lockdown_started_at && (
          <Text style={styles.statusMeta}>
            Started {new Date(state.lockdown_started_at).toLocaleString()}
          </Text>
        )}
      </View>

      {!isLocked && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>When to use this</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            • Suspicious admin activity in audit logs{'\n'}
            • Tier-change quota exhausted by an unfamiliar IP{'\n'}
            • You suspect a moderator account is compromised{'\n'}
            • Anything that needs you to <Text style={{ fontWeight: '900' }}>stop the bleeding now</Text> while you investigate
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.dangerBtn, busy && styles.disabled]}
            onPress={enable}
            disabled={busy}
            testID="lockdown-enable-btn"
          >
            <Ionicons name="warning" size={16} color="#fff" />
            <Text style={styles.dangerBtnText}>Freeze all admin actions</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLocked && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Lift lockdown</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Enter a code from your authenticator app (or one of your backup codes).
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="6-digit code or backup"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            testID="lockdown-code-input"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, busy && styles.disabled]}
            onPress={disable}
            disabled={busy}
            testID="lockdown-disable-btn"
          >
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="lock-open" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>Lift lockdown</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 50 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '900' },

  statusCard: {
    padding: 22, borderRadius: 16, alignItems: 'flex-start', gap: 6, marginBottom: 14,
  },
  statusTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1, marginTop: 6 },
  statusBody: { fontSize: 13, lineHeight: 18 },
  statusMeta: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 6 },

  card: {
    padding: 18, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  cardBody: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 12,
    fontSize: 18, letterSpacing: 4, fontVariant: ['tabular-nums'], marginBottom: 8,
  },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 8 },
  primaryBtn: {
    flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 999,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  dangerBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 999, backgroundColor: '#dc2626',
  },
  dangerBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.5 },
  disabled: { opacity: 0.5 },
});
