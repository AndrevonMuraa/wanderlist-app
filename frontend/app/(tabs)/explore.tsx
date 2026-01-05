import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { Text, Searchbar, Chip, ActivityIndicator, Surface, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Country {
  country_id: string;
  name: string;
  continent: string;
  landmark_count: number;
}

const CONTINENTS = ['All', 'Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];

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

  const renderCountry = ({ item }: { item: Country }) => (
    <TouchableOpacity
      onPress={() => router.push(`/landmarks/${item.country_id}?name=${item.name}`)}
      activeOpacity={0.7}
    >
      <Surface style={styles.countryCard}>
        <View style={styles.countryContent}>
          <View style={styles.countryInfo}>
            <Text style={styles.countryName}>{item.name}</Text>
            <View style={styles.countryMeta}>
              <Ionicons name="location" size={14} color="#666" />
              <Text style={styles.continentText}>{item.continent}</Text>
            </View>
          </View>
          <View style={styles.countryBadge}>
            <Text style={styles.countBadgeText}>{item.landmark_count}</Text>
            <Text style={styles.landmarkLabel}>landmarks</Text>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore Landmarks</Text>
        <Text style={styles.headerSubtitle}>Discover iconic places around the world</Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search countries..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
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
              style={styles.chip}
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No countries found</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (user?.is_premium) {
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
        {!user?.is_premium && (
          <View style={styles.premiumBadgeOnFab}>
            <Ionicons name="star" size={12} color="#FFD700" />
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#6200ee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0d0ff',
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    elevation: 2,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
  },
  listContainer: {
    padding: 16,
  },
  countryCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  countryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  countryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continentText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  countryBadge: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minWidth: 60,
  },
  countBadgeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  landmarkLabel: {
    fontSize: 10,
    color: '#e0d0ff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
