import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';
import { STAT_DEFS, StatDef } from '../utils/statDefs';

interface Row {
  user_id: string; name?: string; username?: string; picture?: string;
  is_me: boolean; value: number; rank: number;
}

/** "Who's leading?" — rank card on Friends hub with metric pill toggles. */
export default function FriendsLeaderboardCard() {
  const router = useRouter();
  const [metric, setMetric] = useState<StatDef['key']>('points');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/friends/leaderboard?metric=${metric}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) { const d = await res.json(); setRows(d.rows || []); }
      } catch {} finally { setLoading(false); }
    })();
  }, [metric]);

  if (!loading && rows.length <= 1) return null;

  const activeDef = STAT_DEFS.find((s) => s.key === metric)!;
  const medal = (r: number) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '');

  return (
    <View style={styles.card} testID="friends-leaderboard">
      <Text style={styles.title}>Who's leading?</Text>
      <View style={styles.pills}>
        {STAT_DEFS.map((s) => {
          const active = metric === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              onPress={() => setMetric(s.key)}
              style={[styles.pill, active && { borderColor: s.color, backgroundColor: `${s.color}14` }]}
              activeOpacity={0.8}
              testID={`leaderboard-pill-${s.key}`}
            >
              <Ionicons name={s.icon as any} size={13} color={active ? s.color : theme.colors.textSecondary} />
              <Text style={[styles.pillText, active && { color: s.color }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
      ) : (
        <View style={styles.rows}>
          {rows.slice(0, 5).map((r) => (
            <TouchableOpacity
              key={r.user_id}
              style={[styles.row, r.is_me && styles.rowMe]}
              onPress={() => !r.is_me && router.push(`/user-profile/${r.user_id}`)}
              activeOpacity={r.is_me ? 1 : 0.85}
              testID={`leaderboard-row-${r.user_id}`}
            >
              <Text style={styles.medal}>{medal(r.rank) || `${r.rank}.`}</Text>
              {r.picture ? (
                <Image source={{ uri: r.picture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{(r.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.name} numberOfLines={1}>{r.is_me ? 'You' : (r.name || 'Unknown')}</Text>
              <View style={styles.valueWrap}>
                <Text style={[styles.value, { color: activeDef.color }]}>{r.value}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 14, padding: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 4,
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3, marginBottom: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100,
    borderWidth: 1, borderColor: theme.colors.borderSand,
    backgroundColor: theme.colors.surfaceTinted,
  },
  pillText: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  rows: { marginTop: 14, gap: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 4, paddingVertical: 9,
    borderRadius: 12,
  },
  rowMe: { backgroundColor: 'rgba(30, 138, 138, 0.07)' },
  medal: { width: 26, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  name: { flex: 1, fontSize: 14, color: theme.colors.text, fontWeight: '600' },
  valueWrap: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, backgroundColor: theme.colors.surfaceTinted },
  value: { fontSize: 14, fontWeight: '800' },
});
