/**
 * Cmd+K command palette + global keyboard shortcuts (web/Mac only).
 *
 * Shortcuts:
 *   ⌘K / Ctrl+K  → open palette (fuzzy navigation)
 *   ?            → show shortcuts overlay
 *   g r          → /admin/reports
 *   g s          → /admin/store-readiness
 *   g e          → /admin/e2e-status
 *   g u          → /admin/users
 *   g t          → /admin/tickets
 *   g h          → /admin/photo-health
 *   g d          → /admin (dashboard)
 *
 * iOS / Android: this component renders nothing.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

type Cmd = { id: string; label: string; sub?: string; icon: keyof typeof Ionicons.glyphMap; route: string; keywords?: string };

const COMMANDS: Cmd[] = [
  { id: 'reports',    label: 'Reports queue',    sub: 'g r — moderation',     icon: 'flag-outline',          route: '/admin/reports',         keywords: 'moderation queue flag' },
  { id: 'tickets',    label: 'Support inbox',    sub: 'g t — tickets',        icon: 'mail-open-outline',     route: '/admin/tickets',         keywords: 'tickets support help' },
  { id: 'users',      label: 'Users',            sub: 'g u — admin',          icon: 'people-outline',        route: '/admin/users',           keywords: 'users members accounts' },
  { id: 'store',      label: 'Store Readiness',  sub: 'g s — App Store',      icon: 'rocket-outline',        route: '/admin/store-readiness', keywords: 'app store readiness launch' },
  { id: 'e2e',        label: 'E2E Seed Data',    sub: 'g e — wipe testdata',  icon: 'flask-outline',         route: '/admin/e2e-status',      keywords: 'e2e seed test data wipe' },
  { id: 'photos',     label: 'Photo Health',     sub: 'g h — broken URLs',    icon: 'images-outline',        route: '/admin/photo-health',    keywords: 'photos health broken images' },
  { id: 'security',   label: 'Security Dashboard', sub: '2FA · lockouts',     icon: 'speedometer-outline',   route: '/admin/security-dashboard', keywords: 'security 2fa lockout' },
  { id: '2fa',        label: 'Two-Factor Auth',  sub: 'enroll · backup codes', icon: 'shield-half-outline', route: '/admin/2fa-setup',       keywords: 'two-factor 2fa totp' },
  { id: 'lockdown',   label: 'Emergency Lockdown', sub: 'freeze admin actions', icon: 'lock-closed-outline', route: '/admin/lockdown',       keywords: 'emergency lockdown freeze' },
  { id: 'mod-act',    label: 'Moderator Activity', sub: 'audit dashboard',    icon: 'list-outline',          route: '/admin/moderator-activity', keywords: 'moderator activity audit' },
  { id: 'admin',      label: 'Admin home',       sub: 'g d — dashboard',      icon: 'home-outline',          route: '/admin',                 keywords: 'admin dashboard home' },
];

const fuzzyMatch = (q: string, c: Cmd): number => {
  const t = `${c.label} ${c.sub ?? ''} ${c.keywords ?? ''}`.toLowerCase();
  const ql = q.toLowerCase().trim();
  if (!ql) return 1;
  if (t.includes(ql)) return 2;
  // simple substring on words
  return ql.split(' ').every((w) => t.includes(w)) ? 1 : 0;
};

export const CommandPalette: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const close = useCallback(() => { setOpen(false); setQuery(''); setSelectedIdx(0); }, []);

  const run = useCallback((c: Cmd) => {
    close();
    router.push(c.route as any);
  }, [close, router]);

  // Web-only keyboard listener
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let pendingG = false;
    let gTimer: any = null;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      // Cmd+K / Ctrl+K — always trigger
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }

      if (isInput || open || showHelp) return;

      // ? — help overlay
      if (e.key === '?') { e.preventDefault(); setShowHelp(true); return; }

      // g + key sequences
      if (pendingG) {
        const map: Record<string, string> = {
          r: '/admin/reports',
          s: '/admin/store-readiness',
          e: '/admin/e2e-status',
          u: '/admin/users',
          t: '/admin/tickets',
          h: '/admin/photo-health',
          d: '/admin',
        };
        const route = map[e.key.toLowerCase()];
        pendingG = false;
        if (gTimer) clearTimeout(gTimer);
        if (route) {
          e.preventDefault();
          router.push(route as any);
        }
        return;
      }
      if (e.key === 'g' || e.key === 'G') {
        pendingG = true;
        gTimer = setTimeout(() => { pendingG = false; }, 1200);
      }
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); if (gTimer) clearTimeout(gTimer); };
  }, [open, showHelp, router]);

  if (Platform.OS !== 'web') return null;

  const filtered = COMMANDS
    .map((c) => ({ c, score: fuzzyMatch(query, c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);

  // --- Help overlay ---
  if (showHelp) {
    return (
      <Modal transparent animationType="fade" visible onRequestClose={() => setShowHelp(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowHelp(false)}>
          <View style={[styles.helpCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.helpTitle, { color: colors.text }]}>Keyboard shortcuts</Text>
            {[
              ['⌘ K  /  Ctrl K', 'Command palette'],
              ['?', 'Show this help'],
              ['g r', 'Reports queue'],
              ['g s', 'Store Readiness'],
              ['g e', 'E2E Seed Data'],
              ['g u', 'Users'],
              ['g t', 'Tickets'],
              ['g h', 'Photo Health'],
              ['g d', 'Admin home'],
            ].map(([k, v]) => (
              <View key={k} style={styles.helpRow}>
                <View style={[styles.kbd, { borderColor: colors.border }]}>
                  <Text style={[styles.kbdText, { color: colors.text }]}>{k}</Text>
                </View>
                <Text style={[styles.helpDesc, { color: colors.textSecondary }]}>{v}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={close}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} testID="cmdk-backdrop">
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.palette, { backgroundColor: colors.surface }]}>
          <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={(t) => { setQuery(t); setSelectedIdx(0); }}
              placeholder="Jump to… (try 'reports', 'lockdown', '2fa')"
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
              onKeyPress={(e: any) => {
                if (e.nativeEvent.key === 'Enter' && filtered[selectedIdx]) run(filtered[selectedIdx]);
                if (e.nativeEvent.key === 'ArrowDown') setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
                if (e.nativeEvent.key === 'ArrowUp') setSelectedIdx((i) => Math.max(0, i - 1));
                if (e.nativeEvent.key === 'Escape') close();
              }}
              testID="cmdk-input"
            />
            <View style={[styles.kbd, { borderColor: colors.border }]}><Text style={[styles.kbdText, { color: colors.textSecondary }]}>esc</Text></View>
          </View>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {filtered.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>No matches.</Text>
            ) : filtered.map((c, idx) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => run(c)}
                style={[styles.item, idx === selectedIdx && { backgroundColor: colors.background }]}
                testID={`cmdk-item-${c.id}`}
              >
                <Ionicons name={c.icon} size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, { color: colors.text }]}>{c.label}</Text>
                  {c.sub ? <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{c.sub}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 100 },
  palette: { width: '92%', maxWidth: 640, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 6 },
  list: { maxHeight: 380 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8 },
  itemLabel: { fontSize: 14.5, fontWeight: '700' },
  itemSub: { fontSize: 12, marginTop: 2 },
  empty: { padding: 18, textAlign: 'center', fontSize: 13 },
  kbd: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, minWidth: 30, alignItems: 'center' },
  kbdText: { fontSize: 11, fontWeight: '700' },
  helpCard: { width: '90%', maxWidth: 460, padding: 22, borderRadius: 14, gap: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16 },
  helpTitle: { fontSize: 18, fontWeight: '900', marginBottom: 8 },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  helpDesc: { fontSize: 13, fontWeight: '600' },
});

export default CommandPalette;
