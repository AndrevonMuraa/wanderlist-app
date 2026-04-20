import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Portal, Modal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';
import { STAT_DEFS } from '../utils/statDefs';

interface Row {
  user_id: string; name?: string; picture?: string; is_me: boolean;
  continents: number; destinations: number; landmarks: number; points: number;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  selectedFriendIds: string[];
}

/** Group stats modal: you + selected friends, combined + per-person stats. */
export default function GroupStatsModal({ visible, onDismiss, selectedFriendIds }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || selectedFriendIds.length === 0) return;
    setLoading(true);
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `${BACKEND_URL}/api/friends/group-stats?user_ids=${selectedFriendIds.join(',')}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) setRows((await res.json()).rows || []);
      } catch {} finally { setLoading(false); }
    })();
  }, [visible, selectedFriendIds.join(',')]);

  const maxByMetric = (key: string) => Math.max(...rows.map((r: any) => r[key] || 0), 0);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Group stats</Text>
          <TouchableOpacity onPress={onDismiss} data-testid="group-stats-close">
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ padding: 32 }} color={theme.colors.primary} />
        ) : (
          <>
            <View style={styles.avatarRow}>
              {rows.map((r) => (
                <TouchableOpacity
                  key={r.user_id}
                  style={styles.avatarCol}
                  activeOpacity={r.is_me ? 1 : 0.7}
                  onPress={() => {
                    if (r.is_me) return;
                    onDismiss();
                    router.push(`/user-profile/${r.user_id}`);
                  }}
                  data-testid={`group-avatar-${r.user_id}`}
                >
                  {r.picture ? (
                    <Image source={{ uri: r.picture }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInit}>{(r.name || '?').charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.avatarName} numberOfLines={1}>
                    {r.is_me ? 'You' : (r.name || '').split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {STAT_DEFS.map((def) => {
              const max = maxByMetric(def.key);
              return (
                <View key={def.key} style={styles.metricRow}>
                  <View style={styles.metricHead}>
                    <View style={[styles.iconWrap, { backgroundColor: `${def.color}18` }]}>
                      <Ionicons name={def.icon as any} size={15} color={def.color} />
                    </View>
                    <Text style={styles.metricLabel}>{def.label}</Text>
                  </View>
                  <View style={styles.valuesRow}>
                    {rows.map((r: any) => {
                      const v = r[def.key] || 0;
                      const isMax = v > 0 && v === max;
                      return (
                        <View key={r.user_id} style={styles.valueCol}>
                          <Text style={[styles.val, isMax && { color: def.color, fontWeight: '800' }]}>{v}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 16, borderRadius: 24, padding: 20,
    backgroundColor: theme.colors.background,
    maxHeight: '90%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.2 },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 22, paddingHorizontal: 40 },
  avatarCol: { alignItems: 'center', flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  avatarName: { fontSize: 12, fontWeight: '700', color: theme.colors.text, marginTop: 6, maxWidth: 60, textAlign: 'center' },
  metricRow: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(232,220,200,0.3)' },
  metricHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  valuesRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 40 },
  valueCol: { alignItems: 'center', flex: 1 },
  val: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
});
