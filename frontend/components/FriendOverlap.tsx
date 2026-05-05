import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';

interface OverlapItem {
  landmark_id: string;
  landmark_name?: string;
  country_name?: string;
  their_photo_url?: string;
  my_photo_url?: string;
  their_visited_at?: string;
  my_visited_at?: string;
}

interface FriendOverlapProps {
  friendUserId: string;
  friendName: string;
}

/**
 * "You've both been here" — renders the shared landmarks between the viewer
 * and the friend on the friend's profile. Only shown when users are friends
 * (backend enforces this and returns 403 otherwise).
 *
 * Design: Window Card with warm sand border + horizontal photo strip showing
 * the FRIEND's photo (not the viewer's) so viewing their profile still feels
 * like discovering THEIR content.
 */
export default function FriendOverlap({ friendUserId, friendName }: FriendOverlapProps) {
  const router = useRouter();
  const [items, setItems] = useState<OverlapItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/users/${friendUserId}/overlap?limit=12`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          setItems(d.items || []);
          setTotal(d.total || 0);
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, [friendUserId]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (total === 0) return null;

  const firstName = (friendName || '').split(' ')[0] || 'They';

  return (
    <View style={styles.card} testID="friend-overlap-card">
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="footsteps" size={17} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>You've both been here</Text>
          <Text style={styles.title}>
            {total} shared {total === 1 ? 'place' : 'places'}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {items.map((it) => (
          <TouchableOpacity
            key={it.landmark_id}
            style={styles.tile}
            onPress={() => router.push(`/compare/${it.landmark_id}/${friendUserId}`)}
            activeOpacity={0.85}
            testID={`overlap-${it.landmark_id}`}
          >
            <View style={styles.tileImageWrap}>
              {it.their_photo_url ? (
                <Image source={{ uri: it.their_photo_url }} style={styles.tileImage} />
              ) : (
                <View style={[styles.tileImage, styles.tileFallback]}>
                  <Ionicons name="location" size={22} color={theme.colors.textLight} />
                </View>
              )}
              <View style={styles.tileOverlay}>
                <Ionicons name="checkmark-circle" size={14} color="#FFD700" />
                <Text style={styles.tileBadge}>Both</Text>
              </View>
            </View>
            <Text style={styles.tileName} numberOfLines={1}>
              {it.landmark_name || 'Unknown'}
            </Text>
            {it.country_name && (
              <Text style={styles.tileCountry} numberOfLines={1}>{it.country_name}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {total > items.length && (
        <Text style={styles.footerHint}>
          + {total - items.length} more you've both visited
        </Text>
      )}
      <Text style={styles.subtleHint}>
        Tap a place to open it — see {firstName}'s photo and yours side by side
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 36, height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceTinted,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    alignItems: 'center', justifyContent: 'center',
  },
  kicker: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3, marginTop: 2 },
  strip: {
    gap: 10,
    paddingRight: 4,
  },
  tile: {
    width: 120,
  },
  tileImageWrap: {
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    position: 'relative',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileFallback: {
    backgroundColor: theme.colors.surfaceTinted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOverlay: {
    position: 'absolute',
    top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 100,
  },
  tileBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tileName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 7,
    letterSpacing: -0.1,
  },
  tileCountry: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  footerHint: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 12,
  },
  subtleHint: {
    fontSize: 11,
    color: theme.colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
