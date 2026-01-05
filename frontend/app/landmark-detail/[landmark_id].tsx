import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

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

interface Landmark {
  landmark_id: string;
  name: string;
  country_name: string;
  continent: string;
  description: string;
  image_url: string;
  category: string;
  upvotes: number;
}

// Enhanced landmark information with historical facts and images
const LANDMARK_ENHANCEMENTS: Record<string, {
  facts: Array<{ title: string; text: string; icon: string }>;
  images: string[];
  bestTimeToVisit: string;
  duration: string;
  difficulty: string;
}> = {
  // Norway - Complete enhancement data
  'The Old Town of Fredrikstad': {
    facts: [
      {
        title: 'Historic Fortress City',
        text: 'Founded in 1567 by King Frederick II, Fredrikstad is the best-preserved fortified town in Scandinavia. The star-shaped fortress remains intact with its original moat and ramparts.',
        icon: 'shield-outline'
      },
      {
        title: 'Cobblestone Streets',
        text: 'Walk through charming cobblestone streets lined with 17th-century buildings, artisan shops, and cozy cafés. The old town has been continuously inhabited for over 450 years.',
        icon: 'home-outline'
      },
      {
        title: 'Living History',
        text: 'The fortress walls host cultural events, festivals, and theatrical performances. Local artisans still practice traditional crafts in workshops within the old town.',
        icon: 'people-outline'
      }
    ],
    images: [
      'https://source.unsplash.com/800x600/?fredrikstad,norway,fortress,old,town',
      'https://source.unsplash.com/800x600/?norway,historic,fortress,cobblestone',
      'https://source.unsplash.com/800x600/?norway,medieval,town,architecture'
    ],
    bestTimeToVisit: 'June-August',
    duration: '3-4 hours',
    difficulty: 'Easy'
  },
  'Preikestolen (Pulpit Rock)': {
    facts: [
      {
        title: 'Iconic Cliff Formation',
        text: 'Pulpit Rock rises 604 meters above Lysefjorden, featuring a flat-topped cliff approximately 25x25 meters. Formed during the Ice Age by glacial erosion about 10,000 years ago.',
        icon: 'triangle-outline'
      },
      {
        title: 'Popular Hiking Destination',
        text: 'The 8km round-trip hike takes 4-5 hours and attracts over 300,000 visitors annually. The trail offers stunning views of the fjord and surrounding mountains.',
        icon: 'walk-outline'
      },
      {
        title: 'Natural Wonder',
        text: "Despite appearing precarious, geologists say there's no immediate risk of the rock falling. However, the spectacular drop creates an unforgettable experience for visitors.",
        icon: 'warning-outline'
      }
    ],
    images: [
      'https://source.unsplash.com/800x600/?preikestolen,pulpit,rock,cliff,norway',
      'https://source.unsplash.com/800x600/?norway,fjord,lysefjorden,hiking',
      'https://source.unsplash.com/800x600/?norway,cliff,mountain,dramatic'
    ],
    bestTimeToVisit: 'May-September',
    duration: '4-5 hours',
    difficulty: 'Moderate'
  },
  'Bryggen': {
    facts: [
      {
        title: 'UNESCO World Heritage',
        text: 'Bryggen (the wharf) has been a UNESCO World Heritage site since 1979. These colorful wooden buildings date back to the 14th century and represent the Hanseatic League trading post.',
        icon: 'ribbon-outline'
      },
      {
        title: 'Hanseatic Legacy',
        text: 'From 1360 to 1754, Bryggen was the center of the Hanseatic League\'s trading empire in Norway. German merchants lived and worked here, controlling Bergen\'s trade.',
        icon: 'boat-outline'
      },
      {
        title: 'Survived Many Fires',
        text: 'Despite being rebuilt numerous times after devastating fires (most recently in 1955), the area maintains its medieval street plan and distinctive wooden architecture.',
        icon: 'flame-outline'
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
      'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=800'
    ],
    bestTimeToVisit: 'May-September',
    duration: '2-3 hours',
    difficulty: 'Easy'
  },
  'Trolltunga': {
    facts: [
      {
        title: 'Dramatic Rock Formation',
        text: 'Trolltunga (Troll\'s Tongue) is a piece of rock jutting horizontally out from a mountain 700 meters above Lake Ringedalsvatnet. Formed during the Ice Age when glaciers carved the landscape.',
        icon: 'flash-outline'
      },
      {
        title: 'Challenging Hike',
        text: 'The 28km round-trip hike takes 10-12 hours and is one of Norway\'s most spectacular but demanding trails. The route includes steep climbs and exposed sections.',
        icon: 'fitness-outline'
      },
      {
        title: 'Instagram Famous',
        text: 'Once a hidden gem, Trolltunga has become one of Norway\'s most photographed landmarks. Over 80,000 hikers attempt the journey annually, despite the challenge.',
        icon: 'camera-outline'
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
      'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?w=800'
    ],
    bestTimeToVisit: 'June-September',
    duration: '10-12 hours',
    difficulty: 'Challenging'
  },
  'Geirangerfjord': {
    facts: [
      {
        title: 'UNESCO Fjord',
        text: 'Geirangerfjord is a UNESCO World Heritage site, renowned as one of the most beautiful fjords in the world. The 15km fjord features cascading waterfalls and snow-capped peaks.',
        icon: 'water-outline'
      },
      {
        title: 'Seven Sisters Waterfall',
        text: 'The fjord is home to the famous Seven Sisters waterfall (De syv søstrene), which plunges 250 meters into the fjord, along with the "Bridal Veil" and "Suitor" waterfalls.',
        icon: 'rainy-outline'
      },
      {
        title: 'Abandoned Farms',
        text: 'Steep mountainsides feature abandoned farms perched on narrow ledges, accessible only by arduous paths. These farms tell stories of hardy people who once called this dramatic landscape home.',
        icon: 'home-outline'
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
      'https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?w=800',
      'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=800'
    ],
    bestTimeToVisit: 'May-September',
    duration: '4-6 hours (cruise)',
    difficulty: 'Easy'
  },
  'Northern Lights': {
    facts: [
      {
        title: 'Aurora Borealis Magic',
        text: 'The Northern Lights (Aurora Borealis) occur when solar particles collide with gases in Earth\'s atmosphere, creating colorful light displays. Northern Norway offers some of the world\'s best viewing opportunities.',
        icon: 'sparkles-outline'
      },
      {
        title: 'Best Viewing Season',
        text: 'From late September to late March, the polar night in Northern Norway provides ideal darkness for viewing. Tromsø, often called the "Gateway to the Arctic," is a premier viewing location.',
        icon: 'moon-outline'
      },
      {
        title: 'Colors and Myths',
        text: 'The lights appear in shades of green, pink, red, yellow, and violet. Ancient Norse mythology believed the lights were reflections from the armor of the Valkyries leading warriors to Valhalla.',
        icon: 'star-outline'
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=800',
      'https://images.unsplash.com/photo-1579033461380-adb47c3eb938?w=800',
      'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800'
    ],
    bestTimeToVisit: 'September-March',
    duration: 'All night',
    difficulty: 'Easy'
  },
  'Lofoten Islands': {
    facts: [
      {
        title: 'Arctic Archipelago',
        text: 'The Lofoten Islands are an archipelago within the Arctic Circle, known for dramatic scenery with jagged peaks rising directly from the sea, creating a spectacular landscape.',
        icon: 'snow-outline'
      },
      {
        title: 'Fishing Villages',
        text: 'Traditional red fishing cabins (rorbu) dot the coastline. Lofoten has been a fishing center for over 1,000 years, with cod fishing still central to the local economy and culture.',
        icon: 'fish-outline'
      },
      {
        title: 'Midnight Sun',
        text: 'From late May to mid-July, the sun never sets, creating unique opportunities for hiking, kayaking, and photography in 24-hour daylight. Winter brings the magical polar night.',
        icon: 'sunny-outline'
      }
    ],
    images: [
      'https://images.unsplash.com/photo-1517639493569-5666a7556424?w=800',
      'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800',
      'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=800'
    ],
    bestTimeToVisit: 'May-September',
    duration: '3-5 days',
    difficulty: 'Easy-Moderate'
  },
  // More landmarks can be added here with similar structure
};

export default function LandmarkDetailScreen() {
  const { landmark_id } = useLocalSearchParams();
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
      } else {
        console.error('Failed to fetch landmark:', response.status);
      }
    } catch (error) {
      console.error('Error fetching landmark:', error);
    } finally {
      setLoading(false);
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

  // Get enhanced content or use defaults
  const enhancement = LANDMARK_ENHANCEMENTS[landmark.name] || {
    facts: [
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
    ],
    images: [landmark.image_url],
    bestTimeToVisit: 'Year-round',
    duration: '2-3 hours',
    difficulty: 'Easy'
  };

  const currentImage = enhancement.images[selectedImageIndex] || landmark.image_url;

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
        {enhancement.images.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailContainer}
            contentContainerStyle={styles.thumbnailContent}
          >
            {enhancement.images.map((img, index) => (
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
            <Text style={styles.quickInfoValue}>{enhancement.duration}</Text>
          </View>
          <View style={styles.quickInfoCard}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.accent} />
            <Text style={styles.quickInfoLabel}>Best Time</Text>
            <Text style={styles.quickInfoValue}>{enhancement.bestTimeToVisit}</Text>
          </View>
          <View style={styles.quickInfoCard}>
            <Ionicons name="speedometer-outline" size={24} color={theme.colors.accentBronze} />
            <Text style={styles.quickInfoLabel}>Difficulty</Text>
            <Text style={styles.quickInfoValue}>{enhancement.difficulty}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.descriptionText}>{landmark.description}</Text>
        </View>

        {/* Historical & Cultural Facts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discover More</Text>
          {enhancement.facts.map((fact, index) => (
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
});
