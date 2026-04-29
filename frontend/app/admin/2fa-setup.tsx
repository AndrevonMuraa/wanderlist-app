/**
 * Two-Factor (TOTP) setup screen.
 * Required for super-admin accounts; available to anyone who wants extra security.
 *
 * Flow:
 *   1. Status check  → already enabled? show disable/regenerate
 *   2. Setup         → POST /api/2fa/setup → show QR + manual secret
 *   3. Confirm code  → POST /api/2fa/confirm → reveal backup codes
 *   4. Done          → backup codes shown ONCE
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../../utils/config';
import { getToken } from '../../utils/token';
import { useTheme } from '../../contexts/ThemeContext';

type Status = {
  enabled: boolean;
  enabled_at: string | null;
  backup_codes_remaining: number;
  required: boolean;
};

type SetupData = {
  secret: string;
  otpauth_uri: string;
  qr_code_data_url: string;
  issuer: string;
  label: string;
};

const post = async (path: string, body?: any) => {
  const token = await getToken();
  const r = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let detail = 'Request failed';
    try { const j = await r.json(); detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail); } catch (_) { /* */ }
    throw new Error(detail);
  }
  return r.json();
};

const get = async (path: string) => {
  const token = await getToken();
  const r = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export default function TwoFASetupScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await get('/api/2fa/status');
      setStatus(s);
    } catch (e: any) {
      setError(e?.message || 'Could not load 2FA status');
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const beginSetup = async () => {
    setError(null); setBusy(true);
    try {
      const data = await post('/api/2fa/setup');
      setSetup(data);
    } catch (e: any) {
      setError(e?.message || 'Setup failed');
    } finally { setBusy(false); }
  };

  const confirmSetup = async () => {
    setError(null); setBusy(true);
    try {
      const r = await post('/api/2fa/confirm', { code: code.replace(/\s/g, '') });
      setBackupCodes(r.backup_codes);
      setSetup(null);
      setCode('');
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message || 'Invalid code');
    } finally { setBusy(false); }
  };

  const disable2FA = async () => {
    setError(null); setBusy(true);
    try {
      await post('/api/2fa/disable', { code: code.replace(/\s/g, '') });
      setCode('');
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message || 'Could not disable');
    } finally { setBusy(false); }
  };

  const regenerateCodes = async () => {
    setError(null); setBusy(true);
    try {
      const r = await post('/api/2fa/regenerate-backup-codes', { code: code.replace(/\s/g, '') });
      setBackupCodes(r.backup_codes);
      setCode('');
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message || 'Could not regenerate');
    } finally { setBusy(false); }
  };

  const copySecret = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Copied', 'Secret copied to clipboard.');
      }
    } catch (_) {}
  };

  if (!status) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      testID="two-fa-screen"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="two-fa-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Two-Factor Authentication</Text>
      </View>

      {status.required && !status.enabled && (
        <View style={[styles.banner, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
          <Ionicons name="warning" size={16} color="#b45309" />
          <Text style={styles.bannerText}>
            Required for super-admin accounts. Set up within the grace period to keep access.
          </Text>
        </View>
      )}

      {/* === Backup codes shown after confirm/regenerate === */}
      {backupCodes && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Save these backup codes
          </Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Each code can be used once if you lose your authenticator. They will not be shown again.
          </Text>
          <View style={styles.codeGrid}>
            {backupCodes.map((c) => (
              <Text key={c} style={[styles.backupCode, { color: colors.text, backgroundColor: colors.background }]}>
                {c}
              </Text>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => copySecret(backupCodes.join('\n'))}
            testID="two-fa-copy-backup"
          >
            <Ionicons name="copy" size={14} color="#fff" />
            <Text style={styles.primaryBtnText}>Copy all codes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ghostBtn, { borderColor: colors.border }]}
            onPress={() => setBackupCodes(null)}
            testID="two-fa-backup-done"
          >
            <Text style={[styles.ghostBtnText, { color: colors.text }]}>I've saved them, continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* === Already enabled === */}
      {!backupCodes && status.enabled && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#10b981" />
              <Text style={styles.statusBadgeText}>Active</Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
              {status.backup_codes_remaining} backup codes remaining
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.text, marginTop: 18 }]}>
            Enter a code to manage 2FA
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="6-digit code or backup"
            placeholderTextColor={colors.textSecondary}
            keyboardType="default"
            autoCapitalize="characters"
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            testID="two-fa-code-input"
          />
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.dangerBtn, busy && styles.disabled]}
              onPress={disable2FA}
              disabled={busy}
              testID="two-fa-disable-btn"
            >
              <Text style={styles.dangerBtnText}>Disable 2FA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }, busy && styles.disabled]}
              onPress={regenerateCodes}
              disabled={busy}
              testID="two-fa-regen-btn"
            >
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={styles.primaryBtnText}>New backup codes</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* === In setup, showing QR === */}
      {!backupCodes && !status.enabled && setup && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>1. Scan with your authenticator app</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Use Google Authenticator, 1Password, Authy, or any TOTP app.
          </Text>

          <View style={styles.qrWrap}>
            <Image
              source={{ uri: setup.qr_code_data_url }}
              style={styles.qrImg}
              resizeMode="contain"
              testID="two-fa-qr"
            />
          </View>

          <Text style={[styles.cardTitle, { color: colors.text, marginTop: 14 }]}>
            …or enter this key manually
          </Text>
          <TouchableOpacity
            onPress={() => copySecret(setup.secret)}
            style={[styles.secretRow, { backgroundColor: colors.background, borderColor: colors.border }]}
            testID="two-fa-copy-secret"
          >
            <Text style={[styles.secretText, { color: colors.text }]}>{setup.secret}</Text>
            <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={[styles.cardTitle, { color: colors.text, marginTop: 18 }]}>2. Enter the 6-digit code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            testID="two-fa-confirm-code-input"
          />
          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, busy && styles.disabled]}
            onPress={confirmSetup}
            disabled={busy || code.length !== 6}
            testID="two-fa-confirm-btn"
          >
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="lock-closed" size={14} color="#fff" />
                <Text style={styles.primaryBtnText}>Activate</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* === Disabled, no setup in progress === */}
      {!backupCodes && !status.enabled && !setup && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Ionicons name="shield-outline" size={36} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Add a second layer</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Even if your password leaks, your account stays protected. Takes 60 seconds with any authenticator app.
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, busy && styles.disabled]}
            onPress={beginSetup}
            disabled={busy}
            testID="two-fa-begin-btn"
          >
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="qr-code" size={14} color="#fff" />
                <Text style={styles.primaryBtnText}>Set up 2FA</Text>
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
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 16,
  },
  bannerText: { color: '#92400e', fontSize: 13, flex: 1, lineHeight: 17 },
  card: {
    padding: 18, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  cardBody: { fontSize: 13, lineHeight: 18 },
  qrWrap: { alignItems: 'center', marginVertical: 12, padding: 12, backgroundColor: '#fff', borderRadius: 10 },
  qrImg: { width: 220, height: 220 },
  secretRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, marginTop: 6,
  },
  secretText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, letterSpacing: 1 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 12,
    fontSize: 18, letterSpacing: 4, fontVariant: ['tabular-nums'], marginTop: 6,
  },
  error: { color: '#dc2626', fontSize: 13, marginTop: 8 },
  primaryBtn: {
    flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 999, marginTop: 14,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  ghostBtn: {
    paddingVertical: 12, borderRadius: 999, alignItems: 'center', marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ghostBtnText: { fontWeight: '700' },
  dangerBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center',
    backgroundColor: '#fee2e2',
  },
  dangerBtnText: { color: '#b91c1c', fontWeight: '800' },
  disabled: { opacity: 0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  statusBadgeText: { color: '#047857', fontWeight: '800', fontSize: 12 },
  codeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  backupCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13, fontWeight: '700', letterSpacing: 1.2,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    minWidth: '47%', textAlign: 'center',
  },
});
