import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { Text, ActivityIndicator, Surface, FAB, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import theme, { gradients } from '../../styles/theme';
import UpgradeModal from '../../components/UpgradeModal';
import { BACKEND_URL } from '../../utils/config';
import { ProgressBar } from '../../components/ProgressBar';
import { PersistentTabBar } from '../../components/PersistentTabBar';

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
  const [countryProgress, setCountryProgress] = useState<{visited: number; total: number; percentage: number} | null>(null);
  const [visitedLandmarkIds, setVisitedLandmarkIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

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
        const visitedIds = new Set(visitsData.map((v: any) => v.landmark_id));
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
      // Show upgrade modal for locked landmarks
      setShowUpgradeModal(true);
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
                color={isPremium ? "#FFD700" : theme.colors.primary} 
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
                    color={isPremium ? "#FFD700" : "#FFA726"} 
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={gradients.primary.colors}
        start={gradients.primary.start}
        end={gradients.primary.end}
        style={styles.header}
      >
        {/* Branding Row */}
        <View style={styles.brandingRow}>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <Ionicons name="earth" size={18} color="#fff" />
            <Text style={styles.brandingText}>WanderList</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <View style={styles.profileCircle}>
              <Text style={styles.profileInitial}>U</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Title Row with Back Button */}
        <View style={styles.titleRow}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{name}</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={landmarks}
        renderItem={renderLandmark}
        keyExtractor={(item) => item.landmark_id}
        contentContainerStyle={[styles.listContainer, { paddingBottom: Platform.OS === 'ios' ? 100 : 90 }]}
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

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />
      <PersistentTabBar />
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
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  brandingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  profileButton: {
    padding: 2,
  },
  profileCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
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
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
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
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  premiumBadgeText: {
    ...theme.typography.caption,
    color: '#B8860B',
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
});
