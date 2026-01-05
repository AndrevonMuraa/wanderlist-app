import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Alert, Animated } from 'react-native';
import { Text, Searchbar, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Country {
  country_id: string;
  name: string;
  continent: string;
  landmark_count: number;
}

const CONTINENTS = ['All', 'Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];

// Country flag emojis
const COUNTRY_FLAGS: Record<string, string> = {
  norway: '🇳🇴',
  france: '🇫🇷',
  italy: '🇮🇹',
  japan: '🇯🇵',
  egypt: '🇪🇬',
  peru: '🇵🇪',
  australia: '🇦🇺',
  usa: '🇺🇸',
  uk: '🇬🇧',
  china: '🇨🇳',
  spain: '🇪🇸',
  greece: '🇬🇷',
  thailand: '🇹🇭',
  india: '🇮🇳',
  brazil: '🇧🇷',
  mexico: '🇲🇽',
  uae: '🇦🇪',
  germany: '🇩🇪',
  canada: '🇨🇦',
  south_africa: '🇿🇦',
};

export default function ExploreScreen() {
  const { user } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [selectedContinent, setSelectedContinent] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    filterCountries();
  }, [countries, selectedContinent, searchQuery]);

  const fetchCountries = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${BACKEND_URL}/api/countries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCountries(data);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterCountries = () => {
    let filtered = countries;

    if (selectedContinent !== 'All') {
      filtered = filtered.filter(c => c.continent === selectedContinent);
    }

    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCountries(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCountries();
  };

  const getCountryAccent = (countryId: string): string => {
    return theme.colors.countryAccents[countryId as keyof typeof theme.colors.countryAccents] || theme.colors.primary;
  };

  const renderCountry = ({ item, index }: { item: Country; index: number }) => {
    const countryAccent = getCountryAccent(item.country_id);
    const flag = COUNTRY_FLAGS[item.country_id] || '🌍';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/landmarks/${item.country_id}?name=${item.name}`)}
        activeOpacity={0.7}
        style={styles.countryCardWrapper}
      >
        <View style={[styles.countryCard, { borderLeftColor: countryAccent, borderLeftWidth: 4 }]}>
          <LinearGradient
            colors={[countryAccent + '15', countryAccent + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.countryGradient}
          >
            <View style={styles.countryContent}>
              <View style={styles.countryHeader}>
                <Text style={styles.countryFlag}>{flag}</Text>
                <View style={styles.countryInfo}>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <View style={styles.countryMeta}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.continentText}>{item.continent}</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.countryBadge, { backgroundColor: countryAccent }]}>
                <Text style={styles.countBadgeText}>{item.landmark_count}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSubtitle}>200 landmarks across 20 countries</Text>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search countries..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={theme.colors.primary}
          inputStyle={styles.searchInput}
          placeholderTextColor={theme.colors.textLight}
        />
      </View>

      <View style={styles.chipsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CONTINENTS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Chip
              selected={selectedContinent === item}
              onPress={() => setSelectedContinent(item)}
              style={[
                styles.chip,
                selectedContinent === item && styles.chipSelected
              ]}
              textStyle={[
                styles.chipText,
                selectedContinent === item && styles.chipTextSelected
              ]}
              mode={selectedContinent === item ? 'flat' : 'outlined'}
            >
              {item}
            </Chip>
          )}
        />
      </View>

      <FlatList
        data={filteredCountries}
        renderItem={renderCountry}
        keyExtractor={(item) => item.country_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={theme.colors.border} />
            <Text style={styles.emptyText}>No countries found</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, !user?.is_premium && styles.fabWithBadge]}
        onPress={() => {
          if (user?.is_premium || user?.subscription_tier === 'premium' || user?.subscription_tier === 'basic') {
            router.push('/user-landmarks');
          } else {
            Alert.alert(
              'Premium Feature',
              'Suggesting landmarks is a Premium feature. Upgrade to Premium to suggest your favorite places!',
              [
                { text: 'Maybe Later', style: 'cancel' },
                { text: 'Learn More', onPress: () => {} }
              ]
            );
          }
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#fff" />
        {!user?.is_premium && user?.subscription_tier === 'free' && (
          <View style={styles.premiumBadgeOnFab}>
            <Ionicons name="star" size={12} color={theme.colors.accent} />
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
  },
  searchContainer: {
    padding: theme.spacing.md,
  },
  searchBar: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    elevation: 0,
    ...theme.shadows.sm,
  },
  searchInput: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  chipsContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  chip: {
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.text,
    ...theme.typography.labelSmall,
  },
  chipTextSelected: {
    color: '#fff',
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  countryCardWrapper: {
    marginBottom: theme.spacing.md,
  },
  countryCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  countryGradient: {
    width: '100%',
  },
  countryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countryFlag: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  countryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continentText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  countryBadge: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minWidth: 50,
    alignItems: 'center',
  },
  countBadgeText: {
    ...theme.typography.h3,
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginTop: theme.spacing.md,
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  fabWithBadge: {},
  premiumBadgeOnFab: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
});