import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';
import LandmarkMap from '../../components/LandmarkMap';

// Conditionally import MapView only for native platforms
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

// Helper to get token
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface LandmarkFact {
  title: string;
  text: string;
  icon: string;
}

interface Landmark {
  landmark_id: string;
  name: string;
  country_name: string;
  continent: string;
  description: string;
  image_url: string;
  images?: string[];
  facts?: LandmarkFact[];
  best_time_to_visit?: string;
  duration?: string;
  difficulty?: string;
  latitude?: number | null;
  longitude?: number | null;
  category: string;
  upvotes: number;
}


export default function LandmarkDetailScreen() {
  const { landmark_id } = useLocalSearchParams();
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [northernLightsVisits, setNorthernLightsVisits] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchLandmark();
  }, []);

  const fetchLandmark = async () => {
    try {
      const token = await getToken();
      console.log('Fetching landmark:', landmark_id);
      
      const response = await fetch(`${BACKEND_URL}/api/landmarks/${landmark_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Landmark API response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Landmark loaded:', data.name);
        setLandmark(data);
        
        // If Northern Lights, fetch user's visits
        if (data.name === 'Northern Lights') {
          fetchNorthernLightsVisits(token);
        }
      } else {
        console.error('Failed to fetch landmark:', response.status);
      }
    } catch (error) {
      console.error('Error fetching landmark:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNorthernLightsVisits = async (token: string | null) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/visits`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const visits = await response.json();
        // Filter visits for Northern Lights that have location data
        const nlVisits = visits.filter((visit: any) => 
          visit.landmark_id === landmark_id && 
          visit.visit_location && 
          visit.visit_location.latitude && 
          visit.visit_location.longitude
        );
        setNorthernLightsVisits(nlVisits);
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
    }
  };

  const handleMarkAsVisited = () => {
    router.push(`/add-visit/${landmark_id}`);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!landmark) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Ionicons name="location-outline" size={64} color={theme.colors.border} />
          <Text style={styles.notFoundText}>Landmark not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backToExploreButton}>
            <Text style={styles.backToExploreText}>Back to Explore</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Get data from API or use defaults
  const images = landmark.images && landmark.images.length > 0 ? landmark.images : [landmark.image_url];
  const facts = landmark.facts && landmark.facts.length > 0 ? landmark.facts : [
    {
      title: 'Historic Significance',
      text: landmark.description || 'A remarkable landmark with rich cultural heritage and historical importance.',
      icon: 'book-outline'
    },
    {
      title: 'Architectural Marvel',
      text: 'Known for its distinctive architecture and design that reflects the cultural identity of the region.',
      icon: 'business-outline'
    },
    {
      title: 'Cultural Heritage',
      text: 'A testament to human creativity and ingenuity, attracting visitors from around the world.',
      icon: 'star-outline'
    }
  ];
  const bestTimeToVisit = landmark.best_time_to_visit || 'Year-round';
  const duration = landmark.duration || '2-3 hours';
  const difficulty = landmark.difficulty || 'Easy';

  const currentImage = images[selectedImageIndex] || landmark.image_url;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image with Overlay */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: currentImage }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.heroOverlay}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <View style={styles.backButtonCircle}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </View>
            </TouchableOpacity>
            
            <View style={styles.heroContent}>
              <Text style={styles.landmarkName}>{landmark.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.locationText}>{landmark.country_name}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Image Gallery Thumbnails */}
        {images.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailContainer}
            contentContainerStyle={styles.thumbnailContent}
          >
            {images.map((img, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedImageIndex(index)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: img }}
                  style={[
                    styles.thumbnail,
                    selectedImageIndex === index && styles.thumbnailSelected
                  ]}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Quick Info Cards */}
        <View style={styles.quickInfoContainer}>
          <View style={styles.quickInfoCard}>
            <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.quickInfoLabel}>Duration</Text>
            <Text style={styles.quickInfoValue}>{duration}</Text>
          </View>
          <View style={styles.quickInfoCard}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.accent} />
            <Text style={styles.quickInfoLabel}>Best Time</Text>
            <Text style={styles.quickInfoValue}>{bestTimeToVisit}</Text>
          </View>
          <View style={styles.quickInfoCard}>
            <Ionicons name="speedometer-outline" size={24} color={theme.colors.accentBronze} />
            <Text style={styles.quickInfoLabel}>Difficulty</Text>
            <Text style={styles.quickInfoValue}>{difficulty}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.descriptionText}>{landmark.description}</Text>
        </View>

        {/* Location Map - Special handling for Northern Lights */}
        {landmark.name === 'Northern Lights' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌌 Your Observation Locations</Text>
            <Text style={styles.northernLightsInfo}>
              The Northern Lights can be observed from various Arctic locations. 
              {northernLightsVisits.length > 0 
                ? ` You've logged ${northernLightsVisits.length} observation${northernLightsVisits.length > 1 ? 's' : ''}!`
                : ' Mark your first visit to pin your observation point!'}
            </Text>
            
            {/* Native Map View */}
            {Platform.OS !== 'web' && MapView && (
              <View style={styles.observationMapContainer}>
                <MapView
                  style={styles.observationMap}
                  initialRegion={{
                    latitude: landmark.latitude || 69.6492,
                    longitude: landmark.longitude || 18.9553,
                    latitudeDelta: 30,
                    longitudeDelta: 30,
                  }}
                >
                  {northernLightsVisits.map((visit, index) => (
                    <Marker
                      key={visit.visit_id}
                      coordinate={{
                        latitude: visit.visit_location.latitude,
                        longitude: visit.visit_location.longitude,
                      }}
                      title={`Observation ${index + 1}`}
                      description={visit.comments || 'Northern Lights sighting'}
                      pinColor="#00ff00"
                    />
                  ))}
                </MapView>
              </View>
            )}
            
            {/* Web Fallback */}
            {Platform.OS === 'web' && (
              <View style={styles.webMapPlaceholder}>
                <Ionicons name="map" size={48} color={theme.colors.primary} />
                <Text style={styles.webMapText}>
                  Interactive map available on mobile devices
                </Text>
              </View>
            )}
            
            {/* Observation Stats */}
            <View style={styles.observationStats}>
              <View style={styles.statCard}>
                <Ionicons name="location" size={24} color={theme.colors.primary} />
                <Text style={styles.statNumber}>{northernLightsVisits.length}</Text>
                <Text style={styles.statLabel}>Observations</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="pin" size={24} color={theme.colors.accent} />
                <Text style={styles.statNumber}>
                  {northernLightsVisits.length > 0 ? 'Active' : 'Pending'}
                </Text>
                <Text style={styles.statLabel}>Map Status</Text>
              </View>
            </View>
            
            {northernLightsVisits.length === 0 && (
              <View style={styles.northernLightsCard}>
                <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
                <Text style={styles.northernLightsCardText}>
                  Click "Mark as Visited" below to add your first observation point!
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Location</Text>
            <LandmarkMap 
              latitude={landmark.latitude}
              longitude={landmark.longitude}
              landmarkName={landmark.name}
              height={250}
            />
          </View>
        )}

        {/* Historical & Cultural Facts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discover More</Text>
          {facts.map((fact, index) => (
            <View key={index} style={styles.factCard}>
              <View style={styles.factHeader}>
                <View style={[styles.factIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name={fact.icon as any} size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.factTitle}>{fact.title}</Text>
              </View>
              <Text style={styles.factText}>{fact.text}</Text>
            </View>
          ))}
        </View>

        {/* Tips for Visitors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visitor Tips</Text>
          <View style={styles.tipCard}>
            <Ionicons name="camera-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.tipText}>Best photo spots at sunrise and sunset</Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="wallet-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.tipText}>Check for local tour guides for deeper insights</Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="shirt-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.tipText}>Dress appropriately and respect local customs</Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            onPress={handleMarkAsVisited}
            style={styles.visitButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.visitButtonGradient}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <Text style={styles.visitButtonText}>Mark as Visited</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: theme.spacing.xl,
  },
  notFoundText: {
    ...theme.typography.h3,
    color: theme.colors.textLight,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  backToExploreButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  backToExploreText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  heroContainer: {
    height: 400,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  heroContent: {
    marginBottom: theme.spacing.md,
  },
  landmarkName: {
    ...theme.typography.display,
    color: '#fff',
    marginBottom: theme.spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: theme.spacing.xs,
  },
  thumbnailContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  thumbnailContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    opacity: 0.6,
  },
  thumbnailSelected: {
    opacity: 1,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  quickInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  quickInfoCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  quickInfoLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  quickInfoValue: {
    ...theme.typography.labelSmall,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: theme.spacing.xs / 2,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  descriptionText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  factCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  factHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  factIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  factTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    flex: 1,
  },
  factText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceTinted,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  tipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  actionContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  visitButton: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  visitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  visitButtonText: {
    ...theme.typography.h4,
    color: '#fff',
    marginLeft: theme.spacing.sm,
    fontWeight: '600',
  },
  northernLightsInfo: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  northernLightsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '15',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  northernLightsCardText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
    flex: 1,
    fontWeight: '500',
  },
});
