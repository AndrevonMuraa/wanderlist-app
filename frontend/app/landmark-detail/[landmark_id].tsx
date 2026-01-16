import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  Dimensions,
  Alert 
} from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';
import UniversalHeader from '../../components/UniversalHeader';

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
  const [inBucketList, setInBucketList] = useState(false);
  const [bucketListId, setBucketListId] = useState<string | null>(null);
  const [bucketListLoading, setBucketListLoading] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [visitId, setVisitId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchLandmark();
    checkBucketListStatus();
    checkVisitStatus();
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

  const checkVisitStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/visits`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const visits = await response.json();
        const visit = visits.find((v: any) => v.landmark_id === landmark_id);
        if (visit) {
          setIsVisited(true);
          setVisitId(visit.visit_id);
        }
      }
    } catch (error) {
      console.error('Error checking visit status:', error);
    }
  };

  const checkBucketListStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/bucket-list/check/${landmark_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setInBucketList(data.in_bucket_list);
        setBucketListId(data.bucket_list_id);
      }
    } catch (error) {
      console.error('Error checking bucket list:', error);
    }
  };

  const handleToggleBucketList = async () => {
    if (bucketListLoading) return;

    setBucketListLoading(true);
    try {
      const token = await getToken();

      if (inBucketList && bucketListId) {
        // Remove from bucket list
        const response = await fetch(`${BACKEND_URL}/api/bucket-list/${bucketListId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          setInBucketList(false);
          setBucketListId(null);
        }
      } else {
        // Add to bucket list
        const response = await fetch(`${BACKEND_URL}/api/bucket-list`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ landmark_id }),
        });

        if (response.ok) {
          const result = await response.json();
          setInBucketList(true);
          setBucketListId(result.bucket_list_id);
        }
      }
    } catch (error) {
      console.error('Error toggling bucket list:', error);
    } finally {
      setBucketListLoading(false);
    }
  };

  const handleMarkAsVisited = () => {
    router.push(`/add-visit/${landmark_id}?name=${encodeURIComponent(landmark?.name || '')}`);
  };

  const handleUnmarkVisit = async () => {
    if (!visitId) return;
    
    Alert.alert(
      'Remove Visit',
      'Are you sure you want to remove this visit? This will also remove any points earned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              const response = await fetch(`${BACKEND_URL}/api/visits/${visitId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                setIsVisited(false);
                setVisitId(null);
                Alert.alert('Success', 'Visit removed successfully');
              } else {
                Alert.alert('Error', 'Failed to remove visit');
              }
            } catch (error) {
              console.error('Error removing visit:', error);
              Alert.alert('Error', 'Failed to remove visit');
            }
          },
        },
      ]
    );
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback to explore page if no history
      router.replace('/continents');
    }
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
      <View style={styles.container}>
        <UniversalHeader title="Loading..." />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading landmark...</Text>
        </View>
      </View>
    );
  }

  if (!landmark) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="Landmark Not Found" />

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.colors.accent} />
          <Text style={styles.errorText}>Landmark not found</Text>
          <Text style={styles.errorSubtext}>This landmark may have been removed</Text>
          <TouchableOpacity 
            style={styles.backButtonCard}
            onPress={handleGoBack}
          >
            <LinearGradient
              colors={[theme.colors.ocean, theme.colors.primary]}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back-circle" size={20} color="#fff" />
              <Text style={styles.backButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isPremium = landmark.category === 'premium';

  return (
    <View style={styles.container}>
      <UniversalHeader 
        title={landmark.name}
        rightElement={
          <TouchableOpacity
            onPress={handleToggleBucketList}
            style={styles.headerRight}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={bucketListLoading}
          >
            <Ionicons
              name={inBucketList ? "heart" : "heart-outline"}
              size={24}
              color={inBucketList ? "#FF6B6B" : "#fff"}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section - Icon Based */}
        <Surface style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={[
              styles.landmarkIconLarge,
              isPremium ? styles.landmarkIconPremium : styles.landmarkIconOfficial
            ]}>
              <Ionicons 
                name={isPremium ? "diamond" : "location"} 
                size={56} 
                color={isPremium ? "#FFD700" : theme.colors.primary} 
              />
            </View>
            
            <Text style={styles.landmarkName}>{landmark.name}</Text>
            
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={theme.colors.primary} />
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
        </Surface>

        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>About This Landmark</Text>
          </View>
          <Surface style={styles.card}>
            <Text style={styles.description}>{landmark.description}</Text>
          </Surface>
        </View>

        {/* Quick Info Section - Only Difficulty */}
        {landmark.difficulty && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Quick Info</Text>
            </View>
            <Surface style={styles.card}>
              <View style={styles.difficultyRow}>
                <Ionicons 
                  name={getDifficultyIcon(landmark.difficulty)} 
                  size={28} 
                  color={getDifficultyColor(landmark.difficulty)} 
                />
                <View style={styles.difficultyContent}>
                  <Text style={styles.quickInfoLabel}>Difficulty Level</Text>
                  <Text style={[
                    styles.quickInfoValue,
                    { color: getDifficultyColor(landmark.difficulty) }
                  ]}>
                    {landmark.difficulty}
                  </Text>
                </View>
              </View>
            </Surface>
          </View>
        )}

        {/* Coordinates Section */}
        {landmark.latitude && landmark.longitude && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="compass" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Coordinates</Text>
            </View>
            <Surface style={styles.card}>
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
          </View>
        )}

        {/* Facts Section */}
        {landmark.facts && landmark.facts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Did You Know?</Text>
            </View>
            <Surface style={styles.card}>
              {landmark.facts.map((fact, index) => (
                <View key={index} style={[
                  styles.factItem,
                  index < landmark.facts!.length - 1 && styles.factItemBorder
                ]}>
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
          </View>
        )}

        {/* Community Section */}
        {landmark.category === 'user_suggested' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Community</Text>
            </View>
            <Surface style={styles.card}>
              <View style={styles.upvotesRow}>
                <Ionicons name="arrow-up-circle" size={24} color={theme.colors.primary} />
                <Text style={styles.upvotesText}>
                  {landmark.upvotes} {landmark.upvotes === 1 ? 'upvote' : 'upvotes'}
                </Text>
              </View>
            </Surface>
          </View>
        )}

        <View style={{ height: 120 }} />
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
            onPress={() => Alert.alert('Premium Required', 'Upgrade to Premium to visit this landmark')}
            activeOpacity={0.8}
          >
            <Surface style={styles.fabLocked}>
              <Ionicons name="lock-closed" size={24} color={theme.colors.accent} />
              <Text style={styles.fabTextLocked}>Upgrade to Visit</Text>
            </Surface>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  errorSubtext: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  backButtonCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  backButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButtonText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  headerRight: {
    padding: theme.spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  // Hero Card
  heroCard: {
    margin: theme.spacing.lg,
    marginBottom: 0,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
  },
  heroContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  landmarkIconLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    color: theme.colors.text,
    fontWeight: '500',
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
    backgroundColor: theme.colors.background,
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
  // Sections
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
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
    gap: theme.spacing.sm,
  },
  quickInfoCard: {
    flex: 1,
    minWidth: (width - theme.spacing.lg * 2 - theme.spacing.sm) / 2,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  quickInfoLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  quickInfoValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: theme.spacing.xs / 2,
    textAlign: 'center',
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  difficultyContent: {
    flex: 1,
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
    paddingVertical: theme.spacing.md,
  },
  factItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    gap: theme.spacing.sm,
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
    paddingVertical: theme.spacing.md + 2,
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
    paddingVertical: theme.spacing.md + 2,
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
