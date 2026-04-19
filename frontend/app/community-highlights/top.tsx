import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import UniversalHeader from '../../components/UniversalHeader';
import { getToken } from '../../utils/token';
import MediaCard from '../../components/MediaCard';

const { width } = Dimensions.get('window');
const COLS = 2;
const GRID_GAP = 12;
const CARD_WIDTH = (width - 16 * 2 - GRID_GAP) / COLS;

export default function CommunityHighlightsTopScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/community-highlights/top?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, []);

  const goToVisit = (item: any) => {
    if (item.source === 'landmark') {
      router.push(`/visit-detail/${item.visit_id}`);
    } else {
      router.push(`/country-visit-detail/${item.visit_id}`);
    }
  };

  return (
    <View style={styles.container}>
      <UniversalHeader title="Top 10 all-time" showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <Text style={styles.intro}>
          The community's most-loved photos, ranked purely by all-time likes.
        </Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={48} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>As the community shares more photos, the best ones will rise to the top.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map((item) => (
              <MediaCard
                key={`${item.source}-${item.visit_id}`}
                photoUrl={item.photo_url}
                title={item.landmark_name || 'Unknown place'}
                subtitle={item.country_name}
                userName={item.user_name}
                userPicture={item.user_picture}
                isCustom={item.source === 'custom'}
                likesCount={item.likes_count}
                commentsCount={item.comments_count}
                rankBadge={item.rank}
                onPress={() => goToVisit(item)}
                width={CARD_WIDTH}
                aspect={1.2}
                testID={`top-item-${item.rank}`}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  intro: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
});
