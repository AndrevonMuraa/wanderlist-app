import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { Text, ActivityIndicator, Surface, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

// For web, use relative URLs (same origin) which routes to localhost:8001 via proxy
// For mobile, use the external URL
const BACKEND_URL = Platform.OS === 'web' 
  ? '' 
  : (process.env.EXPO_PUBLIC_BACKEND_URL || '');

interface Visit {
  visit_id: string;
  landmark_id: string;
  photo_base64: string;
  comments?: string;
  diary_notes?: string;
  visited_at: string;
}

interface Stats {
  total_visits: number;
  countries_visited: number;
  continents_visited: number;
  friends_count: number;
}

export default function JourneyScreen() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      
      const [visitsRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/visits`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (visitsRes.ok) {
        const visitsData = await visitsRes.json();
        setVisits(visitsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching journey:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderVisit = ({ item }: { item: Visit }) => (
    <TouchableOpacity
      onPress={() => router.push(`/visit-details/${item.visit_id}`)}
      activeOpacity={0.7}
    >
      <Surface style={styles.visitCard}>
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.photo_base64}` }}
          style={styles.visitImage}
        />
        <View style={styles.visitContent}>
          {item.comments && (
            <Text style={styles.visitComment} numberOfLines={2}>
              {item.comments}
            </Text>
          )}
          <Text style={styles.visitDate}>
            {new Date(item.visited_at).toLocaleDateString()}
          </Text>
        </View>
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
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>My Journey</Text>
        <Text style={styles.headerSubtitle}>Your travel memories</Text>
      </LinearGradient>

      {stats && (
        <Surface style={styles.statsCard}>
          <Text style={styles.statsCardTitle}>Your Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="flag-outline" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.statNumber}>{stats.total_visits}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
                <Ionicons name="map-outline" size={24} color={theme.colors.accent} />
              </View>
              <Text style={styles.statNumber}>{stats.countries_visited}</Text>
              <Text style={styles.statLabel}>Countries</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.accentBronze + '20' }]}>
                <Ionicons name="earth-outline" size={24} color={theme.colors.accentBronze} />
              </View>
              <Text style={styles.statNumber}>{stats.continents_visited}</Text>
              <Text style={styles.statLabel}>Continents</Text>
            </View>
          </View>
          <ProgressBar
            progress={stats.total_visits / 200}
            color={theme.colors.primary}
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>
            {stats.total_visits} of 200 landmarks visited
          </Text>
        </Surface>
      )}

      <FlatList
        data={visits}
        renderItem={renderVisit}
        keyExtractor={(item) => item.visit_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            {/* Hero Section */}
            <LinearGradient
              colors={['rgba(32, 178, 170, 0.1)', 'rgba(32, 178, 170, 0.05)']}
              style={styles.emptyHero}
            >
              <Ionicons name="earth" size={80} color={theme.colors.primary} />
              <Text style={styles.emptyHeroTitle}>Your Journey Awaits</Text>
              <Text style={styles.emptyHeroSubtitle}>
                Every great journey begins with a single step
              </Text>
            </LinearGradient>

            {/* Inspiring Quote */}
            <View style={styles.quoteCard}>
              <Ionicons name="chatbox-ellipses" size={32} color={theme.colors.accent} style={styles.quoteIcon} />
              <Text style={styles.quoteText}>
                "The world is a book, and those who do not travel read only one page."
              </Text>
              <Text style={styles.quoteAuthor}>— Saint Augustine</Text>
            </View>

            {/* Quick Stats / Motivation */}
            <View style={styles.motivationSection}>
              <Text style={styles.sectionTitle}>Why Travel?</Text>
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Ionicons name="sparkles" size={24} color="#FFD700" />
                  <Text style={styles.benefitText}>Create lasting memories</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="people" size={24} color={theme.colors.accent} />
                  <Text style={styles.benefitText}>Meet new cultures</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="trophy" size={24} color={theme.colors.accentBronze} />
                  <Text style={styles.benefitText}>Challenge yourself</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="camera" size={24} color={theme.colors.primary} />
                  <Text style={styles.benefitText}>Capture amazing moments</Text>
                </View>
              </View>
            </View>

            {/* Featured Destinations */}
            <View style={styles.featuredSection}>
              <Text style={styles.sectionTitle}>Popular First Destinations</Text>
              <Text style={styles.sectionSubtitle}>Start your journey with these favorites</Text>
              
              <TouchableOpacity
                style={styles.featuredCard}
                onPress={() => router.push('/landmarks/norway?name=Norway')}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=600' }}
                  style={styles.featuredImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.featuredOverlay}
                >
                  <Text style={styles.featuredFlag}>🇳🇴</Text>
                  <Text style={styles.featuredName}>Norway</Text>
                  <Text style={styles.featuredInfo}>15 landmarks • Northern Lights</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.featuredCard}
                onPress={() => router.push('/landmarks/japan?name=Japan')}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600' }}
                  style={styles.featuredImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.featuredOverlay}
                >
                  <Text style={styles.featuredFlag}>🇯🇵</Text>
                  <Text style={styles.featuredName}>Japan</Text>
                  <Text style={styles.featuredInfo}>15 landmarks • Ancient temples</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/(tabs)/explore')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Ionicons name="compass" size={24} color="#fff" />
                <Text style={styles.ctaText}>Start Exploring</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Travel Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.sectionTitle}>Travel Tips</Text>
              <View style={styles.tipCard}>
                <Ionicons name="bulb" size={20} color={theme.colors.accent} />
                <Text style={styles.tipText}>
                  You can mark visits with or without photos. Photos count for official leaderboards!
                </Text>
              </View>
              <View style={styles.tipCard}>
                <Ionicons name="star" size={20} color="#FFD700" />
                <Text style={styles.tipText}>
                  Earn points by visiting landmarks. Premium locations award 25 points each!
                </Text>
              </View>
            </View>
          </View>
        }
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
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
  },
  statsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  statsCardTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statNumber: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceTinted,
  },
  progressText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  visitCard: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  visitImage: {
    width: '100%',
    height: 220,
  },
  visitContent: {
    padding: theme.spacing.md,
  },
  visitComment: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  visitDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    ...theme.typography.h3,
    color: theme.colors.textLight,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    ...theme.typography.bodySmall,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
