import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { BACKEND_URL } from '../../utils/config';
import theme from '../../styles/theme';

const { width, height } = Dimensions.get('window');

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
  const mapRef = useRef<MapView>(null);
  const [loading, setLoading] = useState(true);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<VisitedPlace | null>(null);
  const [filter, setFilter] = useState<'all' | 'landmarks' | 'countries'>('all');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (user) {
      fetchVisitedPlaces();
    }
  }, [user]);

  const fetchVisitedPlaces = async () => {
    try {
      setLoading(true);
      const token = Platform.OS === 'web' 
        ? localStorage.getItem('auth_token')
        : await require('expo-secure-store').getItemAsync('auth_token');

      // Fetch visited landmarks
      const landmarksResponse = await fetch(`${BACKEND_URL}/api/visits/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch country visits
      const countriesResponse = await fetch(`${BACKEND_URL}/api/country-visits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const places: VisitedPlace[] = [];

      if (landmarksResponse.ok) {
        const landmarks = await landmarksResponse.json();
        // Fetch landmark details to get coordinates
        for (const visit of landmarks.slice(0, 50)) { // Limit to 50 for performance
          try {
            const landmarkResponse = await fetch(`${BACKEND_URL}/api/landmarks/${visit.landmark_id}`);
            if (landmarkResponse.ok) {
              const landmark = await landmarkResponse.json();
              if (landmark.latitude && landmark.longitude) {
                places.push({
                  id: visit.visit_id,
                  name: landmark.name,
                  type: 'landmark',
                  latitude: landmark.latitude,
                  longitude: landmark.longitude,
                  visitedAt: visit.visited_at,
                  photo: visit.photo_base64,
                  country: landmark.country_name,
                  continent: landmark.continent,
                });
              }
            }
          } catch (e) {
            console.log('Error fetching landmark:', e);
          }
        }
      }

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

  const getMarkerColor = (type: string) => {
    return type === 'landmark' ? theme.colors.primary : theme.colors.accent;
  };

  const handleMarkerPress = (place: VisitedPlace) => {
    setSelectedPlace(place);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const centerOnUser = () => {
    if (filteredPlaces.length > 0 && mapRef.current) {
      const latitudes = filteredPlaces.map(p => p.latitude);
      const longitudes = filteredPlaces.map(p => p.longitude);
      
      mapRef.current.fitToCoordinates(
        filteredPlaces.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Travel Map</Text>
        <Text style={styles.headerSubtitle}>
          {visitedPlaces.length} places visited
        </Text>
      </View>

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
          Landmarks ({visitedPlaces.filter(p => p.type === 'landmark').length})
        </Chip>
        <Chip
          selected={filter === 'countries'}
          onPress={() => setFilter('countries')}
          style={[styles.chip, filter === 'countries' && styles.chipSelected]}
          textStyle={filter === 'countries' ? styles.chipTextSelected : styles.chipText}
        >
          Countries ({visitedPlaces.filter(p => p.type === 'country').length})
        </Chip>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading your travels...</Text>
          </View>
        ) : (
          <>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={{
                latitude: 20,
                longitude: 0,
                latitudeDelta: 100,
                longitudeDelta: 100,
              }}
              onMapReady={() => {
                setMapReady(true);
                if (filteredPlaces.length > 0) {
                  setTimeout(centerOnUser, 500);
                }
              }}
            >
              {mapReady && filteredPlaces.map((place) => (
                <Marker
                  key={place.id}
                  coordinate={{
                    latitude: place.latitude,
                    longitude: place.longitude,
                  }}
                  onPress={() => handleMarkerPress(place)}
                  pinColor={getMarkerColor(place.type)}
                >
                </Marker>
              ))}
            </MapView>

            {/* Floating Action Buttons */}
            <View style={styles.fabContainer}>
              <TouchableOpacity 
                style={styles.fab} 
                onPress={centerOnUser}
              >
                <Ionicons name="locate" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Selected Place Card */}
            {selectedPlace && (
              <Surface style={styles.placeCard}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setSelectedPlace(null)}
                >
                  <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.placeCardContent}>
                  <View style={styles.placeIcon}>
                    <Ionicons 
                      name={selectedPlace.type === 'landmark' ? 'location' : 'flag'} 
                      size={24} 
                      color={getMarkerColor(selectedPlace.type)} 
                    />
                  </View>
                  <View style={styles.placeInfo}>
                    <Text style={styles.placeName}>{selectedPlace.name}</Text>
                    {selectedPlace.country && (
                      <Text style={styles.placeCountry}>{selectedPlace.country}</Text>
                    )}
                    <Text style={styles.placeDate}>
                      Visited {formatDate(selectedPlace.visitedAt)}
                    </Text>
                  </View>
                </View>
              </Surface>
            )}

            {/* Empty State */}
            {filteredPlaces.length === 0 && !loading && (
              <View style={styles.emptyOverlay}>
                <Surface style={styles.emptyCard}>
                  <Ionicons name="airplane-outline" size={48} color={theme.colors.primary} />
                  <Text style={styles.emptyTitle}>No places yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Start exploring and your visited places will appear here!
                  </Text>
                </Surface>
              </View>
            )}
          </>
        )}
      </View>

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
            {new Set(visitedPlaces.map(p => p.continent).filter(Boolean)).size}
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
  headerTitle: {
    fontSize: 24,
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
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
  fabContainer: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  placeCard: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.md,
    right: theme.spacing.md + 56,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    padding: theme.spacing.xs,
    zIndex: 1,
  },
  placeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeCountry: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  placeDate: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  emptyCard: {
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.lg,
    maxWidth: 280,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
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
