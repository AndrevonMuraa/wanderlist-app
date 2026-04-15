import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { useAuth } from '../contexts/AuthContext';
import AddUserCreatedVisitModal from '../components/AddUserCreatedVisitModal';
import ProFeatureLock from '../components/ProFeatureLock';
import { useSubscription } from '../hooks/useSubscription';
import { HeaderBranding } from '../components/BrandedGlobeIcon';
import { getToken } from '../utils/token';

const { width } = Dimensions.get('window');

// Continent data - FALLBACK VALUES (will be updated by API)
// These are shown briefly while loading, then replaced with real-time data from /api/continent-stats
// IMPORTANT: apiName must match the DB continent field for stats matching
const CONTINENTS = [
  {
    id: 'europe',
    name: 'Europe',
    apiName: 'Europe',
    countries: 20,
    landmarks: 300,
    image: 'https://images.unsplash.com/photo-1683660107861-c555be9775b9?w=800',
    gradient: ['rgba(59,184,195,0.2)', 'rgba(59,184,195,0.7)'] as const,
    totalPoints: 4000,
    description: 'Historic castles and cultural heritage',
    accentColor: '#3BB8C3',
  },
  {
    id: 'asia',
    name: 'Asia',
    apiName: 'Asia',
    countries: 20,
    landmarks: 300,
    image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
    gradient: ['rgba(255,140,66,0.2)', 'rgba(255,140,66,0.7)'] as const,
    totalPoints: 4000,
    description: 'Ancient temples and modern wonders',
    accentColor: '#FF8C42',
  },
  {
    id: 'africa',
    name: 'Africa',
    apiName: 'Africa',
    countries: 20,
    landmarks: 300,
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800',
    gradient: ['rgba(218,165,32,0.2)', 'rgba(218,165,32,0.7)'] as const,
    totalPoints: 4000,
    description: 'Wild savannas and ancient civilizations',
    accentColor: '#DAA520',
  },
  {
    id: 'americas',
    name: 'Americas',
    apiName: 'Americas',
    countries: 20,
    landmarks: 300,
    image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800',
    gradient: ['rgba(76,175,80,0.2)', 'rgba(76,175,80,0.7)'] as const,
    totalPoints: 4000,
    description: 'Rainforests to mountain peaks',
    accentColor: '#4CAF50',
  },
  {
    id: 'oceania',
    name: 'Oceania',
    subtitle: '& other island paradises',
    apiName: 'Oceania',
    countries: 20,
    landmarks: 300,
    image: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800',
    gradient: ['rgba(33,150,243,0.2)', 'rgba(33,150,243,0.7)'] as const,
    totalPoints: 4000,
    description: 'Tropical islands and coral reefs',
    accentColor: '#2196F3',
  },
];

interface Continent {
  id: string;
  name: string;
  subtitle?: string;
  apiName: string;
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


export default function ContinentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, gradientColors } = useTheme();
  const { t } = useTranslation();
  const [continents, setContinents] = useState<Continent[]>(CONTINENTS);
  const [loading, setLoading] = useState(true);
  const [showCustomVisitModal, setShowCustomVisitModal] = useState(false);
  const [showProLock, setShowProLock] = useState(false);
  const [trendingLandmarks, setTrendingLandmarks] = useState<any[]>([]);
  
  // All hooks must be called in consistent order
  const subscriptionData = useSubscription();
  const canCreateCustomVisits = subscriptionData.canCreateCustomVisits;
  const insets = useSafeAreaInsets();

  // Calculate safe area padding
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  useEffect(() => {
    if (user) {
      fetchContinentStats();
      fetchTrendingLandmarks();
    }
  }, [user]);

  // Refetch when tab gains focus (e.g. after deleting a visit)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchContinentStats();
      }
    }, [user])
  );

  const fetchTrendingLandmarks = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/community-highlights`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTrendingLandmarks(data.highlights || []);
      }
    } catch (error) {
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
              (s: any) => s.continent?.toLowerCase() === continent.apiName.toLowerCase()
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
    } finally {
      setLoading(false);
    }
  };

  const handleContinentPress = (continentId: string) => {
    const continent = continents.find(c => c.id === continentId);
    if (continent) {
      router.push(`/explore-countries?continent=${encodeURIComponent(continent.apiName)}`);
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
        {/* Single Row: Title Left, Branding Right */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>{t('explore.title')}</Text>
          <View style={styles.headerRightRow}>
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
            <Text style={styles.tabLabel}>Bucket list</Text>
          </TouchableOpacity>
        </View>

        {/* Guide CTA */}
        <View style={styles.guideCta}>
          <Ionicons name="compass-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.guideCtaText}>
            Where have you been? Register your visits to earn points and climb the ranks!
          </Text>
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
                      {continent.subtitle && (
                        <Text style={styles.cardSubtitle}>{continent.subtitle}</Text>
                      )}
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
                            <View style={[styles.progressBarFill, { width: `${continent.percentage || 0}%` }]} />
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

        {/* Community Highlights */}
        {trendingLandmarks.length > 0 && (
          <View style={styles.trendingSection}>
            <TouchableOpacity style={styles.trendingSectionHeader} onPress={() => router.push('/community')} activeOpacity={0.7}>
              <Ionicons name="people" size={18} color={theme.colors.primary} />
              <Text style={styles.trendingSectionTitle}>Community highlights</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingScroll}
            >
              {trendingLandmarks.map((lm, index) => (
                <TouchableOpacity
                  key={lm.landmark_id || index}
                  style={styles.trendingCard}
                  data-testid={`trending-landmark-${index}`}
                  onPress={() => lm.landmark_id && router.push(`/landmark-community-photos/${lm.landmark_id}?name=${encodeURIComponent(lm.landmark_name)}&country=${encodeURIComponent(lm.country_name || '')}`)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: lm.sample_photo }} style={styles.trendingImage} resizeMode="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.trendingOverlay}
                  >
                    <Text style={styles.trendingName} numberOfLines={1}>{lm.landmark_name}</Text>
                    <Text style={styles.trendingCountry} numberOfLines={1}>{lm.country_name}</Text>
                    <View style={styles.trendingStats}>
                      <View style={styles.trendingStat}>
                        <Ionicons name="people" size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.trendingStatText}>{lm.visitor_count}</Text>
                      </View>
                      <View style={styles.trendingStat}>
                        <Ionicons name="images" size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.trendingStatText}>{lm.total_photos}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
  // Guide CTA
  guideCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: theme.spacing.md,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary + '08',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  guideCtaText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },

  // Trending Landmarks
  trendingSection: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  trendingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  trendingSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  trendingScroll: {
    gap: 12,
    paddingRight: theme.spacing.md,
  },
  trendingCard: {
    width: 160,
    height: 200,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  trendingName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  trendingCountry: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 1,
  },
  trendingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 5,
  },
  trendingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trendingStatText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
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
    height: 155,
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
    height: 60,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
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
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
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
  cardSubtitle: {
    fontSize: 15,
    fontWeight: '600',
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
