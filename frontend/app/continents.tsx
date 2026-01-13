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
import { FixedTopBar } from '../components/StickyHeader';

const { width } = Dimensions.get('window');

const getToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface Continent {
  id: string;
  name: string;
  countries: number;
  landmarks: number;
  image: string;
  gradient: string[];
  icon: string;
  description: string;
  visited?: number;
  percentage?: number;
  totalPoints: number;
}

const CONTINENTS: Continent[] = [
  {
    id: 'europe',
    name: 'Europe',
    countries: 10,
    landmarks: 113,
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.05)', 'rgba(52, 152, 219, 0.35)'],
    icon: 'business-outline',
    description: 'Historic castles and cultural heritage',
    totalPoints: 1130,
  },
  {
    id: 'asia',
    name: 'Asia',
    countries: 10,
    landmarks: 116,
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.05)', 'rgba(231, 76, 60, 0.35)'],
    icon: 'earth-outline',
    description: 'Ancient temples and modern wonders',
    totalPoints: 1160,
  },
  {
    id: 'africa',
    name: 'Africa',
    countries: 10,
    landmarks: 103,
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.05)', 'rgba(243, 156, 18, 0.35)'],
    icon: 'sunny-outline',
    description: 'Wild savannas and ancient civilizations',
    totalPoints: 1030,
  },
  {
    id: 'americas',
    name: 'Americas',
    countries: 10,
    landmarks: 113,
    image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.05)', 'rgba(46, 204, 113, 0.35)'],
    icon: 'leaf-outline',
    description: 'Rainforests to mountain peaks',
    totalPoints: 1130,
  },
  {
    id: 'oceania',
    name: 'Oceania',
    countries: 8,
    landmarks: 83,
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.05)', 'rgba(26, 188, 156, 0.35)'],
    icon: 'water-outline',
    description: 'Tropical islands and coastal beauty',
    totalPoints: 830,
  },
];

export default function ContinentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [continents, setContinents] = useState<Continent[]>(CONTINENTS);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Calculate the height of the fixed top bar
  const fixedBarHeight = (Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 24)) + 44;

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
        const progressData = await response.json();
        
        const updatedContinents = CONTINENTS.map(continent => {
          const continentProgress = progressData.continents[continent.name];
          return {
            ...continent,
            visited: continentProgress?.visited || 0,
            percentage: continentProgress?.percentage || 0,
          };
        });
        
        setContinents(updatedContinents);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinentPress = (continentId: string) => {
    router.push(`/explore-countries?continent=${continentId}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Universal Header with Branding */}
      <LinearGradient
        colors={['#3BB8C3', '#2AA8B3']}
        style={styles.headerGradient}
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

        {/* Main Content Row */}
        <View style={styles.mainRow}>
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

      {/* Quick Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, styles.tabButtonActive]}
        >
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
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.cardsContainer}
        showsVerticalScrollIndicator={false}
      >
        {continents.map((continent, index) => (
          <TouchableOpacity
            key={continent.id}
            style={[
              styles.cardWrapper,
              index === continents.length - 1 && styles.lastCardWrapper
            ]}
            onPress={() => handleContinentPress(continent.id)}
            activeOpacity={0.9}
          >
            <View style={styles.card}>
              {/* Background Image */}
              <Image 
                source={{ uri: continent.image }} 
                style={styles.cardImage}
                resizeMode="cover"
              />
              
              {/* Gradient Overlay */}
              <LinearGradient
                colors={continent.gradient}
                style={styles.cardGradient}
              >
                {/* Top Row: Points Badge with Golden Star */}
                <View style={styles.cardTopRow}>
                  <View style={styles.pointsBadge}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.pointsText}>{continent.totalPoints.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{continent.name}</Text>
                  <Text style={styles.cardDescription}>{continent.description}</Text>
                  
                  {/* Progress Bar */}
                  {continent.percentage !== undefined && continent.percentage > 0 ? (
                    <View style={styles.progressSection}>
                      <Text style={styles.progressLabel}>
                        {continent.visited}/{continent.countries} countries visited
                      </Text>
                      <View style={styles.progressBarContainer}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { width: `${continent.percentage}%` }
                          ]} 
                        />
                      </View>
                    </View>
                  ) : (
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
                  )}

                  {/* Arrow Icon - Transparent */}
                  <View style={styles.cardArrow}>
                    <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.6)" />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // Universal Header Styles
  headerGradient: {
    paddingHorizontal: theme.spacing.md,
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
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
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
  // Tab Styles
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
    gap: theme.spacing.xs,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
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
  // Scroll & Cards
  scrollView: {
    flex: 1,
  },
  cardsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  cardWrapper: {
    marginBottom: theme.spacing.md,
  },
  lastCardWrapper: {
    marginBottom: theme.spacing.sm,
  },
  card: {
    height: 120,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    padding: theme.spacing.md,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: theme.spacing.xs / 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: theme.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressSection: {
    marginBottom: theme.spacing.xs,
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardArrow: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
