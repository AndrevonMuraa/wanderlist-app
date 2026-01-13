import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

// Continent data - matches backend continents
const CONTINENTS = [
  {
    id: 'europe',
    name: 'Europe',
    countries: 10,
    landmarks: 113,
    image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800',
    gradient: ['rgba(59,184,195,0.2)', 'rgba(59,184,195,0.7)'] as const,
    totalPoints: 2400,
    description: 'Historic castles and cultural heritage',
    accentColor: '#3BB8C3', // Turquoise/Cyan
  },
  {
    id: 'asia',
    name: 'Asia',
    countries: 10,
    landmarks: 116,
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    gradient: ['rgba(255,140,66,0.2)', 'rgba(255,140,66,0.7)'] as const,
    totalPoints: 3100,
    description: 'Ancient temples and modern wonders',
    accentColor: '#FF8C42', // Orange
  },
  {
    id: 'africa',
    name: 'Africa',
    countries: 10,
    landmarks: 103,
    image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800',
    gradient: ['rgba(218,165,32,0.2)', 'rgba(218,165,32,0.7)'] as const,
    totalPoints: 1600,
    description: 'Wild savannas and ancient civilizations',
    accentColor: '#DAA520', // Golden
  },
  {
    id: 'americas',
    name: 'Americas',
    countries: 10,
    landmarks: 113,
    image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800',
    gradient: ['rgba(76,175,80,0.2)', 'rgba(76,175,80,0.7)'] as const,
    totalPoints: 3200,
    description: 'Rainforests to mountain peaks',
    accentColor: '#4CAF50', // Green
  },
  {
    id: 'oceania',
    name: 'Oceania',
    countries: 8,
    landmarks: 83,
    image: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800',
    gradient: ['rgba(33,150,243,0.2)', 'rgba(33,150,243,0.7)'] as const,
    totalPoints: 1000,
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
  const [continents, setContinents] = useState<Continent[]>(CONTINENTS);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Calculate safe area padding
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/progress`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Update continents with progress data if available
        // data.continents is an object like { "Europe": {...}, "Asia": {...} }
        const continentProgress = data?.continents;
        if (continentProgress && typeof continentProgress === 'object') {
          setContinents(prev => prev.map(continent => {
            // Match by continent name (key in the object)
            const progress = continentProgress[continent.name];
            if (progress) {
              return {
                ...continent,
                visited: progress.visited || 0,
                percentage: progress.percentage || 0
              };
            }
            return continent;
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
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
    <View style={styles.container}>
      {/* UNIFIED FIXED HEADER - Both branding and title */}
      <LinearGradient
        colors={['#3BB8C3', '#2AA8B3']}
        style={[styles.fixedHeader, { paddingTop: topPadding }]}
      >
        {/* Top Row: Branding + Profile */}
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
              <Text style={styles.profileInitial}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Title Row */}
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Explore Continents</Text>
            <Text style={styles.headerSubtitle}>Choose your next adventure</Text>
          </View>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search" size={20} color="#fff" />
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
            onPress={() => router.push('/bucket-list')}
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
                  
                  {/* Bottom Section: Stats + Progress + Arrow */}
                  <View style={styles.cardBottomSection}>
                    <View style={styles.statsAndProgress}>
                      {/* Always show Countries & Landmarks count */}
                      <View style={styles.cardStats}>
                        <View style={styles.statItem}>
                          <Text style={styles.statNumber}>{continent.countries}</Text>
                          <Text style={styles.statLabel}>Countries</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text style={styles.statNumber}>{continent.landmarks}</Text>
                          <Text style={styles.statLabel}>Landmarks</Text>
                        </View>
                      </View>
                      
                      {/* Show progress bar if user has visited */}
                      {continent.percentage !== undefined && continent.percentage > 0 && (
                        <View style={styles.progressSection}>
                          <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBarFill, { width: `${continent.percentage}%` }]} />
                          </View>
                          <Text style={styles.progressLabel}>
                            {continent.visited}/{continent.countries} visited
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardArrow}>
                      <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.6)" />
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
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
    height: 200,
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
    padding: theme.spacing.lg,
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
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statsAndProgress: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressSection: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  progressBarContainer: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: theme.spacing.lg,
  },
  cardArrow: {
    marginLeft: theme.spacing.md,
  },
});
