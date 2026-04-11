import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import UniversalHeader from '../components/UniversalHeader';
import { getToken } from '../utils/token';

const { width } = Dimensions.get('window');

export default function CommunityScreen() {
  const router = useRouter();
  const [highlights, setHighlights] = useState<any[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  const [topPhotos, setTopPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [hlRes, feedRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/community-highlights`, { headers }),
        fetch(`${BACKEND_URL}/api/community-feed?limit=20`, { headers }),
      ]);

      if (hlRes.ok) {
        const d = await hlRes.json();
        setHighlights(d.highlights || []);
      }
      if (feedRes.ok) {
        const d = await feedRes.json();
        const items = d.items || [];
        // Recent: by date
        setRecentPhotos(items.filter((i: any) => i.photo_url).slice(0, 8));
        // Top: by upvotes
        const sorted = [...items].sort((a: any, b: any) => (b.upvotes || 0) - (a.upvotes || 0));
        setTopPhotos(sorted.filter((i: any) => i.photo_url && (i.upvotes || 0) > 0).slice(0, 6));
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniversalHeader title="Community" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Trending Landmarks */}
        {highlights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flame" size={18} color="#E87850" />
              <Text style={styles.sectionTitle}>Trending landmarks</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {highlights.map((lm, i) => (
                <TouchableOpacity
                  key={lm.landmark_id || i}
                  style={styles.trendingCard}
                  onPress={() => router.push(`/landmark-community-photos/${lm.landmark_id}?name=${encodeURIComponent(lm.landmark_name)}&country=${encodeURIComponent(lm.country_name || '')}`)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: lm.sample_photo }} style={styles.trendingImage} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.trendingOverlay}>
                    <Text style={styles.trendingName} numberOfLines={1}>{lm.landmark_name}</Text>
                    <Text style={styles.trendingCountry} numberOfLines={1}>{lm.country_name}</Text>
                    <View style={styles.trendingStats}>
                      <View style={styles.trendingStat}>
                        <Ionicons name="people" size={11} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.trendingStatText}>{lm.visitor_count}</Text>
                      </View>
                      <View style={styles.trendingStat}>
                        <Ionicons name="images" size={11} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.trendingStatText}>{lm.total_photos}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Photos */}
        {recentPhotos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={18} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Recent photos</Text>
            </View>
            <View style={styles.photoGrid}>
              {recentPhotos.map((item, i) => (
                <TouchableOpacity
                  key={item.visit_id || i}
                  style={styles.photoGridItem}
                  onPress={() => router.push(`/landmark-community-photos/${item.landmark_id}?name=${encodeURIComponent(item.landmark_name)}&country=${encodeURIComponent(item.country_name || '')}`)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: item.photo_url }} style={styles.photoGridImage} resizeMode="cover" />
                  <View style={styles.photoGridOverlay}>
                    <Text style={styles.photoGridName} numberOfLines={1}>{item.landmark_name}</Text>
                    <View style={styles.photoGridMeta}>
                      <Text style={styles.photoGridUser} numberOfLines={1}>{item.user_name}</Text>
                      {(item.upvotes || 0) > 0 && (
                        <View style={styles.photoGridUpvote}>
                          <Ionicons name="heart" size={10} color="#FF6B6B" />
                          <Text style={styles.photoGridUpvoteText}>{item.upvotes}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Most Popular */}
        {topPhotos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={18} color="#FF6B6B" />
              <Text style={styles.sectionTitle}>Most popular</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {topPhotos.map((item, i) => (
                <TouchableOpacity
                  key={item.visit_id || i}
                  style={styles.popularCard}
                  onPress={() => router.push(`/landmark-community-photos/${item.landmark_id}?name=${encodeURIComponent(item.landmark_name)}&country=${encodeURIComponent(item.country_name || '')}`)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: item.photo_url }} style={styles.popularImage} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.popularOverlay}>
                    <Text style={styles.popularName} numberOfLines={1}>{item.landmark_name}</Text>
                    <View style={styles.popularMeta}>
                      <TouchableOpacity onPress={() => router.push(`/user-profile/${item.user_id}`)} activeOpacity={0.7}>
                        <Text style={styles.popularUser}>{item.user_name}</Text>
                      </TouchableOpacity>
                      <View style={styles.popularUpvote}>
                        <Ionicons name="heart" size={12} color="#FF6B6B" />
                        <Text style={styles.popularUpvoteText}>{item.upvotes}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Empty state */}
        {highlights.length === 0 && recentPhotos.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No community content yet</Text>
            <Text style={styles.emptyText}>Visit landmarks and share photos to appear here</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },

  // Trending
  trendingCard: { width: 170, height: 210, borderRadius: 16, overflow: 'hidden', ...theme.shadows.card },
  trendingImage: { width: '100%', height: '100%' },
  trendingOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 50, paddingBottom: 10, paddingHorizontal: 10,
  },
  trendingName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  trendingCountry: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
  trendingStats: { flexDirection: 'row', gap: 10, marginTop: 5 },
  trendingStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendingStatText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },

  // Photo Grid
  photoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 6,
  },
  photoGridItem: {
    width: (width - 44) / 2, height: 180, borderRadius: 14, overflow: 'hidden',
  },
  photoGridImage: { width: '100%', height: '100%' },
  photoGridOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 6,
  },
  photoGridName: { color: '#fff', fontSize: 12, fontWeight: '700' },
  photoGridMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  photoGridUser: { color: 'rgba(255,255,255,0.7)', fontSize: 10, flex: 1 },
  photoGridUpvote: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  photoGridUpvoteText: { color: '#FF6B6B', fontSize: 10, fontWeight: '600' },

  // Popular
  popularCard: { width: 220, height: 160, borderRadius: 14, overflow: 'hidden', ...theme.shadows.card },
  popularImage: { width: '100%', height: '100%' },
  popularOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 40, paddingBottom: 10, paddingHorizontal: 10,
  },
  popularName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  popularMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  popularUser: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  popularUpvote: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  popularUpvoteText: { color: '#FF6B6B', fontSize: 12, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
});
