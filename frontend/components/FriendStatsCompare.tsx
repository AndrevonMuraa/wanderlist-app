import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';
import { STAT_DEFS } from '../utils/statDefs';

interface Stats {
  continents: number; destinations: number; landmarks: number; points: number;
}

interface Props {
  friendUserId: string;
  friendFirstName: string;
}

/**
 * "How you compare" — 4-row head-to-head stats card using the exact icons +
 * colors from the Journey page. Subtle bolding on the higher number — no
 * winner/loser labels.
 */
export default function FriendStatsCompare({ friendUserId, friendFirstName }: Props) {
  const [data, setData] = useState<{ me: Stats; friend: Stats } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/users/${friendUserId}/compare-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setData(await res.json());
      } catch {}
      finally { setLoading(false); }
    })();
  }, [friendUserId]);

  if (loading) {
    return <View style={styles.card}><ActivityIndicator size="small" color={theme.colors.primary} /></View>;
  }
  if (!data) return null;

  return (
    <View style={styles.card} data-testid="friend-stats-compare">
      <Text style={styles.kicker}>HOW YOU COMPARE</Text>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
        <Text style={styles.colHead}>You</Text>
        <Text style={styles.colHead}>{friendFirstName}</Text>
      </View>

      {STAT_DEFS.map((def) => {
        const myVal = data.me[def.key] || 0;
        const friendVal = data.friend[def.key] || 0;
        const meWins = myVal > friendVal;
        const friendWins = friendVal > myVal;
        return (
          <View key={def.key} style={styles.row} data-testid={`stat-row-${def.key}`}>
            <View style={[styles.iconWrap, { backgroundColor: `${def.color}18` }]}>
              <Ionicons name={def.icon as any} size={16} color={def.color} />
            </View>
            <Text style={styles.label}>{def.label}</Text>
            <View style={[styles.cell, meWins && styles.cellLeading]}>
              <Text style={[styles.value, meWins && styles.valueLeading]}>{myVal}</Text>
            </View>
            <View style={[styles.cell, friendWins && styles.cellLeading]}>
              <Text style={[styles.value, friendWins && styles.valueLeading]}>{friendVal}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 16,
    padding: 16, paddingBottom: 8,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 4,
  },
  kicker: {
    fontSize: 11, fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 1.4, textTransform: 'uppercase',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 36 + 14, // icon width + gap
    marginBottom: 4,
  },
  colHead: {
    width: 58, textAlign: 'center',
    fontSize: 11, fontWeight: '700',
    color: theme.colors.textLight,
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232, 220, 200, 0.3)',
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  label: { flex: 1, fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  cell: {
    width: 58, paddingVertical: 6,
    borderRadius: 10, alignItems: 'center',
  },
  cellLeading: {
    backgroundColor: 'rgba(201, 169, 97, 0.12)',
  },
  value: { fontSize: 15, color: theme.colors.text, fontWeight: '600' },
  valueLeading: { fontWeight: '800', color: theme.colors.primary },
});
