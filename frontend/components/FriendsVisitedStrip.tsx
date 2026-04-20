import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';

interface FriendWhoVisited {
  user_id: string;
  name?: string;
  username?: string;
  picture?: string;
}

interface FriendsVisitedStripProps {
  landmarkId: string;
}

/**
 * Compact "X of your friends have been here" strip shown on a landmark page.
 * Shows up to 4 friend avatars + a text summary. Silent when nobody matches
 * (feature surfaces only when there's a real connection to highlight).
 */
export default function FriendsVisitedStrip({ landmarkId }: FriendsVisitedStripProps) {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendWhoVisited[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/landmarks/${landmarkId}/friends-visited?limit=4`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          setFriends(d.friends || []);
          setTotal(d.total || 0);
        }
      } catch {}
    })();
  }, [landmarkId]);

  if (total === 0) return null;

  // Build a human copy like "Anna and Ola", "Anna, Ola and 2 others"
  const firstNames = friends.slice(0, 2).map((f) => (f.name || '').split(' ')[0]).filter(Boolean);
  let summary: string;
  if (total === 1) {
    summary = `${firstNames[0] || 'A friend'} has also been here`;
  } else if (total === 2) {
    summary = `${firstNames.join(' and ')} have also been here`;
  } else if (firstNames.length >= 2) {
    summary = `${firstNames.join(', ')} and ${total - firstNames.length} others have been here`;
  } else {
    summary = `${total} of your friends have been here`;
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => friends[0]?.user_id && router.push(`/user-profile/${friends[0].user_id}`)}
      activeOpacity={0.88}
      data-testid="friends-visited-strip"
    >
      <View style={styles.avatarStack}>
        {friends.slice(0, 4).map((f, idx) => (
          <View
            key={f.user_id}
            style={[styles.avatarWrap, { marginLeft: idx === 0 ? 0 : -10, zIndex: 4 - idx }]}
          >
            {f.picture ? (
              <Image source={{ uri: f.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {(f.name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.kicker}>Shared with friends</Text>
        <Text style={styles.summary} numberOfLines={2}>{summary}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    borderRadius: 100,
    borderWidth: 2.5,
    borderColor: theme.colors.surface,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summary: {
    fontSize: 13.5,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 3,
    lineHeight: 18,
  },
});
