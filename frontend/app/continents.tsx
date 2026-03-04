import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import theme, { gradients } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import { BACKEND_URL } from '../utils/config';
import { cachedFetch } from '../utils/apiCache';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../contexts/AuthContext';
import AddUserCreatedVisitModal from '../components/AddUserCreatedVisitModal';
import ProFeatureLock from '../components/ProFeatureLock';
import { useSubscription } from '../hooks/useSubscription';
import { HeaderBranding } from '../components/BrandedGlobeIcon';

const { width } = Dimensions.get('window');

// Continent data - FALLBACK VALUES (will be updated by API)
// These are shown briefly while loading, then replaced with real-time data from /api/continent-stats
const CONTINENTS = [
  {
    id: 'europe',
    name: 'Europe',
    countries: 16,
    landmarks: 196,
    image: 'https://images.unsplash.com/photo-1683660107861-c555be9775b9?w=800',
    gradient: ['rgba(59,184,195,0.2)', 'rgba(59,184,195,0.7)'] as const,
    totalPoints: 2620,
    description: 'Historic castles and cultural heritage',
    accentColor: '#3BB8C3',
  },
  {
    id: 'asia',
    name: 'Asia',
    countries: 16,
    landmarks: 196,
    image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
    gradient: ['rgba(255,140,66,0.2)', 'rgba(255,140,66,0.7)'] as const,
    totalPoints: 2550,
    description: 'Ancient temples and modern wonders',
    accentColor: '#FF8C42',
  },
  {
    id: 'africa',
    name: 'Africa',
    countries: 10,
    landmarks: 121,
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800',
    gradient: ['rgba(218,165,32,0.2)', 'rgba(218,165,32,0.7)'] as const,
    totalPoints: 1525,
    description: 'Wild savannas and ancient civilizations',
    accentColor: '#DAA520',
  },
  {
    id: 'americas',
    name: 'Americas',
    countries: 16,
    landmarks: 189,
    image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800',
    gradient: ['rgba(76,175,80,0.2)', 'rgba(76,175,80,0.7)'] as const,
    totalPoints: 2475,
    description: 'Rainforests to mountain peaks',
    accentColor: '#4CAF50',
  },
  {
    id: 'oceania',
    name: 'Oceania',
    countries: 8,
    landmarks: 95,
    image: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800',
    gradient: ['rgba(33,150,243,0.2)', 'rgba(33,150,243,0.7)'] as const,
    totalPoints: 855,
    description: 'Island paradise and coral reefs',
    accentColor: '#2196F3',
  },
];

interface Continent {
  id: string;
  name: string;
  countries: number;
  landmarks: number;
  image: string;
  gradient: readonly [string, string];
  totalPoints: number;
  description: string;
  accentColor: string;
  visited?: number;
  percentage?: number;
}

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

export default function ContinentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, gradientColors } = useTheme();
  const { t } = useTranslation();
  const [continents, setContinents] = useState<Continent[]>(CONTINENTS);
  const [loading, setLoading] = useState(true);
  const [showCustomVisitModal, setShowCustomVisitModal] = useState(false);
  const [showProLock, setShowProLock] = useState(false);
  const [photoOfTheWeek, setPhotoOfTheWeek] = useState<any>(null);
  
  // All hooks must be called in consistent order
  const subscriptionData = useSubscription();
  const canCreateCustomVisits = subscriptionData.canCreateCustomVisits;
  const insets = useSafeAreaInsets();

  // Calculate safe area padding
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  useEffect(() => {
    if (user) {
      fetchContinentStats();
      fetchPhotoOfTheWeek();
    }
  }, [user]);

  const fetchPhotoOfTheWeek = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/community-photos/photo-of-the-week`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.photo) {
          setPhotoOfTheWeek(data.photo);
        }
      }
    } catch (error) {
      console.error('Error fetching photo of the week:', error);
    }
  };

  const fetchContinentStats = async () => {
    try {
      const token = await getToken();
      
      // Fetch dynamic continent stats from backend (cached for 5 min)
      const response = await cachedFetch(
        `${BACKEND_URL}/api/continent-stats`,
        token || '',
        'continent-stats'
      );

      if (response.ok) {
        const data = await response.json();
        
        // Update continents with real-time stats from database
        if (data.continents && Array.isArray(data.continents)) {
          setContinents(prev => prev.map(continent => {
            // Find matching continent stats by name
            const stats = data.continents.find(
              (s: any) => s.continent?.toLowerCase() === continent.name.toLowerCase()
            );
            
            if (stats) {
              return {
                ...continent,
                landmarks: stats.total_landmarks,
                totalPoints: stats.total_points,
                countries: stats.countries,
                visited: stats.visited_countries,
                percentage: stats.progress_percent,
              };
            }
            return continent;
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching continent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinentPress = (continentId: string) => {
    const continent = continents.find(c => c.id === continentId);
    if (continent) {
      router.push(`/explore-countries?continent=${encodeURIComponent(continent.name)}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* UNIFIED FIXED HEADER - Using Ocean to Sand gradient */}
      <LinearGradient
        colors={gradientColors}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.fixedHeader, { paddingTop: topPadding }]}
      >
        {/* Single Row: Title Left, Search + Branding Right */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>{t('explore.title')}</Text>
          <View style={styles.headerRightRow}>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => router.push('/search')}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={22} color={'#fff'} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.brandingContainer}
              onPress={() => router.push('/about')}
              activeOpacity={0.7}
            >
              <HeaderBranding size={18} textColor="#2A2A2A" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* SCROLLABLE CONTENT */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, styles.tabButtonActive]}>
            <Ionicons name="earth" size={18} color={theme.colors.primary} />
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Explore</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => router.replace('/bucket-list')}
          >
            <Ionicons name="bookmark" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.tabLabel}>Bucket List</Text>
          </TouchableOpacity>
        </View>

        {/* Continent Cards */}
        <View style={styles.cardsContainer}>
          {continents.map((continent, index) => (
            <TouchableOpacity
              key={continent.id}
              style={[styles.cardWrapper, index === continents.length - 1 && styles.lastCardWrapper]}
              onPress={() => handleContinentPress(continent.id)}
              activeOpacity={0.9}
            >
              <View style={styles.card}>
                <Image source={{ uri: continent.image }} style={styles.cardImage} resizeMode="cover" />
                <LinearGradient colors={continent.gradient} style={styles.cardGradient}>
                  {/* Top Section: Title (left) + Points (right) */}
                  <View style={styles.cardTopSection}>
                    <View style={styles.cardTitleSection}>
                      <Text style={styles.cardTitle}>{continent.name}</Text>
                      <Text style={styles.cardDescription}>{continent.description}</Text>
                    </View>
                    <View style={styles.pointsBadge}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.pointsText}>{continent.totalPoints.toLocaleString()}</Text>
                    </View>
                  </View>
                  
                  {/* Bottom Section: Stats + Arrow */}
                  <View style={styles.cardBottomSection}>
                    <View style={styles.statsOverlay}>
                      <Text style={styles.statsText}>
                        {continent.countries} Countries  |  {continent.landmarks} Landmarks
                      </Text>
                      {/* Show progress bar for all continents */}
                      {continent.visited !== undefined && (
                        <View style={styles.progressRow}>
                          <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBarFill, { width: `${continent.percentage || 0}%`, backgroundColor: continent.accentColor }]} />
                          </View>
                          <Text style={styles.progressLabel}>
                            {continent.visited || 0}/{continent.countries} visited
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.arrowCircle, { backgroundColor: continent.accentColor }]}>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Can't find your destination? Link */}
        <TouchableOpacity 
          style={styles.cantFindContainer}
          onPress={() => {
            if (canCreateCustomVisits) {
              setShowCustomVisitModal(true);
            } else {
              setShowProLock(true);
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="help-circle-outline"
            size={20} 
            color={theme.colors.primary} 
          />
          <Text style={styles.cantFindText}>
            Can't find your destination?
          </Text>
          <Ionicons 
            name="chevron-forward" 
            size={18} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>

        {/* Photo of the Week */}
        {photoOfTheWeek && (
          <TouchableOpacity
            style={styles.potwContainer}
            data-testid="photo-of-the-week"
            onPress={() => router.push(`/landmark-community-photos/${photoOfTheWeek.landmark_id}?name=${encodeURIComponent(photoOfTheWeek.landmark_name)}&country=${encodeURIComponent(photoOfTheWeek.country_name || '')}`)}
            activeOpacity={0.9}
          >
            <View style={styles.potwBadge}>
              <Ionicons name="trophy" size={14} color="#FFD700" />
              <Text style={styles.potwBadgeText}>Photo of the Week</Text>
            </View>
            <Image source={{ uri: photoOfTheWeek.photo_url }} style={styles.potwImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={styles.potwOverlay}
            >
              <View style={styles.potwInfo}>
                <View style={styles.potwTextWrap}>
                  <Text style={styles.potwLandmark} numberOfLines={1}>{photoOfTheWeek.landmark_name}</Text>
                  <Text style={styles.potwUser} numberOfLines={1}>by {photoOfTheWeek.user_name}</Text>
                </View>
                <View style={styles.potwHeart}>
                  <Ionicons name="heart" size={16} color="#FF6B6B" />
                  <Text style={styles.potwHeartCount}>{photoOfTheWeek.upvotes}</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Custom Visit Modal */}
      <AddUserCreatedVisitModal
        visible={showCustomVisitModal}
        onClose={() => setShowCustomVisitModal(false)}
        onSuccess={() => setShowCustomVisitModal(false)}
      />

      {/* Pro Feature Lock Modal */}
      <ProFeatureLock
        visible={showProLock}
        onClose={() => setShowProLock(false)}
        feature="custom_visits"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // Fixed Header
  fixedHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  brandingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  brandingTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: theme.colors.primary,
  },
  // Photo of the Week
  potwContainer: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    height: 180,
    ...theme.shadows.card,
  },
  potwBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  potwBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  potwImage: {
    width: '100%',
    height: '100%',
  },
  potwOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  potwInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  potwTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  potwLandmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  potwUser: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  potwHeart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  potwHeartCount: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Cards
  cardsContainer: {
    padding: theme.spacing.md,
  },
  cardWrapper: {
    marginBottom: theme.spacing.md,
  },
  lastCardWrapper: {
    marginBottom: 0,
  },
  card: {
    height: 140,
    borderRadius: theme.borderRadius.xxl,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardGradient: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'space-between',
  },
  // Card Top Section (Title + Points)
  cardTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleSection: {
    flex: 1,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  pointsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Card Bottom Section (Stats + Arrow)
  cardBottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsOverlay: {
    flex: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  statsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cantFindContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  cantFindText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  cantFindContainerLocked: {
    backgroundColor: 'rgba(118, 75, 162, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(118, 75, 162, 0.2)',
  },
  cantFindTextLocked: {
    color: '#1E8A8A',
  },
  proTagSmall: {
    backgroundColor: '#1E8A8A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proTagSmallText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
});
