import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Image,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import UniversalHeader from '../components/UniversalHeader';
import SectionHeader from '../components/SectionHeader';
import MediaCard from '../components/MediaCard';
import CommunityHighlightHero from '../components/CommunityHighlightHero';
import TopHighlightsList from '../components/TopHighlightsList';
import { getToken } from '../utils/token';

const CARD_WIDTH = 170;
const CARD_ASPECT = 1.25;

export default function CommunityScreen() {
  const router = useRouter();
  const [highlights, setHighlights] = useState<any[]>([]);
  const [communityHighlight, setCommunityHighlight] = useState<any>(null);
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  const [topPhotos, setTopPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [hlRes, feedRes, singleHlRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/community-highlights`, { headers }),
        fetch(`${BACKEND_URL}/api/community-feed?limit=20`, { headers }),
        fetch(`${BACKEND_URL}/api/community-highlight`, { headers }),
      ]);
      if (hlRes.ok) {
        const d = await hlRes.json();
        setHighlights(d.highlights || []);
      }
      if (singleHlRes.ok) {
        const d = await singleHlRes.json();
        setCommunityHighlight(d.highlight || null);
      }
      if (feedRes.ok) {
        const d = await feedRes.json();
        const items = d.items || [];
        setRecentPhotos(items.filter((i: any) => i.photo_url).slice(0, 10));
        const sorted = [...items].sort((a: any, b: any) => (b.likes_count || 0) - (a.likes_count || 0));
        setTopPhotos(sorted.filter((i: any) => i.photo_url).slice(0, 10));
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="Community" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  const goToCommunityPhotos = (landmark: any) => {
    if (!landmark.landmark_id) return;
    router.push(`/landmark-community-photos/${landmark.landmark_id}?name=${encodeURIComponent(landmark.landmark_name || '')}&country=${encodeURIComponent(landmark.country_name || '')}`);
  };

  const goToFeedItem = (item: any) => {
    if (item.source === 'custom') {
      router.push(`/country-visit-detail/${item.visit_id}`);
    } else if (item.landmark_id) {
      goToCommunityPhotos({ landmark_id: item.landmark_id, landmark_name: item.landmark_name, country_name: item.country_name });
    }
  };

  return (
    <View style={styles.container}>
      <UniversalHeader title="Community" showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Community Highlight — real hero (taps go DIRECTLY to the featured
            visit, not to a separate page that re-fetches a different random
            highlight — this was the source of the "shape-shifting" bug). */}
        {communityHighlight ? (
          <>
            <SectionHeader
              icon="sparkles"
              iconColor={theme.colors.accentGold}
              title="Community highlight"
            />
            <CommunityHighlightHero
              highlight={communityHighlight}
              onPress={() => {
                if (communityHighlight.source === 'custom') {
                  router.push(`/country-visit-detail/${communityHighlight.visit_id}` as any);
                } else {
                  router.push(`/visit-detail/${communityHighlight.visit_id}` as any);
                }
              }}
            />
          </>
        ) : null}

        {/* Trending landmarks */}
        {highlights.length > 0 && (
          <>
            <SectionHeader icon="flame" iconColor="#E87850" title="Trending landmarks" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              snapToInterval={CARD_WIDTH + 12}
              decelerationRate="fast"
            >
              {highlights.map((lm, i) => (
                <MediaCard
                  key={lm.landmark_id || i}
                  photoUrl={lm.sample_photo}
                  title={lm.landmark_name}
                  subtitle={lm.country_name}
                  likesCount={lm.upvotes || 0}
                  onPress={() => goToCommunityPhotos(lm)}
                  width={CARD_WIDTH}
                  aspect={CARD_ASPECT}
                  testID={`trending-${i}`}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Recent photos */}
        {recentPhotos.length > 0 && (
          <>
            <SectionHeader
              icon="time"
              iconColor={theme.colors.primary}
              title="Recent photos"
              onSeeAll={() => router.push('/feed')}
              seeAllTestId="recent-photos-see-all"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              snapToInterval={CARD_WIDTH + 12}
              decelerationRate="fast"
            >
              {recentPhotos.map((item, i) => (
                <MediaCard
                  key={item.visit_id || i}
                  photoUrl={item.photo_url}
                  title={item.landmark_name}
                  subtitle={item.country_name}
                  userName={item.user_name}
                  userPicture={item.user_picture}
                  isCustom={item.source === 'custom'}
                  likesCount={item.likes_count || 0}
                  commentsCount={item.comments_count || 0}
                  onPress={() => goToFeedItem(item)}
                  width={CARD_WIDTH}
                  aspect={CARD_ASPECT}
                  testID={`recent-${i}`}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Top Community Highlights — numbered list (#1 emphasized) with
            scope (all-time/month) + continent filter. Replaces the
            previous "Most popular" carousel and the dedicated /community-highlights/top page. */}
        <SectionHeader
          icon="trophy"
          iconColor="#FFD700"
          title="Top community highlights"
        />
        <TopHighlightsList />

        {/* Empty state */}
        {highlights.length === 0 && recentPhotos.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No community content yet</Text>
            <Text style={styles.emptyText}>Visit landmarks and share photos to appear here</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Featured link fallback (only shown when no dynamic highlight is loaded)
  featuredLink: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  featuredGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    marginBottom: 8,
  },
  featuredBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  featuredTitle: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  featuredSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 3 },

  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingRight: 28,
  },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
});
