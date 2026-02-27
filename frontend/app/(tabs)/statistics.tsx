import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Surface, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import theme, { gradients } from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

// Continent icons for display
const CONTINENT_ICONS: { [key: string]: { icon: string; color: string } } = {
  'Europe': { icon: '🏰', color: '#4DB8D8' },
  'Asia': { icon: '🏯', color: '#E57373' },
  'Africa': { icon: '🦁', color: '#FFB74D' },
  'Americas': { icon: '🗽', color: '#81C784' },
  'Oceania': { icon: '🦘', color: '#BA68C8' },
  'South America': { icon: '🌴', color: '#64B5F6' },
};

interface ContinentData {
  continent: string;
  total_countries: number;
  visited_countries: number;
  total_landmarks: number;
  total_points: number;
}

interface Stats {
  totalCountries: number;
  totalLandmarks: number;
  totalPoints: number;
  totalAppCountries: number;
  continents: ContinentData[];
  topCountries: { name: string; visits: number }[];
  monthlyVisits: { month: string; count: number }[];
  globalRank: number;
  totalUsers: number;
  percentile: number;
}

export default function StatisticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const getToken = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem('auth_token');
    } else {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync('auth_token');
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      // Fetch multiple endpoints for comprehensive stats
      const [statsRes, continentRes, visitsRes, leaderboardRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/continent-stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/visits`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/leaderboard?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const statsData = statsRes.ok ? await statsRes.json() : {};
      const continentData = continentRes.ok ? await continentRes.json() : { continents: [] };
      const visitsData = visitsRes.ok ? await visitsRes.json() : [];
      const leaderboardData = leaderboardRes.ok ? await leaderboardRes.json() : [];

      // Get continent data from API (real counts)
      const continents: ContinentData[] = (continentData.continents || []).map((c: any) => ({
        continent: c.continent || 'Unknown',
        total_countries: c.countries || 0,
        visited_countries: c.visited_countries || 0,
        total_landmarks: c.total_landmarks || 0,
        total_points: c.total_points || 0,
      }));
      
      // Calculate total countries in the app
      const totalAppCountries = continents.reduce((sum, c) => sum + c.total_countries, 0);

      // Process visits for top countries and monthly breakdown
      const countryVisits: { [key: string]: number } = {};
      const monthlyData: { [key: string]: number } = {};

      if (Array.isArray(visitsData)) {
        visitsData.forEach((visit: any) => {
          if (visit.country_name) {
            countryVisits[visit.country_name] = (countryVisits[visit.country_name] || 0) + 1;
          }
          if (visit.visited_at) {
            const date = new Date(visit.visited_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
          }
        });
      }

      // Sort and get top 5 countries
      const topCountries = Object.entries(countryVisits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, visits]) => ({ name, visits }));

      // Get last 6 months of visits
      const monthlyVisits = Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
        .map(([month, count]) => ({
          month: new Date(month + '-01').toLocaleDateString('en', { month: 'short' }),
          count,
        }));

      // Calculate rank and percentile
      let globalRank = 1;
      let totalUsers = leaderboardData.length || 1;
      if (Array.isArray(leaderboardData) && user) {
        const userIndex = leaderboardData.findIndex((u: any) => u.user_id === user.user_id);
        if (userIndex >= 0) {
          globalRank = userIndex + 1;
        }
      }
      const percentile = Math.round(((totalUsers - globalRank) / totalUsers) * 100);

      setStats({
        totalCountries: statsData.countries_visited || 0,
        totalLandmarks: statsData.landmarks_visited || 0,
        totalPoints: statsData.total_points || 0,
        totalAppCountries: totalAppCountries || 66,
        continents,
        topCountries,
        monthlyVisits,
        globalRank,
        totalUsers: Math.max(totalUsers, 100),
        percentile: Math.max(percentile, 1),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="stats-chart" size={64} color={theme.colors.textLight} />
          <Text style={styles.emptyText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const maxMonthlyVisits = stats ? Math.max(...stats.monthlyVisits.map(m => m.count), 1) : 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.push('/(tabs)/journey')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('statistics.title')}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : stats ? (
          <>
            {/* Overview Cards */}
            <View style={styles.overviewRow}>
              <Surface style={[styles.overviewCard, { backgroundColor: '#4DB8D8' }]}>
                <Ionicons name="flag" size={28} color="#fff" />
                <Text style={styles.overviewValue}>{stats.totalCountries}</Text>
                <Text style={styles.overviewLabel}>Countries</Text>
              </Surface>
              <Surface style={[styles.overviewCard, { backgroundColor: '#C9A961' }]}>
                <Ionicons name="location" size={28} color="#fff" />
                <Text style={styles.overviewValue}>{stats.totalLandmarks}</Text>
                <Text style={styles.overviewLabel}>Landmarks</Text>
              </Surface>
              <Surface style={[styles.overviewCard, { backgroundColor: '#66BB6A' }]}>
                <Ionicons name="star" size={28} color="#fff" />
                <Text style={styles.overviewValue}>{stats.totalPoints}</Text>
                <Text style={styles.overviewLabel}>Points</Text>
              </Surface>
            </View>

            {/* Global Ranking */}
            <Surface style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={22} color="#FFD700" />
                <Text style={styles.sectionTitle}>Your Ranking</Text>
              </View>
              <View style={styles.rankingContent}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankNumber}>#{stats.globalRank}</Text>
                  <Text style={styles.rankLabel}>Global Rank</Text>
                </View>
                <View style={styles.rankStats}>
                  <Text style={styles.percentileText}>
                    🎉 You're in the <Text style={styles.percentileHighlight}>top {100 - stats.percentile}%</Text> of travelers!
                  </Text>
                  <Text style={styles.rankSubtext}>
                    Out of {stats.totalUsers.toLocaleString()} explorers
                  </Text>
                </View>
              </View>
            </Surface>

            {/* Monthly Activity Chart */}
            <Surface style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bar-chart" size={22} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Monthly Activity</Text>
              </View>
              <View style={styles.chartContainer}>
                {stats.monthlyVisits.length > 0 ? (
                  <View style={styles.barChart}>
                    {stats.monthlyVisits.map((item, index) => (
                      <View key={index} style={styles.barItem}>
                        <View style={styles.barWrapper}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height: `${(item.count / maxMonthlyVisits) * 100}%`,
                                backgroundColor: theme.colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.barLabel}>{item.month}</Text>
                        <Text style={styles.barValue}>{item.count}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No visit data yet</Text>
                )}
              </View>
            </Surface>

            {/* Top Countries */}
            <Surface style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="podium" size={22} color="#E57373" />
                <Text style={styles.sectionTitle}>Top Countries</Text>
              </View>
              {stats.topCountries.length > 0 ? (
                stats.topCountries.map((country, index) => (
                  <View key={country.name} style={styles.topCountryItem}>
                    <View style={[styles.rankCircle, { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : theme.colors.border }]}>
                      <Text style={styles.rankCircleText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.countryName}>{country.name}</Text>
                    <Text style={styles.countryVisits}>{country.visits} visits</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>Start visiting landmarks to see your top countries!</Text>
              )}
            </Surface>

            {/* Continent Progress */}
            <Surface style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="globe" size={22} color="#64B5F6" />
                <Text style={styles.sectionTitle}>Continent Progress</Text>
              </View>
              {stats.continents.map((continent) => {
                const iconData = CONTINENT_ICONS[continent.continent] || { icon: '🌍', color: '#999' };
                const total = continent.total_countries || 1;
                const visited = continent.visited_countries || 0;
                const progress = visited / total;
                return (
                  <View key={continent.continent} style={styles.continentItem}>
                    <View style={styles.continentHeader}>
                      <Text style={styles.continentEmoji}>{iconData.icon}</Text>
                      <Text style={styles.continentName}>{continent.continent}</Text>
                      <Text style={styles.continentProgress}>
                        {visited}/{total}
                      </Text>
                    </View>
                    <ProgressBar
                      progress={progress}
                      color={iconData.color}
                      style={styles.progressBar}
                    />
                    <Text style={styles.continentPercent}>
                      {Math.round(progress * 100)}% explored
                    </Text>
                  </View>
                );
              })}
            </Surface>

            {/* Fun Facts */}
            <Surface style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb" size={22} color="#FFA726" />
                <Text style={styles.sectionTitle}>Fun Facts</Text>
              </View>
              <View style={styles.funFactsContainer}>
                <View style={styles.funFact}>
                  <Text style={styles.funFactEmoji}>🌍</Text>
                  <Text style={styles.funFactText}>
                    You've explored <Text style={styles.funFactHighlight}>{Math.round((stats.totalCountries / stats.totalAppCountries) * 100)}%</Text> of all countries available in WanderMark!
                  </Text>
                </View>
                <View style={styles.funFact}>
                  <Text style={styles.funFactEmoji}>📸</Text>
                  <Text style={styles.funFactText}>
                    Average: <Text style={styles.funFactHighlight}>{stats.totalCountries > 0 ? Math.round(stats.totalLandmarks / stats.totalCountries) : 0}</Text> landmarks per country
                  </Text>
                </View>
                <View style={styles.funFact}>
                  <Text style={styles.funFactEmoji}>⭐</Text>
                  <Text style={styles.funFactText}>
                    <Text style={styles.funFactHighlight}>{Math.round(stats.totalPoints / Math.max(stats.totalLandmarks, 1))}</Text> points per landmark on average
                  </Text>
                </View>
              </View>
            </Surface>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl * 2,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  overviewCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: theme.spacing.xs,
  },
  overviewLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  section: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  rankingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  rankNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  rankLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  rankStats: {
    flex: 1,
  },
  percentileText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  percentileHighlight: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  rankSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  chartContainer: {
    height: 160,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingTop: 20,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 100,
    width: 30,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  noDataText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 14,
    padding: theme.spacing.md,
  },
  topCountryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  rankCircleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500',
  },
  countryVisits: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  continentItem: {
    marginBottom: theme.spacing.md,
  },
  continentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  continentEmoji: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  continentName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  continentProgress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  continentPercent: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  funFactsContainer: {
    gap: theme.spacing.sm,
  },
  funFact: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  funFactEmoji: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  funFactText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  funFactHighlight: {
    fontWeight: '700',
    color: theme.colors.text,
  },
});
