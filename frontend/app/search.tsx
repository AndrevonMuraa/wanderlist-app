import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TextInput, FlatList, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { Text, Surface, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import { BACKEND_URL } from '../utils/config';
import debounce from 'lodash.debounce';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface Landmark {
  landmark_id: string;
  name: string;
  country_name: string;
  continent: string;
  points: number;
  difficulty: string;
  is_visited?: boolean;
}

type FilterType = 'all' | 'visited' | 'unvisited';
type SortType = 'name' | 'points' | 'country';

export default function SearchScreen() {
  const router = useRouter();
  const { colors, gradientColors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [filteredLandmarks, setFilteredLandmarks] = useState<Landmark[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('name');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getToken();
      
      // Fetch all landmarks and visits in parallel
      const [landmarksRes, visitsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/landmarks/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BACKEND_URL}/api/visits`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (landmarksRes.ok) {
        const data = await landmarksRes.json();
        setLandmarks(data);
        setFilteredLandmarks(data);
      }

      if (visitsRes.ok) {
        const visits = await visitsRes.json();
        const visitedSet = new Set<string>(visits.map((v: any) => v.landmark_id));
        setVisitedIds(visitedSet);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearching(true);
      applyFilters(query, filter, sortBy);
      setSearching(false);
    }, 300),
    [landmarks, visitedIds, filter, sortBy]
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const applyFilters = (query: string, filterType: FilterType, sort: SortType) => {
    let results = [...landmarks];

    // Apply search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (l) =>
          l.name.toLowerCase().includes(lowerQuery) ||
          l.country_name.toLowerCase().includes(lowerQuery) ||
          l.continent.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply visited filter
    if (filterType === 'visited') {
      results = results.filter((l) => visitedIds.has(l.landmark_id));
    } else if (filterType === 'unvisited') {
      results = results.filter((l) => !visitedIds.has(l.landmark_id));
    }

    // Apply sorting
    results.sort((a, b) => {
      switch (sort) {
        case 'points':
          return b.points - a.points;
        case 'country':
          return a.country_name.localeCompare(b.country_name);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredLandmarks(results);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    applyFilters(searchQuery, newFilter, sortBy);
  };

  const handleSortChange = (newSort: SortType) => {
    setSortBy(newSort);
    applyFilters(searchQuery, filter, newSort);
  };

  const renderLandmarkItem = ({ item }: { item: Landmark }) => {
    const isVisited = visitedIds.has(item.landmark_id);
    
    return (
      <TouchableOpacity
        style={[styles.landmarkCard, { backgroundColor: colors.surface }]}
        onPress={() => router.push(`/landmarks/${item.landmark_id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.landmarkContent}>
          <View style={styles.landmarkHeader}>
            <Text style={[styles.landmarkName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {isVisited && (
              <View style={[styles.visitedBadge, { backgroundColor: '#10b981' }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.landmarkMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.country_name}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="globe-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.continent}</Text>
            </View>
          </View>
        </View>
        <View style={styles.landmarkRight}>
          <View style={[styles.pointsBadge, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="star" size={14} color={colors.primary} />
            <Text style={[styles.pointsText, { color: colors.primary }]}>{item.points}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </View>
      </TouchableOpacity>
    );
  };

  const FilterChip = ({ label, value, active }: { label: string; value: FilterType; active: boolean }) => (
    <TouchableOpacity
      style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.surface }]}
      onPress={() => handleFilterChange(value)}
    >
      <Text style={[styles.filterChipText, { color: active ? '#fff' : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  const SortChip = ({ label, value, icon }: { label: string; value: SortType; icon: keyof typeof Ionicons.glyphMap }) => (
    <TouchableOpacity
      style={[styles.sortChip, { backgroundColor: sortBy === value ? colors.primary + '20' : 'transparent' }]}
      onPress={() => handleSortChange(value)}
    >
      <Ionicons name={icon} size={14} color={sortBy === value ? colors.primary : colors.textSecondary} />
      <Text style={[styles.sortChipText, { color: sortBy === value ? colors.primary : colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={gradientColors}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Landmarks</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search landmarks, countries..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {searching && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <FilterChip label="All" value="all" active={filter === 'all'} />
          <FilterChip label={`Visited (${visitedIds.size})`} value="visited" active={filter === 'visited'} />
          <FilterChip label="Unvisited" value="unvisited" active={filter === 'unvisited'} />
        </View>
        <View style={[styles.sortRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort:</Text>
          <SortChip label="Name" value="name" icon="text-outline" />
          <SortChip label="Points" value="points" icon="star-outline" />
          <SortChip label="Country" value="country" icon="flag-outline" />
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading landmarks...</Text>
        </View>
      ) : (
        <>
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
              {filteredLandmarks.length} landmark{filteredLandmarks.length !== 1 ? 's' : ''} found
            </Text>
          </View>
          <FlatList
            data={filteredLandmarks}
            keyExtractor={(item) => item.landmark_id}
            renderItem={renderLandmarkItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No landmarks found</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Try a different search term or filter
                </Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    padding: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filtersContainer: {
    paddingHorizontal: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  landmarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  landmarkContent: {
    flex: 1,
  },
  landmarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  landmarkName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  visitedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landmarkMeta: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  landmarkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
