import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { Text, ActivityIndicator, Surface, FAB, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import theme from '../../styles/theme';
import UpgradeModal from '../../components/UpgradeModal';
import { BACKEND_URL } from '../../utils/config';
import { ProgressBar } from '../../components/ProgressBar';

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
  const router = useRouter();

  useEffect(() => {
    fetchLandmarks();
  }, []);

  const fetchLandmarks = async () => {
    try {
      const token = await getToken();
      console.log('Fetching landmarks for country:', country_id);
      
      // Fetch ALL landmarks (official + premium)
      // Backend will mark premium as locked for free users
      const response = await fetch(
        `${BACKEND_URL}/api/landmarks?country_id=${country_id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Landmarks API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Landmarks fetched:', data.length, 'including', data.filter((l: Landmark) => l.is_locked).length, 'locked premium');
        setLandmarks(data);
      } else {
        console.error('Failed to fetch landmarks:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      }
    } catch (error) {
      console.error('Error fetching landmarks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLandmarks();
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

  const renderLandmark = ({ item }: { item: Landmark }) => (
    <TouchableOpacity
      onPress={() => handleLandmarkPress(item)}
      activeOpacity={0.7}
    >
      <Surface style={styles.landmarkCard}>
        {/* Image with blur for locked content */}
        <Image
          source={{ uri: item.image_url }}
          style={[
            styles.landmarkImage,
            item.is_locked && styles.blurredImage
          ]}
          blurRadius={item.is_locked ? 8 : 0}
        />
        
        {/* Subtle Premium Badge - Top Right */}
        {item.category === 'premium' && (
          <View style={styles.premiumBadgeSubtle}>
            <View style={styles.premiumBadgeBlur}>
              <Ionicons name="diamond-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.premiumTextSubtle}>PREMIUM</Text>
            </View>
          </View>
        )}
        
        {/* Frosted Glass Overlay for Locked Landmarks */}
        {item.is_locked && (
          <View style={styles.frostedOverlay}>
            {/* Subtle Lock Icon - White/Transparent */}
            <View style={styles.lockIconSubtle}>
              <Ionicons name="lock-closed" size={40} color="rgba(255,255,255,0.85)" />
            </View>
            
            {/* Minimal Upgrade Text */}
            <View style={styles.upgradeTextSubtle}>
              <Text style={styles.upgradeTitleSubtle}>Premium Content</Text>
              <Text style={styles.upgradeSubtitleSubtle}>Tap to unlock</Text>
            </View>
          </View>
        )}
        
        {/* Bottom gradient with info */}
        <LinearGradient
          colors={['transparent', item.is_locked ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)']}
          style={styles.imageOverlay}
        >
          <Text style={[styles.landmarkName, item.is_locked && styles.landmarkNameLocked]}>
            {item.name}
          </Text>
          
          {/* Points Display - Enhanced for premium */}
          <View style={[
            styles.pointsBadge,
            item.category === 'premium' && styles.pointsBadgePremium
          ]}>
            <Ionicons 
              name={item.category === 'premium' ? "star" : "star-outline"} 
              size={16} 
              color={item.category === 'premium' ? "#FFD700" : "#FFD700"} 
            />
            <Text style={[
              styles.pointsText,
              item.category === 'premium' && styles.pointsTextPremium
            ]}>
              {item.points || 10} pts
            </Text>
            {item.category === 'premium' && (
              <Ionicons name="diamond" size={12} color="#FFD700" style={{ marginLeft: 4 }} />
            )}
          </View>
        </LinearGradient>
      </Surface>
    </TouchableOpacity>
  );

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
        colors={[theme.colors.primary, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{name}</Text>
          <Text style={styles.headerSubtitle}>{landmarks.length} Landmarks</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={landmarks}
        renderItem={renderLandmark}
        keyExtractor={(item) => item.landmark_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  backButton: {
    marginRight: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  landmarkCard: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    height: 200,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  landmarkImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  blurredImage: {
    opacity: 0.7,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    justifyContent: 'flex-end',
  },
  landmarkName: {
    ...theme.typography.h3,
    color: '#fff',
  },
  landmarkNameLocked: {
    opacity: 0.9,
  },
  // Enhanced Premium Badge
  // Subtle Premium Badge
  premiumBadgeSubtle: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  premiumBadgeBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    backdropFilter: 'blur(10px)',
  },
  premiumTextSubtle: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  // Frosted Glass Overlay
  frostedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
  },
  lockIconSubtle: {
    marginBottom: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    padding: theme.spacing.md,
    backdropFilter: 'blur(10px)',
  },
  upgradeTextSubtle: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backdropFilter: 'blur(10px)',
  },
  upgradeTitleSubtle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    marginBottom: theme.spacing.xs / 2,
  },
  upgradeSubtitleSubtle: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
  // Premium Banner
  premiumBanner: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  premiumBannerGradient: {
    padding: theme.spacing.md,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  premiumBannerTextContainer: {
    flex: 1,
  },
  premiumBannerTitle: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  premiumBannerSubtitle: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
  },
  // Enhanced Points Badge
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  pointsBadgePremium: {
    backgroundColor: 'rgba(255,215,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
  },
  pointsText: {
    ...theme.typography.caption,
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  pointsTextPremium: {
    fontSize: 13,
    fontWeight: '800',
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
});
