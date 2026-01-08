import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  Dimensions 
} from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

const BACKEND_URL = Platform.OS === 'web' 
  ? '' 
  : (process.env.EXPO_PUBLIC_BACKEND_URL || '');

const { width } = Dimensions.get('window');

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
  facts?: LandmarkFact[];
  best_time_to_visit?: string;
  duration?: string;
  difficulty?: string;
  latitude?: number | null;
  longitude?: number | null;
  category: string;
  points: number;
  upvotes: number;
  is_locked?: boolean;
}

export default function LandmarkDetailScreen() {
  const { landmark_id } = useLocalSearchParams();
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLandmark();
  }, []);

  const fetchLandmark = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/landmarks/${landmark_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLandmark(data);
      }
    } catch (error) {
      console.error('Error fetching landmark:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsVisited = () => {
    router.push(`/add-visit/${landmark_id}?name=${encodeURIComponent(landmark?.name || '')}`);
  };

  const getDifficultyColor = (difficulty?: string) => {
    if (!difficulty) return theme.colors.textLight;
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '#4CAF50';
      case 'moderate':
        return '#FFA726';
      case 'challenging':
        return '#FF6B6B';
      default:
        return theme.colors.textLight;
    }
  };

  const getDifficultyIcon = (difficulty?: string) => {
    if (!difficulty) return 'help-circle';
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'walk';
      case 'moderate':
        return 'trail-sign';
      case 'challenging':
        return 'fitness';
      default:
        return 'help-circle';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading landmark...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!landmark) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.accent} />
          <Text style={styles.errorText}>Landmark not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPremium = landmark.category === 'premium';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {landmark.name}
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section - Icon Based */}
        <View style={styles.heroSection}>
          <View style={[
            styles.landmarkIconLarge,
            isPremium ? styles.landmarkIconPremium : styles.landmarkIconOfficial
          ]}>
            <Ionicons 
              name={isPremium ? "diamond" : "location"} 
              size={64} 
              color={isPremium ? "#FFD700" : theme.colors.primary} 
            />
          </View>
          
          <Text style={styles.landmarkName}>{landmark.name}</Text>
          
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.locationText}>
              {landmark.country_name} • {landmark.continent}
            </Text>
          </View>

          <View style={styles.badgesRow}>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={12} color="#B8860B" />
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </View>
            )}
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.pointsBadgeText}>{landmark.points} points</Text>
            </View>
          </View>
        </View>

        {/* Description Card */}
        <Surface style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>About</Text>
          </View>
          <Text style={styles.description}>{landmark.description}</Text>
        </Surface>

        {/* Quick Info Grid */}
        <View style={styles.quickInfoGrid}>
          {landmark.best_time_to_visit && (
            <Surface style={styles.quickInfoCard}>
              <Ionicons name="calendar" size={28} color={theme.colors.primary} />
              <Text style={styles.quickInfoLabel}>Best Time</Text>
              <Text style={styles.quickInfoValue}>{landmark.best_time_to_visit}</Text>
            </Surface>
          )}

          {landmark.duration && (
            <Surface style={styles.quickInfoCard}>
              <Ionicons name="time" size={28} color={theme.colors.primary} />
              <Text style={styles.quickInfoLabel}>Duration</Text>
              <Text style={styles.quickInfoValue}>{landmark.duration}</Text>
            </Surface>
          )}

          {landmark.difficulty && (
            <Surface style={styles.quickInfoCard}>
              <Ionicons 
                name={getDifficultyIcon(landmark.difficulty)} 
                size={28} 
                color={getDifficultyColor(landmark.difficulty)} 
              />
              <Text style={styles.quickInfoLabel}>Difficulty</Text>
              <Text style={[
                styles.quickInfoValue,
                { color: getDifficultyColor(landmark.difficulty) }
              ]}>
                {landmark.difficulty}
              </Text>
            </Surface>
          )}
        </View>

        {/* Coordinates Card */}
        {landmark.latitude && landmark.longitude && (
          <Surface style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="compass" size={24} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>Coordinates</Text>
            </View>
            <View style={styles.coordinatesRow}>
              <View style={styles.coordinate}>
                <Text style={styles.coordinateLabel}>Latitude</Text>
                <Text style={styles.coordinateValue}>
                  {landmark.latitude.toFixed(6)}°
                </Text>
              </View>
              <View style={styles.coordinateDivider} />
              <View style={styles.coordinate}>
                <Text style={styles.coordinateLabel}>Longitude</Text>
                <Text style={styles.coordinateValue}>
                  {landmark.longitude.toFixed(6)}°
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Facts Card */}
        {landmark.facts && landmark.facts.length > 0 && (
          <Surface style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bulb" size={24} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>Did You Know?</Text>
            </View>
            {landmark.facts.map((fact, index) => (
              <View key={index} style={styles.factItem}>
                <View style={styles.factIconContainer}>
                  <Ionicons 
                    name={fact.icon as any} 
                    size={20} 
                    color={theme.colors.primary} 
                  />
                </View>
                <View style={styles.factContent}>
                  <Text style={styles.factTitle}>{fact.title}</Text>
                  <Text style={styles.factText}>{fact.text}</Text>
                </View>
              </View>
            ))}
          </Surface>
        )}

        {/* Upvotes Card */}
        {landmark.category === 'user_suggested' && (
          <Surface style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="heart" size={24} color={theme.colors.accent} />
              <Text style={styles.cardTitle}>Community</Text>
            </View>
            <View style={styles.upvotesRow}>
              <Ionicons name="arrow-up-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.upvotesText}>
                {landmark.upvotes} {landmark.upvotes === 1 ? 'upvote' : 'upvotes'}
              </Text>
            </View>
          </Surface>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      {!landmark.is_locked && (
        <View style={styles.fabContainer}>
          <TouchableOpacity 
            style={styles.fab}
            onPress={handleMarkAsVisited}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fabGradient}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.fabText}>Mark as Visited</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Locked Overlay */}
      {landmark.is_locked && (
        <View style={styles.fabContainer}>
          <TouchableOpacity 
            style={styles.fab}
            onPress={() => {/* Show upgrade modal */}}
            activeOpacity={0.8}
          >
            <View style={styles.fabLocked}>
              <Ionicons name="lock-closed" size={24} color={theme.colors.accent} />
              <Text style={styles.fabTextLocked}>Upgrade to Visit</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  backButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerButton: {
    padding: theme.spacing.xs,
    width: 40,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  landmarkIconLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  landmarkIconOfficial: {
    backgroundColor: 'rgba(32, 178, 170, 0.1)',
    borderWidth: 3,
    borderColor: 'rgba(32, 178, 170, 0.3)',
  },
  landmarkIconPremium: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 3,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  landmarkName: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: theme.spacing.md,
  },
  locationText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  premiumBadgeText: {
    ...theme.typography.caption,
    color: '#B8860B',
    fontWeight: '700',
    fontSize: 10,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pointsBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 11,
  },
  // Cards
  card: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  // Quick Info Grid
  quickInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  quickInfoCard: {
    flex: 1,
    minWidth: (width - theme.spacing.lg * 2 - theme.spacing.sm) / 2,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  quickInfoLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  quickInfoValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  // Coordinates
  coordinatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordinate: {
    flex: 1,
    alignItems: 'center',
  },
  coordinateDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  coordinateLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs / 2,
  },
  coordinateValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  // Facts
  factItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  factIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(32, 178, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  factContent: {
    flex: 1,
  },
  factTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs / 2,
  },
  factText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  // Upvotes
  upvotesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  upvotesText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  // Floating Action Button
  fabContainer: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
  },
  fab: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  fabText: {
    ...theme.typography.h3,
    color: '#fff',
    fontWeight: '700',
  },
  fabLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  fabTextLocked: {
    ...theme.typography.h3,
    color: theme.colors.accent,
    fontWeight: '700',
  },
});
