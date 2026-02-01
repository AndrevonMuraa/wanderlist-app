import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView, Dimensions } from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { BACKEND_URL } from '../../utils/config';
import theme, { gradients } from '../../styles/theme';

const { width } = Dimensions.get('window');

// Country coordinates (center points for major countries)
const COUNTRY_COORDINATES: { [key: string]: { latitude: number; longitude: number } } = {
  // Europe
  'France': { latitude: 46.2276, longitude: 2.2137 },
  'Italy': { latitude: 41.8719, longitude: 12.5674 },
  'Spain': { latitude: 40.4637, longitude: -3.7492 },
  'Germany': { latitude: 51.1657, longitude: 10.4515 },
  'United Kingdom': { latitude: 55.3781, longitude: -3.4360 },
  'Greece': { latitude: 39.0742, longitude: 21.8243 },
  'Portugal': { latitude: 39.3999, longitude: -8.2245 },
  'Netherlands': { latitude: 52.1326, longitude: 5.2913 },
  'Switzerland': { latitude: 46.8182, longitude: 8.2275 },
  'Austria': { latitude: 47.5162, longitude: 14.5501 },
  'Belgium': { latitude: 50.5039, longitude: 4.4699 },
  'Czech Republic': { latitude: 49.8175, longitude: 15.4730 },
  'Poland': { latitude: 51.9194, longitude: 19.1451 },
  'Sweden': { latitude: 60.1282, longitude: 18.6435 },
  'Norway': { latitude: 60.4720, longitude: 8.4689 },
  'Denmark': { latitude: 56.2639, longitude: 9.5018 },
  'Finland': { latitude: 61.9241, longitude: 25.7482 },
  'Ireland': { latitude: 53.1424, longitude: -7.6921 },
  'Hungary': { latitude: 47.1625, longitude: 19.5033 },
  'Croatia': { latitude: 45.1000, longitude: 15.2000 },
  'Romania': { latitude: 45.9432, longitude: 24.9668 },
  'Turkey': { latitude: 38.9637, longitude: 35.2433 },
  'Russia': { latitude: 61.5240, longitude: 105.3188 },
  'Iceland': { latitude: 64.9631, longitude: -19.0208 },
  
  // Asia
  'Japan': { latitude: 36.2048, longitude: 138.2529 },
  'China': { latitude: 35.8617, longitude: 104.1954 },
  'India': { latitude: 20.5937, longitude: 78.9629 },
  'Thailand': { latitude: 15.8700, longitude: 100.9925 },
  'Vietnam': { latitude: 14.0583, longitude: 108.2772 },
  'South Korea': { latitude: 35.9078, longitude: 127.7669 },
  'Indonesia': { latitude: -0.7893, longitude: 113.9213 },
  'Malaysia': { latitude: 4.2105, longitude: 101.9758 },
  'Singapore': { latitude: 1.3521, longitude: 103.8198 },
  'Philippines': { latitude: 12.8797, longitude: 121.7740 },
  'Cambodia': { latitude: 12.5657, longitude: 104.9910 },
  'Nepal': { latitude: 28.3949, longitude: 84.1240 },
  'Sri Lanka': { latitude: 7.8731, longitude: 80.7718 },
  'UAE': { latitude: 23.4241, longitude: 53.8478 },
  'Israel': { latitude: 31.0461, longitude: 34.8516 },
  'Jordan': { latitude: 30.5852, longitude: 36.2384 },
  
  // North America
  'United States': { latitude: 37.0902, longitude: -95.7129 },
  'Canada': { latitude: 56.1304, longitude: -106.3468 },
  'Mexico': { latitude: 23.6345, longitude: -102.5528 },
  'Cuba': { latitude: 21.5218, longitude: -77.7812 },
  'Costa Rica': { latitude: 9.7489, longitude: -83.7534 },
  'Panama': { latitude: 8.5380, longitude: -80.7821 },
  
  // South America
  'Brazil': { latitude: -14.2350, longitude: -51.9253 },
  'Argentina': { latitude: -38.4161, longitude: -63.6167 },
  'Peru': { latitude: -9.1900, longitude: -75.0152 },
  'Chile': { latitude: -35.6751, longitude: -71.5430 },
  'Colombia': { latitude: 4.5709, longitude: -74.2973 },
  'Ecuador': { latitude: -1.8312, longitude: -78.1834 },
  'Bolivia': { latitude: -16.2902, longitude: -63.5887 },
  
  // Africa
  'Egypt': { latitude: 26.8206, longitude: 30.8025 },
  'Morocco': { latitude: 31.7917, longitude: -7.0926 },
  'South Africa': { latitude: -30.5595, longitude: 22.9375 },
  'Kenya': { latitude: -0.0236, longitude: 37.9062 },
  'Tanzania': { latitude: -6.3690, longitude: 34.8888 },
  'Ethiopia': { latitude: 9.1450, longitude: 40.4897 },
  'Nigeria': { latitude: 9.0820, longitude: 8.6753 },
  'Ghana': { latitude: 7.9465, longitude: -1.0232 },
  
  // Oceania
  'Australia': { latitude: -25.2744, longitude: 133.7751 },
  'New Zealand': { latitude: -40.9006, longitude: 174.8860 },
  'Fiji': { latitude: -17.7134, longitude: 178.0650 },
};

// Continent emoji mapping
const CONTINENT_ICONS: { [key: string]: string } = {
  'Europe': '🏰',
  'Asia': '🏯',
  'North America': '🗽',
  'South America': '🌴',
  'Africa': '🦁',
  'Oceania': '🦘',
  'Antarctica': '🐧',
};

interface VisitedPlace {
  id: string;
  name: string;
  type: 'landmark' | 'country';
  latitude: number;
  longitude: number;
  visitedAt: string;
  photo?: string;
  country?: string;
  continent?: string;
}

export default function MapScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<VisitedPlace | null>(null);
  const [filter, setFilter] = useState<'all' | 'landmarks' | 'countries'>('all');

  useEffect(() => {
    if (user) {
      fetchVisitedPlaces();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchVisitedPlaces = async () => {
    try {
      setLoading(true);
      let token: string | null = null;
      
      if (Platform.OS === 'web') {
        token = localStorage.getItem('auth_token');
      } else {
        const SecureStore = require('expo-secure-store');
        token = await SecureStore.getItemAsync('auth_token');
      }

      const places: VisitedPlace[] = [];

      // Fetch country visits
      try {
        const countriesResponse = await fetch(`${BACKEND_URL}/api/country-visits`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (countriesResponse.ok) {
          const countries = await countriesResponse.json();
          for (const countryVisit of countries) {
            const coords = COUNTRY_COORDINATES[countryVisit.country_name];
            if (coords) {
              places.push({
                id: countryVisit.country_visit_id,
                name: countryVisit.country_name,
                type: 'country',
                latitude: coords.latitude,
                longitude: coords.longitude,
                visitedAt: countryVisit.visited_at,
                continent: countryVisit.continent,
              });
            }
          }
        }
      } catch (e) {
        console.log('Error fetching country visits:', e);
      }

      // Fetch visited landmarks
      try {
        const landmarksResponse = await fetch(`${BACKEND_URL}/api/visits/my`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (landmarksResponse.ok) {
          const visits = await landmarksResponse.json();
          // For each visit, we'd ideally get landmark coordinates
          // For now, we'll use country coordinates as approximation
          for (const visit of visits.slice(0, 20)) {
            if (visit.landmark_name && visit.country_name) {
              const coords = COUNTRY_COORDINATES[visit.country_name];
              if (coords) {
                // Add slight offset to avoid overlapping with country marker
                places.push({
                  id: visit.visit_id,
                  name: visit.landmark_name,
                  type: 'landmark',
                  latitude: coords.latitude + (Math.random() * 2 - 1),
                  longitude: coords.longitude + (Math.random() * 2 - 1),
                  visitedAt: visit.visited_at,
                  country: visit.country_name,
                  continent: visit.continent,
                });
              }
            }
          }
        }
      } catch (e) {
        console.log('Error fetching landmark visits:', e);
      }

      setVisitedPlaces(places);
    } catch (error) {
      console.error('Error fetching visited places:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaces = visitedPlaces.filter(place => {
    if (filter === 'all') return true;
    if (filter === 'landmarks') return place.type === 'landmark';
    if (filter === 'countries') return place.type === 'country';
    return true;
  });

  // Group places by continent
  const placesByContinent = filteredPlaces.reduce((acc, place) => {
    const continent = place.continent || 'Unknown';
    if (!acc[continent]) acc[continent] = [];
    acc[continent].push(place);
    return acc;
  }, {} as { [key: string]: VisitedPlace[] });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="map-outline" size={64} color={theme.colors.textLight} />
          <Text style={styles.emptyText}>Sign in to see your travel map</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.push('/(tabs)/journey')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Travel Map</Text>
          <Text style={styles.headerSubtitle}>
            {visitedPlaces.length} places visited
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={[styles.chip, filter === 'all' && styles.chipSelected]}
          textStyle={filter === 'all' ? styles.chipTextSelected : styles.chipText}
        >
          All ({visitedPlaces.length})
        </Chip>
        <Chip
          selected={filter === 'landmarks'}
          onPress={() => setFilter('landmarks')}
          style={[styles.chip, filter === 'landmarks' && styles.chipSelected]}
          textStyle={filter === 'landmarks' ? styles.chipTextSelected : styles.chipText}
        >
          🏛️ Landmarks ({visitedPlaces.filter(p => p.type === 'landmark').length})
        </Chip>
        <Chip
          selected={filter === 'countries'}
          onPress={() => setFilter('countries')}
          style={[styles.chip, filter === 'countries' && styles.chipSelected]}
          textStyle={filter === 'countries' ? styles.chipTextSelected : styles.chipText}
        >
          🌍 Countries ({visitedPlaces.filter(p => p.type === 'country').length})
        </Chip>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your travels...</Text>
        </View>
      ) : filteredPlaces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Surface style={styles.emptyCard}>
            <Ionicons name="airplane-outline" size={64} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>No places yet</Text>
            <Text style={styles.emptySubtitle}>
              Start exploring and your visited places will appear here on your travel map!
            </Text>
          </Surface>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* World Map Visual */}
          <Surface style={styles.mapCard}>
            <View style={styles.worldMapContainer}>
              <Text style={styles.worldMapEmoji}>🌍</Text>
              <View style={styles.mapStatsRow}>
                {Object.entries(placesByContinent).map(([continent, places]) => (
                  <View key={continent} style={styles.continentBadge}>
                    <Text style={styles.continentEmoji}>
                      {CONTINENT_ICONS[continent] || '🌐'}
                    </Text>
                    <Text style={styles.continentCount}>{places.length}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Surface>

          {/* Places by Continent */}
          {Object.entries(placesByContinent).sort().map(([continent, places]) => (
            <View key={continent} style={styles.continentSection}>
              <View style={styles.continentHeader}>
                <Text style={styles.continentIcon}>{CONTINENT_ICONS[continent] || '🌐'}</Text>
                <Text style={styles.continentName}>{continent}</Text>
                <Text style={styles.continentPlaceCount}>{places.length} places</Text>
              </View>
              
              {places.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.placeItem}
                  onPress={() => setSelectedPlace(selectedPlace?.id === place.id ? null : place)}
                >
                  <View style={[
                    styles.placeIcon,
                    { backgroundColor: place.type === 'landmark' ? theme.colors.primary + '20' : theme.colors.accent + '20' }
                  ]}>
                    <Ionicons 
                      name={place.type === 'landmark' ? 'location' : 'flag'} 
                      size={20} 
                      color={place.type === 'landmark' ? theme.colors.primary : theme.colors.accent} 
                    />
                  </View>
                  <View style={styles.placeInfo}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    {place.country && place.type === 'landmark' && (
                      <Text style={styles.placeCountry}>{place.country}</Text>
                    )}
                    <Text style={styles.placeDate}>
                      Visited {formatDate(place.visitedAt)}
                    </Text>
                  </View>
                  <Ionicons 
                    name={selectedPlace?.id === place.id ? 'chevron-up' : 'chevron-forward'} 
                    size={20} 
                    color={theme.colors.textLight} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Note about native map */}
          {Platform.OS === 'web' && (
            <View style={styles.nativeMapNote}>
              <Ionicons name="phone-portrait-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.nativeMapNoteText}>
                Open in the mobile app for an interactive map experience!
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {visitedPlaces.filter(p => p.type === 'country').length}
          </Text>
          <Text style={styles.statLabel}>Countries</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {visitedPlaces.filter(p => p.type === 'landmark').length}
          </Text>
          <Text style={styles.statLabel}>Landmarks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Object.keys(placesByContinent).length}
          </Text>
          <Text style={styles.statLabel}>Continents</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  chipTextSelected: {
    color: '#fff',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyCard: {
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.lg,
    maxWidth: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  mapCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  worldMapContainer: {
    alignItems: 'center',
  },
  worldMapEmoji: {
    fontSize: 80,
    marginBottom: theme.spacing.md,
  },
  mapStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  continentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  continentEmoji: {
    fontSize: 16,
    marginRight: theme.spacing.xs,
  },
  continentCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  continentSection: {
    marginBottom: theme.spacing.lg,
  },
  continentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  continentIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  continentName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  continentPlaceCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeCountry: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  placeDate: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  nativeMapNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
  },
  nativeMapNoteText: {
    marginLeft: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
});
