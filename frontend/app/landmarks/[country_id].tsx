import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, TouchableOpacity, Platform, StatusBar, Alert } from 'react-native';
import { Text, ActivityIndicator, Surface, FAB, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import theme, { gradients } from '../../styles/theme';
import UpgradeModal from '../../components/UpgradeModal';
import ProFeatureLock from '../../components/ProFeatureLock';
import { useSubscription } from '../../hooks/useSubscription';
import { BACKEND_URL } from '../../utils/config';
import { ProgressBar } from '../../components/ProgressBar';
import { PersistentTabBar } from '../../components/PersistentTabBar';
import { AddCountryVisitModal } from '../../components/AddCountryVisitModal';
import { HeaderBranding } from '../../components/BrandedGlobeIcon';

// Helper to get token (works on both web and native)
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
  points?: number;
  is_locked?: boolean;
}

export default function LandmarksScreen() {
  const { country_id, name } = useLocalSearchParams();
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showProLock, setShowProLock] = useState(false);
  const [showCountryVisitModal, setShowCountryVisitModal] = useState(false);
  const [countryProgress, setCountryProgress] = useState<{visited: number; total: number; percentage: number} | null>(null);
  const [visitedLandmarkIds, setVisitedLandmarkIds] = useState<Set<string>>(new Set());
  const [isCountryVisited, setIsCountryVisited] = useState(false);
  const [countryVisitId, setCountryVisitId] = useState<string | null>(null);
  
  // All hooks must be called in consistent order
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const subscriptionData = useSubscription();
  const canAccessPremiumLandmarks = subscriptionData.canAccessPremiumLandmarks;
  
  // Calculate safe area padding - same as continents.tsx (golden standard)
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  useEffect(() => {
    fetchData();
    checkCountryVisitStatus();
  }, []);

  const checkCountryVisitStatus = async () => {
    try {
      const token = await getToken();
      // Use the new check endpoint that considers both manual visits AND landmark visits
      const response = await fetch(`${BACKEND_URL}/api/country-visits/check/${country_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const visitStatus = await response.json();
        if (visitStatus.visited) {
          setIsCountryVisited(true);
          // Only set countryVisitId if there's an actual record (not just landmark-based)
          if (visitStatus.country_visit_id) {
            setCountryVisitId(visitStatus.country_visit_id);
          }
        } else {
          setIsCountryVisited(false);
          setCountryVisitId(null);
        }
      }
    } catch (error) {
      console.error('Error checking country visit status:', error);
    }
  };

  const fetchData = async () => {
    try {
      const token = await getToken();
      console.log('Fetching landmarks for country:', country_id);
      
      // Fetch landmarks and progress in parallel
      const [landmarksResponse, progressResponse, visitsResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/landmarks?country_id=${country_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/progress`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/visits`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      console.log('Landmarks API response status:', landmarksResponse.status);

      if (landmarksResponse.ok) {
        const data = await landmarksResponse.json();
        console.log('Landmarks fetched:', data.length, 'including', data.filter((l: Landmark) => l.is_locked).length, 'locked premium');
        setLandmarks(data);
      }
      
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        const countryData = progressData.countries[country_id as string];
        if (countryData) {
          setCountryProgress({
            visited: countryData.visited,
            total: countryData.total,
            percentage: countryData.percentage
          });
        }
      }
      
      if (visitsResponse.ok) {
        const visitsData = await visitsResponse.json();
        const visitedIds = new Set<string>(visitsData.map((v: any) => v.landmark_id));
        setVisitedLandmarkIds(visitedIds);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLandmarkPress = (landmark: Landmark) => {
    if (landmark.is_locked) {
      // Show pro feature lock modal for locked premium landmarks
      setShowProLock(true);
    } else {
      // Navigate to landmark detail for unlocked landmarks
      router.push(`/landmark-detail/${landmark.landmark_id}`);
    }
  };

  const handleUpgrade = (tier: 'basic' | 'premium') => {
    // In a real app, this would trigger payment flow
    // For now, just close the modal
    setShowUpgradeModal(false);
    // TODO: Integrate with payment provider (Stripe/RevenueCat)
    console.log('User wants to upgrade to:', tier);
  };

  const handleRemoveCountryVisit = async () => {
    // If no country_visit_id, the visit was detected via landmarks only
    // In this case, we can't remove it directly - need to inform the user
    if (!countryVisitId) {
      Alert.alert(
        'Cannot Remove',
        `This country is marked as visited because you have visited landmarks here. To unmark the country, you would need to remove your individual landmark visits.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    Alert.alert(
      'Remove Visit',
      `Are you sure you want to remove your visit to ${name}? This will also remove any photos and points earned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              const response = await fetch(`${BACKEND_URL}/api/country-visits/${countryVisitId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                // Re-check status because they might still be "visited" via landmarks
                await checkCountryVisitStatus();
                Alert.alert('Success', 'Country visit removed successfully');
              } else {
                Alert.alert('Error', 'Failed to remove country visit');
              }
            } catch (error) {
              console.error('Error removing country visit:', error);
              Alert.alert('Error', 'Failed to remove country visit');
            }
          },
        },
      ]
    );
  };

  const renderLandmark = ({ item }: { item: Landmark }) => {
    const isVisited = visitedLandmarkIds.has(item.landmark_id);
    const isPremium = item.category === 'premium';
    
    return (
      <TouchableOpacity
        onPress={() => handleLandmarkPress(item)}
        activeOpacity={0.7}
        style={styles.landmarkItemContainer}
      >
        <Surface style={[
          styles.landmarkListCard,
          item.is_locked && styles.landmarkListCardLocked
        ]}>
          <View style={styles.landmarkContent}>
            {/* Left: Icon */}
            <View style={[
              styles.landmarkIconContainer,
              isPremium ? styles.landmarkIconPremium : styles.landmarkIconOfficial
            ]}>
              <Ionicons 
                name={isPremium ? "diamond" : "location"} 
                size={20} 
                color={isPremium ? "#1E8A8A" : theme.colors.primary} 
              />
            </View>
            
            {/* Middle: Content */}
            <View style={styles.landmarkTextContainer}>
              <Text style={[
                styles.landmarkListName,
                item.is_locked && styles.landmarkListNameLocked
              ]} numberOfLines={1}>
                {item.name}
              </Text>
              
              {/* Points and Category */}
              <View style={styles.landmarkMetaRow}>
                <View style={styles.pointsContainer}>
                  <Ionicons 
                    name="star" 
                    size={12} 
                    color={isPremium ? "#1E8A8A" : "#FFA726"} 
                  />
                  <Text style={styles.pointsTextList}>
                    {item.points || 10} pts
                  </Text>
                </View>
                
                {isPremium && (
                  <View style={styles.premiumBadgeList}>
                    <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                  </View>
                )}
                
                {isVisited && (
                  <View style={styles.visitedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                    <Text style={styles.visitedText}>Visited</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Right: Lock icon or chevron */}
            <View style={styles.landmarkActionIcon}>
              {item.is_locked ? (
                <Ionicons name="lock-closed" size={20} color="rgba(0,0,0,0.3)" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="rgba(0,0,0,0.3)" />
              )}
            </View>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gradients.oceanToSand}
          start={gradients.horizontal.start}
          end={gradients.horizontal.end}
          style={[styles.header, { paddingTop: topPadding }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleWithBack}>
              <TouchableOpacity 
                onPress={() => router.back()} 
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{name || 'Loading...'}</Text>
            </View>
            <View style={styles.brandingContainer}>
              <HeaderBranding size={18} textColor="#2A2A2A" />
            </View>
          </View>
        </LinearGradient>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sticky Header - with paddingTop for safe area */}
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding }]}
      >
        {/* Single Row: Back + Title Left, Branding Right */}
        <View style={styles.headerRow}>
          <View style={styles.titleWithBack}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <HeaderBranding size={18} textColor="#2A2A2A" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={landmarks}
        renderItem={renderLandmark}
        keyExtractor={(item) => item.landmark_id}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 200 }]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          countryProgress ? (
            <Surface style={styles.progressHeader}>
              <View style={styles.progressHeaderContent}>
                <View style={styles.progressHeaderTextRow}>
                  <Text style={styles.progressHeaderTitle}>Your Progress</Text>
                  <View style={styles.progressStatsRow}>
                    <Text style={styles.progressStatsText}>
                      {countryProgress.visited}/{countryProgress.total} landmarks
                    </Text>
                    {countryProgress.percentage === 100 && (
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={{ marginLeft: 6 }} />
                    )}
                  </View>
                </View>
                <ProgressBar
                  percentage={countryProgress.percentage}
                  height={8}
                  showPercentage={false}
                  color={countryProgress.percentage === 100 ? '#4CAF50' : theme.colors.primary}
                  style={{ marginTop: theme.spacing.sm }}
                />
                {countryProgress.percentage === 100 && (
                  <Text style={styles.congratsText}>🎉 All landmarks visited!</Text>
                )}
              </View>
            </Surface>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color={theme.colors.border} />
            <Text style={styles.emptyText}>No landmarks found</Text>
          </View>
        }
      />

      {/* Floating Action Button - Mark Country as Visited */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={isCountryVisited ? handleRemoveCountryVisit : () => setShowCountryVisitModal(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isCountryVisited ? ['#4CAF50', '#66BB6A'] : [theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fabGradient}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.fabText}>
              {isCountryVisited ? "Visited" : "Mark as Visited"}
            </Text>
            {isCountryVisited && (
              <View style={styles.fabRemoveHint}>
                <Text style={styles.fabRemoveHintText}>Tap to remove</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />
      
      {/* Pro Feature Lock Modal */}
      <ProFeatureLock
        visible={showProLock}
        onClose={() => setShowProLock(false)}
        feature="premium_landmarks"
      />
      
      {/* Country Visit Modal */}
      <AddCountryVisitModal
        visible={showCountryVisitModal}
        countryId={country_id as string}
        countryName={name as string}
        onClose={() => setShowCountryVisitModal(false)}
        onSuccess={() => {
          setIsCountryVisited(true);
          checkCountryVisitStatus();
          fetchData();
        }}
      />
      
      <PersistentTabBar />
    </View>
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
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  titleWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandingTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  // New List-Based Landmark Cards
  landmarkItemContainer: {
    marginBottom: theme.spacing.sm,
  },
  landmarkListCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  landmarkListCardLocked: {
    opacity: 0.75,
  },
  landmarkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    minHeight: 72,
  },
  // Landmark Icon (Left Side)
  landmarkIconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  landmarkIconOfficial: {
    backgroundColor: 'rgba(32, 178, 170, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(32, 178, 170, 0.3)',
  },
  landmarkIconPremium: {
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(118, 75, 162, 0.4)',
  },
  // Text Container (Middle)
  landmarkTextContainer: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  landmarkListName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.xs / 2,
  },
  landmarkListNameLocked: {
    color: theme.colors.textSecondary,
  },
  landmarkMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsTextList: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    fontSize: 12,
  },
  premiumBadgeList: {
    backgroundColor: 'rgba(118, 75, 162, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(118, 75, 162, 0.3)',
  },
  premiumBadgeText: {
    ...theme.typography.caption,
    color: '#1E8A8A',
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  visitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  visitedText: {
    ...theme.typography.caption,
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 11,
  },
  // Action Icon (Right Side)
  landmarkActionIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
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
  progressHeader: {
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  progressHeaderContent: {
    width: '100%',
  },
  progressHeaderTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  progressHeaderTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  progressStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStatsText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  congratsText: {
    ...theme.typography.body,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  // Floating Action Button - matching landmark-detail style
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 90,
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
  fabRemoveHint: {
    marginLeft: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.borderRadius.sm,
  },
  fabRemoveHintText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
});
