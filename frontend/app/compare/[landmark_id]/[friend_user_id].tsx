import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import theme from '../../../styles/theme';
import { BACKEND_URL } from '../../../utils/config';
import { getToken } from '../../../utils/token';
import UniversalHeader from '../../../components/UniversalHeader';

interface Visit {
  visit_id: string; photos?: string[]; diary_notes?: string;
  updated_at?: string; visibility?: string;
}
interface Side {
  user_id: string; name?: string; username?: string; picture?: string;
  visits: Visit[]; photo_count?: number; has_private_visits?: boolean;
}
interface Data {
  landmark: { landmark_id: string; name?: string; country_name?: string; continent?: string; description?: string };
  me: Side; friend: Side;
}

function formatUpdated(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function PersonCard({ side, isMe, accentColor }: { side: Side; isMe: boolean; accentColor: string }) {
  const v = side.visits?.[0];
  const firstName = (side.name || '').split(' ')[0] || (isMe ? 'You' : 'Friend');
  const label = isMe ? 'You' : firstName;
  return (
    <View style={[styles.personCard, { borderTopColor: accentColor }]} data-testid={isMe ? 'compare-me' : 'compare-friend'}>
      <View style={styles.personHead}>
        {side.picture ? (
          <Image source={{ uri: side.picture }} style={styles.personAvatar} />
        ) : (
          <View style={[styles.personAvatar, styles.personAvatarFallback]}>
            <Text style={styles.personInitial}>{label.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.personLabel, { color: accentColor }]}>{label}</Text>
          {side.photo_count !== undefined && (
            <Text style={styles.personMeta}>
              {side.photo_count} {side.photo_count === 1 ? 'photo' : 'photos'}
              {v?.visibility === 'private' ? ' · Private' : ''}
            </Text>
          )}
        </View>
      </View>

      {v?.photos && v.photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
          {v.photos.map((p, idx) => (
            <Image key={idx} source={{ uri: p }} style={styles.photo} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noPhotos}>
          <Ionicons name="camera-outline" size={26} color={theme.colors.textLight} />
          <Text style={styles.noPhotosText}>No photos shared</Text>
        </View>
      )}

      {v?.diary_notes ? (
        <View style={styles.diary}>
          <Text style={styles.diaryText}>{v.diary_notes}</Text>
        </View>
      ) : null}

      {v?.updated_at && (
        <Text style={styles.updated}>Last updated {formatUpdated(v.updated_at)}</Text>
      )}

      {!isMe && side.has_private_visits && (
        <View style={styles.privateNote}>
          <Ionicons name="lock-closed" size={12} color={theme.colors.textLight} />
          <Text style={styles.privateText}>
            {firstName} has a private visit here — not shown.
          </Text>
        </View>
      )}

      {(!v || (!v.photos?.length && !v.diary_notes)) && !isMe && !side.has_private_visits && (
        <Text style={styles.emptyNote}>
          {firstName} hasn't shared anything yet from this place.
        </Text>
      )}
    </View>
  );
}

export default function CompareLandmark() {
  const { landmark_id, friend_user_id } = useLocalSearchParams<{ landmark_id: string; friend_user_id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `${BACKEND_URL}/api/compare/landmarks/${landmark_id}/friends/${friend_user_id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) { setData(await res.json()); }
        else if (res.status === 403) setErr('You can only compare with accepted friends.');
        else if (res.status === 404) setErr('Landmark not found.');
        else setErr('Could not load comparison.');
      } catch { setErr('Could not load comparison.'); }
      finally { setLoading(false); }
    })();
  }, [landmark_id, friend_user_id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="Shared place" showBack />
        <ActivityIndicator size="large" style={{ marginTop: 40 }} color={theme.colors.primary} />
      </View>
    );
  }
  if (err || !data) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="Shared place" showBack />
        <View style={styles.error}>
          <Ionicons name="alert-circle" size={36} color={theme.colors.textLight} />
          <Text style={styles.errorText}>{err || 'Not found'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniversalHeader title="Shared place" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View style={styles.hero} data-testid="compare-hero">
          <View style={styles.heroBadge}>
            <Ionicons name="people" size={12} color="#FFD700" />
            <Text style={styles.heroBadgeText}>Both of you have been here</Text>
          </View>
          <Text style={styles.heroTitle}>{data.landmark.name || 'Unknown'}</Text>
          {data.landmark.country_name && (
            <Text style={styles.heroSubtitle}>
              {data.landmark.country_name}{data.landmark.continent ? ` · ${data.landmark.continent}` : ''}
            </Text>
          )}
          <View style={styles.heroAvatars}>
            {[data.me, data.friend].map((s) => (
              <View key={s.user_id} style={styles.heroAvatarWrap}>
                {s.picture ? (
                  <Image source={{ uri: s.picture }} style={styles.heroAvatar} />
                ) : (
                  <View style={[styles.heroAvatar, styles.personAvatarFallback]}>
                    <Text style={styles.personInitial}>{(s.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <PersonCard side={data.me} isMe={true} accentColor={theme.colors.primary} />
        <PersonCard side={data.friend} isMe={false} accentColor={theme.colors.accentSand} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 80 },
  errorText: { color: theme.colors.textSecondary, fontSize: 14 },

  hero: {
    marginHorizontal: 16, marginTop: 14,
    padding: 22, borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 4,
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, marginBottom: 10,
  },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFD700', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.4, textAlign: 'center' },
  heroSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  heroAvatars: { flexDirection: 'row', gap: 6, marginTop: 14 },
  heroAvatarWrap: {
    shadowColor: theme.colors.accentSand,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 2,
  },
  heroAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: theme.colors.surface },

  personCard: {
    marginHorizontal: 16, marginTop: 14,
    padding: 18, borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.borderSand,
    borderTopWidth: 4,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 4,
  },
  personHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  personAvatar: { width: 44, height: 44, borderRadius: 22 },
  personAvatarFallback: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  personInitial: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  personLabel: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  personMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, fontWeight: '500' },

  photoStrip: { gap: 8, paddingRight: 4 },
  photo: { width: 160, height: 160, borderRadius: 12 },
  noPhotos: {
    alignItems: 'center', padding: 24, gap: 6,
    backgroundColor: theme.colors.surfaceTinted, borderRadius: 12,
  },
  noPhotosText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },

  diary: {
    marginTop: 14, padding: 12, borderRadius: 12,
    backgroundColor: theme.colors.surfaceTinted, borderWidth: 1, borderColor: theme.colors.borderSand,
  },
  diaryText: { fontSize: 13.5, color: theme.colors.text, lineHeight: 20 },

  updated: {
    marginTop: 10,
    fontSize: 10, color: theme.colors.textLight,
    fontStyle: 'italic',
  },
  privateNote: {
    marginTop: 12, padding: 10, borderRadius: 10,
    backgroundColor: theme.colors.surfaceTinted,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  privateText: { fontSize: 11, color: theme.colors.textSecondary, fontStyle: 'italic' },
  emptyNote: {
    marginTop: 10, fontSize: 12, color: theme.colors.textLight, fontStyle: 'italic', textAlign: 'center',
  },
});
