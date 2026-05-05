import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';

interface Item {
  landmark_id: string; landmark_name?: string; country_name?: string;
  photo_url?: string; friend_count: number;
  friend_sample: Array<{ user_id: string; name?: string; picture?: string }>;
}

/** Horizontal strip of landmarks the viewer + ≥1 friend have visited. */
export default function SharedPlacesStrip() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/friends/shared-places?limit=12`, {
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
    <View style={styles.card} testID="shared-places-strip">
      <Text style={styles.title}>Places you've been — together</Text>
      <Text style={styles.hint}>Tap a place to compare your visit with a friend's</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {items.map((it) => {
          const firstFriend = it.friend_sample[0];
          return (
            <TouchableOpacity
              key={it.landmark_id}
              style={styles.tile}
              activeOpacity={0.85}
              onPress={() => {
                if (firstFriend?.user_id) {
                  router.push(`/compare/${it.landmark_id}/${firstFriend.user_id}`);
                } else {
                  router.push(`/landmark-detail/${it.landmark_id}`);
                }
              }}
              testID={`shared-tile-${it.landmark_id}`}
            >
              <View style={styles.imgWrap}>
                {it.photo_url ? (
                  <Image source={{ uri: it.photo_url }} style={styles.img} />
                ) : (
                  <View style={[styles.img, styles.imgFallback]}>
                    <Ionicons name="location" size={22} color={theme.colors.textLight} />
                  </View>
                )}
                <View style={styles.badge}>
                  <Ionicons name="people" size={10} color="#FFD700" />
                  <Text style={styles.badgeText}>+{it.friend_count}</Text>
                </View>
              </View>
              <Text style={styles.name} numberOfLines={1}>{it.landmark_name || 'Unknown'}</Text>
              {it.country_name && <Text style={styles.country} numberOfLines={1}>{it.country_name}</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3 },
  hint: { fontSize: 11, color: theme.colors.textLight, marginTop: 3, marginBottom: 12, fontStyle: 'italic' },
  strip: { gap: 10, paddingRight: 4 },
  tile: { width: 128 },
  imgWrap: {
    width: 128, height: 128, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.colors.borderSand,
    position: 'relative',
  },
  img: { width: '100%', height: '100%' },
  imgFallback: { backgroundColor: theme.colors.surfaceTinted, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 7, left: 7,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#FFD700', letterSpacing: 0.2 },
  name: { fontSize: 13, color: theme.colors.text, fontWeight: '700', marginTop: 7 },
  country: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
});
