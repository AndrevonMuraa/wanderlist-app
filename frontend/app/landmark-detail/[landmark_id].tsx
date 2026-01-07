import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Platform, Modal } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import theme from '../../styles/theme';
import LandmarkMap from '../../components/LandmarkMap';
import { MapView, Marker } from '../../components/MapComponents';

// For web, use relative URLs (same origin) which routes to localhost:8001 via proxy
// For mobile, use the external URL
const BACKEND_URL = Platform.OS === 'web' 
  ? '' 
  : (process.env.EXPO_PUBLIC_BACKEND_URL || '');
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
  const [showVisitTypeModal, setShowVisitTypeModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
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
    setShowVisitTypeModal(true);
  };

  const handleVisitingNow = () => {
    setShowVisitTypeModal(false);
    router.push(`/add-visit/${landmark_id}`);
  };

  const handleAlreadyVisited = () => {
    setShowVisitTypeModal(false);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      if (Platform.OS === 'ios') {
        // iOS has a confirm button
        return;
      }
      // For Android, navigate immediately after date selection
      router.push(`/add-visit/${landmark_id}?visitDate=${date.toISOString()}`);
    } else {
      setShowDatePicker(false);
    }
  };

  const confirmIOSDate = () => {
    setShowDatePicker(false);
    router.push(`/add-visit/${landmark_id}?visitDate=${selectedDate.toISOString()}`);
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
    <View style={styles.container}>
      {/* Background Image - Fixed */}
      <Image
        source={{ uri: currentImage }}
        style={styles.backgroundImage}
        blurRadius={0}
      />
      
      {/* Dark overlay for readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        style={styles.backgroundOverlay}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Back Button - Floating */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Section with Title */}
          <View style={styles.heroSection}>
            <Text style={styles.landmarkName}>{landmark.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.locationText}>{landmark.country_name}</Text>
            </View>
          </View>

        {/* Quick Info Cards - Frosted Glass */}
        <View style={styles.quickInfoContainer}>
          <View style={styles.quickInfoCard}>
            <Ionicons name="time-outline" size={24} color="#fff" />
            <Text style={styles.quickInfoLabel}>Duration</Text>
            <Text style={styles.quickInfoValue}>{duration}</Text>
          </View>
          <View style={styles.quickInfoCard}>
            <Ionicons name="calendar-outline" size={24} color="#fff" />
            <Text style={styles.quickInfoLabel}>Best Time</Text>
            <Text style={styles.quickInfoValue}>{bestTimeToVisit}</Text>
          </View>
          <View style={styles.quickInfoCard}>
            <Ionicons name="speedometer-outline" size={24} color="#fff" />
            <Text style={styles.quickInfoLabel}>Difficulty</Text>
            <Text style={styles.quickInfoValue}>{difficulty}</Text>
          </View>
        </View>

        {/* Description - Frosted Glass Card */}
        <View style={styles.contentCard}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.cardText}>{landmark.description}</Text>
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
          <View style={styles.coordinatesCard}>
            <View style={styles.coordinateRow}>
              <View style={styles.coordinateItem}>
                <Ionicons name="navigate" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.coordinateLabel}>Latitude</Text>
                <Text style={styles.coordinateValue}>{landmark.latitude.toFixed(6)}°</Text>
              </View>
              <View style={styles.coordinateDivider} />
              <View style={styles.coordinateItem}>
                <Ionicons name="compass" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.coordinateLabel}>Longitude</Text>
                <Text style={styles.coordinateValue}>{landmark.longitude.toFixed(6)}°</Text>
              </View>
            </View>
          </View>
        )}

        {/* Historical & Cultural Facts - Frosted Glass Cards */}
        <View style={styles.contentCard}>
          <Text style={styles.cardTitle}>Discover More</Text>
          {facts.map((fact, index) => (
            <View key={index} style={styles.factCard}>
              <View style={styles.factHeader}>
                <View style={styles.factIcon}>
                  <Ionicons name={fact.icon as any} size={24} color="#fff" />
                </View>
                {fact.title && <Text style={styles.factTitle}>{fact.title}</Text>}
              </View>
              <Text style={styles.factText}>{fact.text}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Floating Action Button - Mark as Visited */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          onPress={handleMarkAsVisited}
          style={styles.floatingButton}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingButtonGradient}
          >
            <Ionicons name="checkmark-circle" size={28} color="#fff" />
            <Text style={styles.floatingButtonText}>Mark as Visited</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Visit Type Selection Modal */}
      <Modal
        visible={showVisitTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVisitTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>When did you visit?</Text>
            <Text style={styles.modalSubtitle}>Choose how you want to record this visit</Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleVisitingNow}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIcon}>
                <Ionicons name="location" size={28} color={theme.colors.primary} />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Visiting Now</Text>
                <Text style={styles.modalOptionDesc}>I'm currently at this location</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleAlreadyVisited}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIcon}>
                <Ionicons name="calendar" size={28} color={theme.colors.accent} />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Already Visited</Text>
                <Text style={styles.modalOptionDesc}>I visited this place before</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowVisitTypeModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal for Past Visits */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <Text style={styles.modalTitle}>When did you visit?</Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                style={styles.datePicker}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity
                    style={styles.datePickerCancel}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePickerConfirm}
                    onPress={confirmIOSDate}
                  >
                    <Text style={styles.datePickerConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60, // Space for back button
    paddingBottom: theme.spacing.xxl,
  },
  heroSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: theme.spacing.md,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  landmarkName: {
    ...theme.typography.h1,
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: theme.spacing.xs,
    fontSize: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...theme.shadows.sm,
  },
  quickInfoLabel: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: theme.spacing.xs,
  },
  quickInfoValue: {
    ...theme.typography.labelSmall,
    color: '#fff',
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
  // Coordinates Card Styles - Compact Version
  coordinatesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(10px)',
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
  },
  coordinateRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  coordinateItem: {
    flex: 1,
    alignItems: 'center',
  },
  coordinateDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: theme.spacing.xs,
  },
  coordinateLabel: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coordinateValue: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '600',
    marginTop: 2,
    fontSize: 13,
  },
  descriptionText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  factCard: {
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: theme.spacing.md,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  factTitle: {
    ...theme.typography.h4,
    color: '#fff',
    flex: 1,
    fontWeight: '600',
  },
  factText: {
    ...theme.typography.body,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
    paddingLeft: 48 + theme.spacing.md, // Align with title
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
  // Floating Action Button Styles
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.lg : theme.spacing.md,
    paddingTop: theme.spacing.md,
    backgroundColor: 'transparent',
  },
  floatingButton: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  floatingButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md + 4,
    paddingHorizontal: theme.spacing.lg,
  },
  floatingButtonText: {
    ...theme.typography.h4,
    color: '#fff',
    marginLeft: theme.spacing.sm,
    fontWeight: '700',
    fontSize: 18,
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
  observationMapContainer: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  observationMap: {
    width: '100%',
    height: 300,
  },
  webMapPlaceholder: {
    height: 300,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  webMapText: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
  },
  observationStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  statNumber: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    fontWeight: '700',
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  // Frosted Glass Styles
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...theme.shadows.md,
  },
  cardTitle: {
    ...theme.typography.h2,
    color: '#fff',
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  cardText: {
    ...theme.typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
  },
});
