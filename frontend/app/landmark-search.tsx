import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';

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
  category: string;
  points: number;
}

export default function LandmarkSearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query || query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/landmarks/search/query?q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setSearched(true);
      }
    } catch (error) {
      console.error('Error searching landmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'nature':
        return 'leaf';
      case 'cultural':
        return 'globe';
      case 'historical':
        return 'time';
      case 'premium':
        return 'diamond';
      default:
        return 'location';
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setSearched(false);
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search landmarks..."
            placeholderTextColor={theme.colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      <ScrollView
        style={styles.resultsContainer}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {!loading && searched && results.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No landmarks found</Text>
            <Text style={styles.emptyText}>
              Try searching with different keywords
            </Text>
          </View>
        )}

        {!loading && results.length > 0 && (
          <View>
            <Text style={styles.resultsCount}>
              {results.length} {results.length === 1 ? 'landmark' : 'landmarks'} found
            </Text>
            {results.map((landmark) => (
              <Surface key={landmark.landmark_id} style={styles.landmarkCard}>
                <TouchableOpacity
                  style={styles.landmarkContent}
                  onPress={() => router.push(`/landmark-detail/${landmark.landmark_id}`)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      landmark.category === 'premium' && styles.iconContainerPremium,
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(landmark.category) as any}
                      size={24}
                      color={landmark.category === 'premium' ? '#FFD700' : theme.colors.primary}
                    />
                  </View>

                  <View style={styles.landmarkInfo}>
                    <Text style={styles.landmarkName} numberOfLines={1}>
                      {landmark.name}
                    </Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={12} color={theme.colors.textSecondary} />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {landmark.country_name} • {landmark.continent}
                      </Text>
                    </View>
                    <View style={styles.metadata}>
                      <View style={styles.pointsBadge}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.pointsText}>{landmark.points} pts</Text>
                      </View>
                      {landmark.category === 'premium' && (
                        <View style={styles.premiumBadge}>
                          <Ionicons name="diamond" size={10} color="#764ba2" />
                          <Text style={styles.premiumText}>PREMIUM</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
                </TouchableOpacity>
              </Surface>
            ))}
          </View>
        )}

        {!loading && !searched && (
          <View style={styles.emptyState}>
            <Ionicons name="compass-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>Search for Landmarks</Text>
            <Text style={styles.emptyText}>
              Find landmarks across all countries and continents
            </Text>
          </View>
        )}

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    padding: 0,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    padding: theme.spacing.lg,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  resultsCount: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  landmarkCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  landmarkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${theme.colors.primary}30`,
  },
  iconContainerPremium: {
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    borderColor: 'rgba(233, 30, 99, 0.3)',
  },
  landmarkInfo: {
    flex: 1,
  },
  landmarkName: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: theme.spacing.xs,
  },
  locationText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  metadata: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${theme.colors.background}`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  pointsText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 11,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 99, 0.3)',
  },
  premiumText: {
    ...theme.typography.caption,
    color: '#E91E63',
    fontWeight: '700',
    fontSize: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
