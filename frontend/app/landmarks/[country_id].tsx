import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, TouchableOpacity, Platform, StatusBar, Alert } from 'react-native';
import { Text, ActivityIndicator, Surface, FAB, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { safeGoBack } from '../../utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import theme, { gradients } from '../../styles/theme';
import UpgradeModal from '../../components/UpgradeModal';
import ProFeatureLock from '../../components/ProFeatureLock';
import { useSubscription } from '../../hooks/useSubscription';
import { BACKEND_URL } from '../../utils/config';
import { PersistentTabBar } from '../../components/PersistentTabBar';
import { AddDestinationVisitModal } from '../../components/AddCountryVisitModal';
import { HeaderBranding } from '../../components/BrandedGlobeIcon';
import { getToken } from '../utils/token';

// Helper to get token (works on both web and native)

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
  const [showDestinationVisitModal, setShowDestinationVisitModal] = useState(false);
  const [countryProgress, setCountryProgress] = useState<{visited: number; total: number; percentage: number; verified: number; points: number; maxPoints: number} | null>(null);
  const [visitedLandmarkIds, setVisitedLandmarkIds] = useState<Set<string>>(new Set());
  const [isDestinationVisited, setIsDestinationVisited] = useState(false);
  const [destinationVisitId, setDestinationVisitId] = useState<string | null>(null);
  const [destinationVisitSource, setDestinationVisitSource] = useState<string | null>(null);
  const [destinationVisitHasPhotos, setDestinationVisitHasPhotos] = useState(false);
  const [highlights, setHighlights] = useState<any[]>([]);
  
  // All hooks must be called in consistent order
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const subscriptionData = useSubscription();
  const canAccessPremiumLandmarks = subscriptionData.canAccessPremiumLandmarks;
  
  // Calculate safe area padding - same as continents.tsx (golden standard)
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  useEffect(() => {
    fetchHighlights();
  }, []);

  // Re-fetch data and visit status every time screen gets focus (e.g. returning from add-visit)
  useFocusEffect(
    useCallback(() => {
      fetchData();
      checkDestinationVisitStatus();
    }, [country_id])
  );

  const fetchHighlights = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/countries/${country_id}/community-highlights`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setHighlights(data.highlights || []);
      }
    } catch (error) {
    }
  };

  const checkDestinationVisitStatus = async () => {
    try {
      const token = await getToken();
      // Use the new check endpoint that considers both manual visits AND landmark visits
      const response = await fetch(`${BACKEND_URL}/api/country-visits/check/${country_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const visitStatus = await response.json();
        if (visitStatus.visited) {
          setIsDestinationVisited(true);
          setDestinationVisitSource(visitStatus.source || null);
          setDestinationVisitHasPhotos(visitStatus.has_photos || false);
          if (visitStatus.country_visit_id) {
            setDestinationVisitId(visitStatus.country_visit_id);
          }
        } else {
          setIsDestinationVisited(false);
          setDestinationVisitId(null);
          setDestinationVisitSource(null);
          setDestinationVisitHasPhotos(false);
        }
      }
    } catch (error) {
    }
  };

  const fetchData = async () => {
    try {
      const token = await getToken();
      
      const [landmarksResponse, visitsResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/landmarks?country_id=${country_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/visits`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
      ]);

      let landmarkVisits: any[] = [];
      if (visitsResponse.ok) {
        const allVisits = await visitsResponse.json();
        landmarkVisits = allVisits.filter((v: any) => v.landmark_id?.startsWith(country_id + '_'));
      }

      if (landmarksResponse.ok) {
        const data = await landmarksResponse.json();
        setLandmarks(data);
        
        // Compute visited IDs from landmarks response (already has is_visited)
        const visitedIds = new Set<string>(
          data.filter((l: any) => l.is_visited).map((l: any) => l.landmark_id)
        );
        setVisitedLandmarkIds(visitedIds);
        
        // Compute country progress with verified/points from visits data
        const totalLandmarks = data.length;
        const visitedCount = visitedIds.size;
        const verifiedCount = landmarkVisits.filter((v: any) => v.verified).length;
        const totalPoints = landmarkVisits.reduce((sum: number, v: any) => sum + (v.points_earned || 0), 0);
        const maxPoints = data.reduce((sum: number, lm: any) => sum + (lm.points || 10), 0);
        
        if (totalLandmarks > 0) {
          setCountryProgress({
            visited: visitedCount,
            total: totalLandmarks,
            percentage: Math.round((visitedCount / totalLandmarks) * 1000) / 10,
            verified: verifiedCount,
            points: totalPoints,
            maxPoints: maxPoints,
          });
        }
      }
    } catch (error) {
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
  };

  const handleDestinationVisitAction = () => {
    if (!isDestinationVisited) {
      // Destination visit
      setShowDestinationVisitModal(true);
    } else if (destinationVisitId) {
      // Visited — always navigate to view/edit visit details
      router.push(`/country-visit-detail/${destinationVisitId}`);
    } else {
      // Fallback: open modal to add content
      setShowDestinationVisitModal(true);
    }
  };

  const getFabConfig = () => {
    if (!isDestinationVisited) {
      return { 
        text: 'Mark as Visited', 
        colors: [theme.colors.primary, theme.colors.secondary],
        icon: 'checkmark-circle',
        subText: null 
      };
    }
    
    return { 
      text: 'Visited', 
      colors: ['#4CAF50', '#66BB6A'],
      icon: 'checkmark-circle',
      subText: 'View visit' 
    };
  };

  const handleRemoveDestinationVisit = async () => {
    // If no country_visit_id, the visit was detected via landmarks only
    // In this case, we can't remove it directly - need to inform the user
    if (!destinationVisitId) {
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
              const response = await fetch(`${BACKEND_URL}/api/country-visits/${destinationVisitId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                // Re-check status because they might still be "visited" via landmarks
                await checkDestinationVisitStatus();
                Alert.alert('Success', 'Destination visit removed successfully');
              } else {
                Alert.alert('Error', 'Failed to remove destination visit');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove destination visit');
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
            
            {/* Right: chevron */}
            <View style={styles.landmarkActionIcon}>
              <Ionicons name="chevron-forward" size={20} color="rgba(0,0,0,0.3)" />
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
                onPress={() => safeGoBack(router)} 
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
              onPress={() => safeGoBack(router)} 
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
          <>
            {countryProgress ? (
              <Surface style={styles.progressHeader}>
                <View style={styles.progressTitleRow}>
                  <Text style={styles.progressTitle}>Landmark Progress</Text>
                  <View style={styles.progressPointsBadge}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.progressPointsText}>{countryProgress.points} pts</Text>
                  </View>
                </View>

                <View style={styles.progressRow}>
                  <Ionicons name="location" size={16} color="#E87850" />
                  <View style={styles.progressBarContent}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>{countryProgress.visited}/{countryProgress.total} Landmarks</Text>
                      <Text style={styles.progressPct}>{countryProgress.percentage}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(100, countryProgress.percentage)}%`, backgroundColor: '#E87850' }]} />
                    </View>
                  </View>
                </View>

                <View style={styles.progressRow}>
                  <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
                  <View style={styles.progressBarContent}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>{countryProgress.verified}/{countryProgress.visited} Verified</Text>
                      <Text style={styles.progressPct}>{countryProgress.visited > 0 ? Math.round((countryProgress.verified / countryProgress.visited) * 100) : 0}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${countryProgress.visited > 0 ? Math.min(100, (countryProgress.verified / countryProgress.visited) * 100) : 0}%`, backgroundColor: '#4CAF50' }]} />
                    </View>
                  </View>
                </View>

                <View style={styles.progressRow}>
                  <Ionicons name="star" size={16} color="#FFA726" />
                  <View style={styles.progressBarContent}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>{countryProgress.points}/{countryProgress.maxPoints} Points</Text>
                      <Text style={styles.progressPct}>{countryProgress.maxPoints > 0 ? ((countryProgress.points / countryProgress.maxPoints) * 100).toFixed(1) : 0}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${countryProgress.maxPoints > 0 ? Math.min(100, (countryProgress.points / countryProgress.maxPoints) * 100) : 0}%`, backgroundColor: '#FFA726' }]} />
                    </View>
                  </View>
                </View>

                {countryProgress.percentage === 100 && (
                  <Text style={styles.congratsText}>All landmarks visited!</Text>
                )}
              </Surface>
            ) : null}

            <TouchableOpacity
              style={styles.communityPhotosLink}
              onPress={() => router.push(`/country-community-photos/${country_id}?name=${encodeURIComponent(String(name || ''))}`)}
              activeOpacity={0.7}
              data-testid="country-community-photos-btn"
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.communityPhotosGradient}
              >
                <Ionicons name="images" size={20} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.communityPhotosTitle}>Community photos</Text>
                  <Text style={styles.communityPhotosSub}>Photos from travelers in {name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color={theme.colors.border} />
            <Text style={styles.emptyText}>No landmarks found</Text>
          </View>
        }
      />

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        {/* Destination Visit FAB */}
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleDestinationVisitAction}
          activeOpacity={0.8}
          data-testid="country-visit-fab"
        >
          <LinearGradient
            colors={getFabConfig().colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fabGradient}
          >
            <Ionicons name={getFabConfig().icon} size={24} color="#fff" />
            <Text style={styles.fabText}>
              {getFabConfig().text}
            </Text>
            {getFabConfig().subText && (
              <View style={styles.fabRemoveHint}>
                <Text style={styles.fabRemoveHintText}>{getFabConfig().subText}</Text>
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
      
      {/* Destination Visit Modal */}
      <AddDestinationVisitModal
        visible={showDestinationVisitModal}
        countryId={country_id as string}
        countryName={name as string}
        onClose={() => setShowDestinationVisitModal(false)}
        onSuccess={() => {
          setIsDestinationVisited(true);
          checkDestinationVisitStatus();
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
  upgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  upgradeHintText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
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
  progressTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  progressPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressPointsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFA726',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  progressBarContent: {
    flex: 1,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textLight,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fab: {
    flex: 1,
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
  // Community Photos Link
  communityPhotosLink: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  communityPhotosGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  communityPhotosTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  communityPhotosSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  // Community Highlights
  highlightsSection: {
    marginBottom: theme.spacing.md,
  },
  highlightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  highlightsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  highlightsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  highlightCard: {
    flex: 1,
    height: 120,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  highlightImage: {
    width: '100%',
    height: '100%',
  },
  highlightOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 30,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  highlightName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  highlightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  highlightStat: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '600',
  },
  highlightBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
