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
    countries: 10,
    landmarks: 107, // Fallback - API provides real count
    image: 'https://images.unsplash.com/photo-1683660107861-c555be9775b9?w=800',
    gradient: ['rgba(59,184,195,0.2)', 'rgba(59,184,195,0.7)'] as const,
    totalPoints: 1505, // Fallback - API provides real total
    description: 'Historic castles and cultural heritage',
    accentColor: '#3BB8C3', // Turquoise/Cyan
  },
  {
    id: 'asia',
    name: 'Asia',
    countries: 10,
    landmarks: 106,
    image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
    gradient: ['rgba(255,140,66,0.2)', 'rgba(255,140,66,0.7)'] as const,
    totalPoints: 1300,
    description: 'Ancient temples and modern wonders',
    accentColor: '#FF8C42', // Orange
  },
  {
    id: 'africa',
    name: 'Africa',
    countries: 10,
    landmarks: 101,
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800',
    gradient: ['rgba(218,165,32,0.2)', 'rgba(218,165,32,0.7)'] as const,
    totalPoints: 1130,
    description: 'Wild savannas and ancient civilizations',
    accentColor: '#DAA520', // Golden
  },
  {
    id: 'americas',
    name: 'Americas',
    countries: 10,
    landmarks: 107,
    image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800',
    gradient: ['rgba(76,175,80,0.2)', 'rgba(76,175,80,0.7)'] as const,
    totalPoints: 1355,
    description: 'Rainforests to mountain peaks',
    accentColor: '#4CAF50', // Green
  },
  {
    id: 'oceania',
    name: 'Oceania',
    countries: 8,
    landmarks: 81,
    image: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800',
    gradient: ['rgba(33,150,243,0.2)', 'rgba(33,150,243,0.7)'] as const,
    totalPoints: 855,
    description: 'Island paradise and coral reefs',
    accentColor: '#2196F3', // Blue
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
  const { colors, gradientColors, isDark } = useTheme();
  const { t } = useTranslation();
  const [continents, setContinents] = useState<Continent[]>(CONTINENTS);
  const [loading, setLoading] = useState(true);
  const [showCustomVisitModal, setShowCustomVisitModal] = useState(false);
  const [showProLock, setShowProLock] = useState(false);
  
  // All hooks must be called in consistent order
  const subscriptionData = useSubscription();
  const canCreateCustomVisits = subscriptionData.canCreateCustomVisits;
  const insets = useSafeAreaInsets();

  // Calculate safe area padding
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  useEffect(() => {
    fetchContinentStats();
  }, []);

  const fetchContinentStats = async () => {
    try {
      const token = await getToken();
      
      // Fetch dynamic continent stats from backend
      const response = await fetch(`${BACKEND_URL}/api/continent-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

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
        {/* Single Row: Title Left, Branding Right */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: isDark ? colors.text : '#fff' }]}>{t('explore.title')}</Text>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <HeaderBranding size={18} textColor="#2A2A2A" />
          </TouchableOpacity>
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
                    <View style={[styles.cardTitleSection, { backgroundColor: `${continent.accentColor}40` }]}>
                      <Text style={styles.cardTitle}>{continent.name}</Text>
                      <Text style={styles.cardDescription}>{continent.description}</Text>
                    </View>
                    <View style={[styles.pointsBadge, { backgroundColor: `${continent.accentColor}30` }]}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.pointsText}>{continent.totalPoints.toLocaleString()}</Text>
                    </View>
                  </View>
                  
                  {/* Bottom Section: Stats + Arrow */}
                  <View style={styles.cardBottomSection}>
                    <View style={[styles.statsOverlay, { backgroundColor: `${continent.accentColor}40` }]}>
                      <Text style={styles.statsText}>
                        {continent.countries} Countries  |  {continent.landmarks} Landmarks
                      </Text>
                      {/* Show progress if user has visited */}
                      {continent.percentage !== undefined && continent.percentage > 0 && (
                        <View style={styles.progressRow}>
                          <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBarFill, { width: `${continent.percentage}%`, backgroundColor: continent.accentColor }]} />
                          </View>
                          <Text style={styles.progressLabel}>
                            {continent.visited}/{continent.countries} visited
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
          style={[styles.cantFindContainer, !canCreateCustomVisits && styles.cantFindContainerLocked]}
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
            name={canCreateCustomVisits ? "help-circle-outline" : "lock-closed"} 
            size={20} 
            color={canCreateCustomVisits ? theme.colors.primary : "#1E8A8A"} 
          />
          <Text style={[styles.cantFindText, !canCreateCustomVisits && styles.cantFindTextLocked]}>
            {canCreateCustomVisits ? "Can't find your destination?" : "Custom Visits (Pro)"}
          </Text>
          {!canCreateCustomVisits && (
            <View style={styles.proTagSmall}>
              <Text style={styles.proTagSmallText}>PRO</Text>
            </View>
          )}
          <Ionicons 
            name="chevron-forward" 
            size={18} 
            color={canCreateCustomVisits ? theme.colors.primary : "#1E8A8A"} 
          />
        </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
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
