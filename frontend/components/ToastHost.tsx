/**
 * Cross-platform toast with optional Undo action.
 *
 * - Native: uses RN's Animated API to slide up a toast at the bottom.
 * - Web: same render, just relies on Animated for opacity (works on rnw).
 *
 * Single global mount (in `_layout.tsx`). Other code calls `showToast()`.
 *
 * Usage:
 *   showToast({ message: 'Visit hidden', actionLabel: 'Undo', onAction: () => api.restore(id), durationMs: 8000 });
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastSeverity = 'info' | 'success' | 'error' | 'warn';

export type ToastConfig = {
  message: string;
  severity?: ToastSeverity;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  durationMs?: number; // default 4000; if onAction → default 8000
};

type Listener = (cfg: ToastConfig | null) => void;

const listeners = new Set<Listener>();
let _seq = 0;

export const showToast = (cfg: ToastConfig) => {
  _seq += 1;
  listeners.forEach((l) => l(cfg));
};

const SEV_META: Record<ToastSeverity, { bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  info:    { bg: '#0f172a', icon: 'information-circle' },
  success: { bg: '#065f46', icon: 'checkmark-circle' },
  error:   { bg: '#7f1d1d', icon: 'close-circle' },
  warn:    { bg: '#78350f', icon: 'alert-circle' },
};

export const ToastHost: React.FC = () => {
  const [cfg, setCfg] = useState<ToastConfig | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(40)).current;
  const timer = useRef<any>(null);

  useEffect(() => {
    const onShow: Listener = (c) => {
      if (timer.current) clearTimeout(timer.current);
      setCfg(c);
    };
    listeners.add(onShow);
    return () => { listeners.delete(onShow); };
  }, []);

  useEffect(() => {
    if (!cfg) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const dur = cfg.durationMs ?? (cfg.onAction ? 8000 : 4000);
    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translate, { toValue: 40, duration: 200, useNativeDriver: true }),
      ]).start(() => setCfg(null));
    }, dur);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [cfg, opacity, translate]);

  if (!cfg) return null;
  const meta = SEV_META[cfg.severity ?? 'info'];

  const triggerAction = async () => {
    if (timer.current) clearTimeout(timer.current);
    try { await cfg.onAction?.(); } catch { /* swallow — caller handles errors */ }
    setCfg(null);
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.host, { opacity, transform: [{ translateY: translate }] }]}
      testID="toast-host"
    >
      <View style={[styles.toast, { backgroundColor: meta.bg }]} testID="toast">
        <Ionicons name={meta.icon} size={18} color="#fff" />
        <Text style={styles.message} numberOfLines={2}>{cfg.message}</Text>
        {cfg.actionLabel ? (
          <TouchableOpacity onPress={triggerAction} testID="toast-action">
            <Text style={styles.action}>{cfg.actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    left: 0, right: 0, bottom: 24,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, maxWidth: 420, minWidth: 280,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  message: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 },
  action: { color: '#fbbf24', fontWeight: '900', fontSize: 13, paddingHorizontal: 8, paddingVertical: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
});

export default ToastHost;
