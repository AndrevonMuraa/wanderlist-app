import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { ProgressBar } from '../components/ProgressBar';
import { BACKEND_URL } from '../utils/config';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');

const getToken = async () => {
  return await SecureStore.getItemAsync('token');
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
    landmarks: 150,
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.3)', 'rgba(52, 152, 219, 0.75)'],
    icon: 'business-outline',
    description: 'Historic castles and cultural heritage',
    totalPoints: 1875, // 10 free × 10 pts + 5 premium × 25 pts per country × 10 countries
  },
  {
    id: 'asia',
    name: 'Asia',
    countries: 10,
    landmarks: 150,
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.3)', 'rgba(231, 76, 60, 0.75)'],
    icon: 'earth-outline',
    description: 'Ancient temples and modern wonders',
    totalPoints: 1875,
  },
  {
    id: 'africa',
    name: 'Africa',
    countries: 10,
    landmarks: 150,
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.3)', 'rgba(243, 156, 18, 0.75)'],
    icon: 'sunny-outline',
    description: 'Wild savannas and ancient civilizations',
    totalPoints: 1875,
  },
  {
    id: 'americas',
    name: 'Americas',
    countries: 10,
    landmarks: 150,
    image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.3)', 'rgba(46, 204, 113, 0.75)'],
    icon: 'leaf-outline',
    description: 'Rainforests to mountain peaks',
    totalPoints: 1875,
  },
  {
    id: 'oceania',
    name: 'Oceania',
    countries: 8,
    landmarks: 120,
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80',
    gradient: ['rgba(0, 0, 0, 0.3)', 'rgba(26, 188, 156, 0.75)'],
    icon: 'water-outline',
    description: 'Tropical islands and coastal beauty',
    totalPoints: 1500, // 8 countries
  },
];

export default function ContinentsScreen() {
  const router = useRouter();
  const [continents, setContinents] = useState<Continent[]>(CONTINENTS);
  const [loading, setLoading] = useState(true);

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
        
        // Merge progress data with continents
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Explore Continents</Text>
            <Text style={styles.headerSubtitle}>Choose your next adventure</Text>
          </View>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
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
            style={styles.cardWrapper}
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
                {/* Top Row: Points Badge */}
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

                  {/* Arrow Icon */}
                  <View style={styles.cardArrow}>
                    <Ionicons name="arrow-forward" size={24} color="#fff" />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  headerTitle: {
    ...theme.typography.h1,
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  headerSubtitle: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  cardsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  cardWrapper: {
    marginBottom: theme.spacing.sm,
  },
  card: {
    height: 115,
    borderRadius: theme.borderRadius.xl,
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
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
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
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: theme.spacing.xs / 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
