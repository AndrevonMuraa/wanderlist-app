/**
 * TopHighlightsList — numbered top community photos with filter bar.
 *
 * Replaces the old dedicated "/community-highlights/top" page. Lives as a
 * section inside Community page. Renders #1 enlarged + #2..#N as a tighter list.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';
import theme from '../styles/theme';
import ContentMenu from './ContentMenu';
import { useAuth } from '../contexts/AuthContext';

type Scope = 'all' | 'month';
type Continent = 'All' | 'Europe' | 'Asia' | 'Americas' | 'Africa' | 'Oceania';

const CONTINENT_FILTERS: Continent[] = ['All', 'Europe', 'Asia', 'Americas', 'Africa', 'Oceania'];

interface Item {
  visit_id: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  source?: string;
  photo_url: string;
  landmark_name?: string;
  country_name?: string;
  continent?: string;
  likes_count: number;
  comments_count?: number;
}

export default function TopHighlightsList() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('all');
  const [continent, setContinent] = useState<Continent>('All');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams({ limit: '10', scope });
      if (continent !== 'All') params.append('continent', continent);
      const res = await fetch(`${BACKEND_URL}/api/community-highlights/top?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [scope, continent]);

  useEffect(() => { load(); }, [load]);

  const goToItem = (item: Item) => {
    if (item.source === 'custom') {
      router.push(`/country-visit-detail/${item.visit_id}` as any);
    } else {
      router.push(`/visit-detail/${item.visit_id}` as any);
    }
  };

  const renderRankBadge = (rank: number) => {
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold, silver, bronze
    const bg = rank <= 3 ? colors[rank - 1] : '#E5E7EB';
    const txt = rank <= 3 ? '#FFFFFF' : '#6B7280';
    return (
      <View style={[styles.rankBadge, { backgroundColor: bg }]}>
        <Text style={[styles.rankText, { color: txt }]}>#{rank}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={styles.scopeToggle}>
          <TouchableOpacity
            onPress={() => setScope('all')}
            style={[styles.scopeChip, scope === 'all' && styles.scopeChipActive]}
            data-testid="top-scope-all"
          >
            <Text style={[styles.scopeText, scope === 'all' && styles.scopeTextActive]}>All-time</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setScope('month')}
            style={[styles.scopeChip, scope === 'month' && styles.scopeChipActive]}
            data-testid="top-scope-month"
          >
            <Text style={[styles.scopeText, scope === 'month' && styles.scopeTextActive]}>This month</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.continentRow}
        >
          {CONTINENT_FILTERS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setContinent(c)}
              style={[styles.continentChip, continent === c && styles.continentChipActive]}
              data-testid={`top-continent-${c.toLowerCase()}`}
            >
              <Text style={[styles.continentText, continent === c && styles.continentTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="image-outline" size={28} color={theme.colors.textLight} />
          <Text style={styles.emptyText}>No public photos yet for this filter</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item, idx) => {
            const rank = idx + 1;
            const isFirst = rank === 1;
            const isOwn = user?.user_id === item.user_id;
            return (
              <TouchableOpacity
                key={item.visit_id}
                style={[styles.row, isFirst && styles.rowFirst]}
                onPress={() => goToItem(item)}
                activeOpacity={0.85}
                data-testid={`top-rank-${rank}`}
              >
                {renderRankBadge(rank)}
                <View style={[styles.imageWrap, isFirst && styles.imageWrapFirst]}>
                  <Image source={{ uri: item.photo_url }} style={styles.image} />
                  <View style={styles.menuOverlay}>
                    <ContentMenu
                      contentType="photo"
                      contentId={item.visit_id}
                      contentName={item.landmark_name}
                      ownerId={item.user_id}
                      ownerName={item.user_name}
                      isOwnContent={isOwn}
                      variant="overlay"
                      testID={`top-rank-${rank}-menu`}
                    />
                  </View>
                </View>
                <View style={styles.meta}>
                  <Text style={[styles.title, isFirst && styles.titleFirst]} numberOfLines={1}>
                    {item.landmark_name || 'Custom trip'}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>{item.country_name}</Text>
                  <View style={styles.metaRow}>
                    {item.user_picture ? (
                      <Image source={{ uri: item.user_picture }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Ionicons name="person" size={10} color="#FFF" />
                      </View>
                    )}
                    <Text style={styles.userName} numberOfLines={1}>{item.user_name}</Text>
                    <View style={styles.likes}>
                      <Ionicons name="heart" size={11} color="#FF4B6E" />
                      <Text style={styles.likesText}>{item.likes_count}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, marginTop: 8 },
  filterBar: { marginBottom: 12, gap: 8 },
  scopeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 100,
    padding: 3,
    alignSelf: 'flex-start',
    gap: 2,
  },
  scopeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  scopeChipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  scopeText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  scopeTextActive: { color: theme.colors.text },
  continentRow: { gap: 6, paddingVertical: 2 },
  continentChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    backgroundColor: '#FFFFFF',
  },
  continentChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  continentText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  continentTextActive: { color: '#FFFFFF' },
  loading: { paddingVertical: 24, alignItems: 'center' },
  empty: { paddingVertical: 28, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 12, color: theme.colors.textLight },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
  },
  rowFirst: {
    borderColor: '#FFD700',
    borderWidth: 1.5,
    backgroundColor: '#FFFEF7',
    padding: 10,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 11, fontWeight: '800' },
  imageWrap: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: theme.colors.borderSand,
    position: 'relative',
  },
  imageWrapFirst: { width: 80, height: 80 },
  image: { width: '100%', height: '100%' },
  menuOverlay: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  meta: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  titleFirst: { fontSize: 14 },
  subtitle: { fontSize: 11, color: theme.colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  avatar: { width: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.borderSand },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  userName: { fontSize: 10, color: theme.colors.textLight, flex: 1 },
  likes: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  likesText: { fontSize: 11, fontWeight: '600', color: theme.colors.text },
});
