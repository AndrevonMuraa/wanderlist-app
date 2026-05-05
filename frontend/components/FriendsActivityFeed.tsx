import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';

interface Activity {
  visit_id?: string; landmark_id?: string; landmark_name?: string;
  country_name?: string; photo_url?: string; updated_at?: string;
  user_id: string; user_name?: string; user_picture?: string;
}

/** Subtle friends-only activity feed — last visits/photo additions. */
export default function FriendsActivityFeed() {
  const router = useRouter();
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/friends/activity?limit=6`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setItems((await res.json()).items || []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return <View style={styles.card}><ActivityIndicator color={theme.colors.primary} /></View>;
  }
  if (items.length === 0) return null;

  return (
    <View style={styles.card} testID="friends-activity-feed">
      <Text style={styles.title}>Recent from your crew</Text>
      <View style={styles.list}>
        {items.map((a) => {
          const first = (a.user_name || '').split(' ')[0] || 'Someone';
          return (
            <TouchableOpacity
              key={a.visit_id || `${a.user_id}_${a.landmark_id}`}
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => a.visit_id && router.push(`/visit-detail/${a.visit_id}`)}
              testID={`activity-row-${a.visit_id}`}
            >
              <TouchableOpacity
                onPress={() => router.push(`/user-profile/${a.user_id}`)}
                activeOpacity={0.7}
                testID={`activity-avatar-${a.user_id}`}
              >
                {a.user_picture ? (
                  <Image source={{ uri: a.user_picture }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{first.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.summary} numberOfLines={2}>
                  <Text style={styles.nameText}>{first}</Text> visited{' '}
                  <Text style={styles.landmarkText}>{a.landmark_name || 'somewhere'}</Text>
                  {a.country_name ? ` in ${a.country_name}` : ''}
                </Text>
              </View>
              {a.photo_url ? (
                <Image source={{ uri: a.photo_url }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback]}>
                  <Ionicons name="location" size={16} color={theme.colors.textLight} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 14, padding: 16,
    borderRadius: 20, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 4,
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3, marginBottom: 12 },
  list: { gap: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232, 220, 200, 0.25)',
  },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  summary: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  nameText: { fontWeight: '700' },
  landmarkText: { fontWeight: '700', color: theme.colors.primary },
  thumb: { width: 42, height: 42, borderRadius: 10 },
  thumbFallback: { backgroundColor: theme.colors.surfaceTinted, alignItems: 'center', justifyContent: 'center' },
});
