import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Platform, Modal, Image } from 'react-native';
import { Text, TextInput, Surface, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKEND_URL } from '../utils/config';
import theme from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface Landmark {
  landmark_id: string;
  name: string;
  country_name: string;
  continent: string;
  description: string;
  image_url: string;
  points: number;
  category: string;
  is_locked: boolean;
}

interface Filters {
  visited: 'all' | 'true' | 'false';
  category: 'all' | 'free' | 'premium';
  sortBy: 'upvotes_desc' | 'points_desc' | 'points_asc' | 'name_asc' | 'name_desc';
  continent: string | null;
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    visited: 'all',
    category: 'all',
    sortBy: 'upvotes_desc',
    continent: null
  });
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    searchLandmarks();
  }, [filters]);

  const searchLandmarks = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      
      // Build query params
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.visited !== 'all') params.append('visited', filters.visited);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.sortBy) params.append('sort_by', filters.sortBy);
      if (filters.continent) params.append('continent', filters.continent);
      
      const response = await fetch(`${BACKEND_URL}/api/landmarks?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLandmarks(data);
      }
    } catch (error) {
      console.error('Error searching landmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    searchLandmarks();
  };

  const clearFilters = () => {
    setFilters({
      visited: 'all',
      category: 'all',
      sortBy: 'upvotes_desc',
      continent: null
    });
    setSearchQuery('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.visited !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.sortBy !== 'upvotes_desc') count++;
    if (filters.continent) count++;
    if (searchQuery) count++;
    return count;
  };

  const renderLandmarkCard = ({ item }: { item: Landmark }) => (
    <TouchableOpacity
      onPress={() => router.push(`/landmark-detail/${item.landmark_id}`)}
      activeOpacity={0.7}
    >
      <Surface style={styles.landmarkCard}>
        <View style={styles.landmarkImage}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={{ width: '100%', height: '100%', borderRadius: 12 }}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={32} color="#ccc" />
            </View>
          )}
          {item.is_locked && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={16} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.landmarkInfo}>
          <Text style={styles.landmarkName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.landmarkCountry} numberOfLines={1}>
            {item.country_name}, {item.continent}
          </Text>
          <View style={styles.landmarkMeta}>
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={14} color={theme.colors.accentYellow} />
              <Text style={styles.pointsText}>{item.points} pts</Text>
            </View>
            {item.category === 'premium' && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={12} color={theme.colors.primary} />
                <Text style={styles.premiumText}>Premium</Text>
              </View>
            )}
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#3BB8C3', '#2AA8B3']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Landmarks</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search landmarks, countries..."
            style={styles.searchInput}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={24} color={theme.colors.primary} />
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Chips */}
      {getActiveFilterCount() > 0 && (
        <View style={styles.activeFilters}>
          {searchQuery && <Chip style={styles.filterChip} textStyle={styles.chipText}>Search: {searchQuery}</Chip>}
          {filters.visited !== 'all' && <Chip style={styles.filterChip} textStyle={styles.chipText}>{filters.visited === 'true' ? 'Visited' : 'Not Visited'}</Chip>}
          {filters.category !== 'all' && <Chip style={styles.filterChip} textStyle={styles.chipText}>{filters.category === 'free' ? 'Free' : 'Premium'}</Chip>}
          {filters.continent && <Chip style={styles.filterChip} textStyle={styles.chipText}>{filters.continent}</Chip>}
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearFilters}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      <FlatList
        data={landmarks}
        renderItem={renderLandmarkCard}
        keyExtractor={(item) => item.landmark_id}
        contentContainerStyle={styles.resultsList}
        ListHeaderComponent={
          landmarks.length > 0 ? (
            <Text style={styles.resultsCount}>{landmarks.length} landmark{landmarks.length !== 1 ? 's' : ''} found</Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery || getActiveFilterCount() > 0
                  ? 'No landmarks found'
                  : 'Search for landmarks'}
              </Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your filters or search term
              </Text>
            </View>
          ) : null
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Visited Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Visit Status</Text>
              <View style={styles.filterOptions}>
                {['all', 'true', 'false'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      filters.visited === option && styles.filterOptionActive
                    ]}
                    onPress={() => setFilters({ ...filters, visited: option as any })}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.visited === option && styles.filterOptionTextActive
                    ]}>
                      {option === 'all' ? 'All' : option === 'true' ? 'Visited' : 'Not Visited'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.filterOptions}>
                {['all', 'free', 'premium'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      filters.category === option && styles.filterOptionActive
                    ]}
                    onPress={() => setFilters({ ...filters, category: option as any })}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.category === option && styles.filterOptionTextActive
                    ]}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: 'points_desc', label: 'Points: High to Low' },
                  { value: 'points_asc', label: 'Points: Low to High' },
                  { value: 'name_asc', label: 'Name: A to Z' },
                  { value: 'name_desc', label: 'Name: Z to A' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      filters.sortBy === option.value && styles.filterOptionActive
                    ]}
                    onPress={() => setFilters({ ...filters, sortBy: option.value as any })}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.sortBy === option.value && styles.filterOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Apply Button */}
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                style={styles.applyButtonGradient}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    ...theme.shadows.sm,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    padding: 0,
    backgroundColor: 'transparent',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  filterChip: {
    backgroundColor: theme.colors.primaryLight,
    height: 32,
  },
  chipText: {
    fontSize: 12,
  },
  clearFilters: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
  },
  resultsList: {
    padding: theme.spacing.md,
  },
  resultsCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  landmarkCard: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
  },
  landmarkImage: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landmarkInfo: {
    flex: 1,
    padding: theme.spacing.sm,
    justifyContent: 'center',
  },
  landmarkName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  landmarkCountry: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  landmarkMeta: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  premiumText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  filterSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptionActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterOptionTextActive: {
    color: theme.colors.primary,
  },
  applyButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  applyButtonGradient: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
