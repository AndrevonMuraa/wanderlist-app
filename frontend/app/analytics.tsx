import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { CircularProgress } from '../components/CircularProgress';
import { ProgressBar } from '../components/ProgressBar';
import { PersistentTabBar } from '../components/PersistentTabBar';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  totalVisits: number;
  countriesVisited: number;
  continentsVisited: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  badgesEarned: number;
  continentBreakdown: Record<string, { visited: number; total: number; percentage: number }>;
  countryBreakdown: Record<string, { visits: number; points: number }>;
  topLandmarks: Array<{ name: string; visits: number; country: string }>;
  monthlyProgress: Array<{ month: string; visits: number }>;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const getToken = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem('auth_token');
    } else {
      return await SecureStore.getItemAsync('auth_token');
    }
  };

  const loadAnalytics = async () => {
    try {
      const token = await getToken();
      
      const [statsRes, progressRes, visitsRes, achievementsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/progress`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/visits`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/achievements`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok && progressRes.ok && visitsRes.ok) {
        const stats = await statsRes.json();
        const progress = await progressRes.json();
        const visits = await visitsRes.json();
        const achievements = await achievementsRes.json();

        // Process visits for analytics
        const countryVisits: { [key: string]: number } = {};
        const countryPoints: { [key: string]: number } = {};
        
        visits.forEach((visit: any) => {
          const country = visit.country_name || 'Unknown';
          countryVisits[country] = (countryVisits[country] || 0) + 1;
          countryPoints[country] = (countryPoints[country] || 0) + (visit.points_earned || 0);
        });

        const countryBreakdown = Object.keys(countryVisits).reduce((acc, country) => {
          acc[country] = {
            visits: countryVisits[country],
            points: countryPoints[country],
          };
          return acc;
        }, {} as any);

        setAnalytics({
          totalVisits: stats.total_visits || 0,
          countriesVisited: stats.countries_visited || 0,
          continentsVisited: stats.continents_visited || 0,
          totalPoints: progress.totalPoints || 0,
          currentStreak: 0,
          longestStreak: 0,
          badgesEarned: Array.isArray(achievements) ? achievements.length : 0,
          continentBreakdown: progress.continents || {},
          countryBreakdown,
          topLandmarks: [],
          monthlyProgress: [],
        });
        
        console.log('Analytics loaded:', {
          visits: stats.total_visits,
          countries: stats.countries_visited,
          points: progress.totalPoints,
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading your analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>Unable to load analytics</Text>
        </View>
      </SafeAreaView>
    );
  }

  const topCountries = Object.entries(analytics.countryBreakdown)
    .sort((a, b) => b[1].visits - a[1].visits)
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Travel Analytics</Text>
            <Text style={styles.headerSubtitle}>Your journey by the numbers</Text>
          </View>
          <View style={styles.premiumBadge}>
            <Ionicons name="diamond" size={20} color="#FFD700" />
          </View>
        </LinearGradient>

        {/* Key Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="flag" size={28} color={theme.colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{analytics.totalVisits}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Visits</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="earth" size={28} color={theme.colors.accent} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{analytics.countriesVisited}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Countries</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.accentYellow + '20' }]}>
              <Ionicons name="star" size={28} color={theme.colors.accentYellow} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{analytics.totalPoints.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Points</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.statIcon, { backgroundColor: '#FF6B6B20' }]}>
              <Ionicons name="flame" size={28} color="#FF6B6B" />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{analytics.longestStreak}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Best Streak</Text>
          </View>
        </View>

        {/* Continental Distribution */}
        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="globe" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Continental Coverage</Text>
          </View>
          
          <View style={styles.continentChart}>
            <CircularProgress
              percentage={(analytics.continentsVisited / 5) * 100}
              size={140}
              strokeWidth={12}
              label="Continents"
              sublabel={`${analytics.continentsVisited}/5`}
            />
          </View>

          {Object.entries(analytics.continentBreakdown)
            .sort((a, b) => b[1].percentage - a[1].percentage)
            .map(([continent, data]) => (
              <View key={continent} style={styles.continentRow}>
                <View style={styles.continentLeft}>
                  <Text style={styles.continentEmoji}>
                    {continent === 'Europe' ? '🇪🇺' : 
                     continent === 'Asia' ? '🌏' : 
                     continent === 'Africa' ? '🌍' : 
                     continent === 'Americas' ? '🌎' : '🏝️'}
                  </Text>
                  <View style={styles.continentInfo}>
                    <Text style={styles.continentName}>{continent}</Text>
                    <Text style={styles.continentStats}>
                      {data.visited}/{data.total} countries
                    </Text>
                  </View>
                </View>
                <View style={styles.continentRight}>
                  <Text style={styles.continentPercentage}>{Math.round(data.percentage)}%</Text>
                  <ProgressBar 
                    percentage={data.percentage} 
                    height={6}
                    style={styles.continentProgress}
                    showPercentage={false}
                  />
                </View>
              </View>
            ))}
        </Surface>

        {/* Top Countries */}
        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={24} color={theme.colors.accentYellow} />
            <Text style={styles.sectionTitle}>Top Countries</Text>
          </View>

          {topCountries.map(([country, data], index) => (
            <View key={country} style={styles.countryRow}>
              <View style={styles.countryRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.countryInfo}>
                <Text style={styles.countryName}>{country}</Text>
                <View style={styles.countryStats}>
                  <View style={styles.countryStatItem}>
                    <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.countryStatText}>{data.visits} visits</Text>
                  </View>
                  <View style={styles.countryStatItem}>
                    <Ionicons name="star" size={14} color={theme.colors.accentYellow} />
                    <Text style={styles.countryStatText}>{data.points} pts</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </Surface>

        {/* Travel Insights */}
        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={24} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>Travel Insights</Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>🎯 Your Travel Style</Text>
            <Text style={styles.insightText}>
              {analytics.continentsVisited === 5 
                ? "Globe Trotter! You've visited all 5 continents!"
                : analytics.continentsVisited >= 3
                ? "World Explorer! You're experiencing global diversity."
                : "Regional Specialist! Deep diving into your favorite areas."}
            </Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>⚡ Activity Level</Text>
            <Text style={styles.insightText}>
              {analytics.currentStreak > 7
                ? "On Fire! Your consistency is incredible!"
                : analytics.currentStreak > 0
                ? "Building momentum! Keep that streak alive!"
                : "Ready for your next adventure? Start a new streak!"}
            </Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>🏆 Achievement Hunter</Text>
            <Text style={styles.insightText}>
              {analytics.badgesEarned >= 5
                ? `Impressive! ${analytics.badgesEarned} badges earned - you're a collector!`
                : `${analytics.badgesEarned} badges so far. More achievements await!`}
            </Text>
          </View>
        </Surface>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      <PersistentTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  premiumBadge: {
    padding: theme.spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statCard: {
    width: (width - theme.spacing.md * 3) / 2,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2A2A2A',  // Hardcoded dark text
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6B6B',  // Hardcoded medium gray
  },
  section: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  continentChart: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  continentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  continentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  continentEmoji: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  continentInfo: {
    flex: 1,
  },
  continentName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  continentStats: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  continentRight: {
    alignItems: 'flex-end',
    width: 100,
  },
  continentPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  continentProgress: {
    width: 80,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  countryRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentYellow + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accentYellow,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  countryStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  countryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countryStatText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  insightCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  insightText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
