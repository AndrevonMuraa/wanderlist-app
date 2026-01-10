import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress } from '../../components/CircularProgress';
import { ProgressBar } from '../../components/ProgressBar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { BACKEND_URL } from '../../utils/config';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface Stats {
  total_visits: number;
  countries_visited: number;
  continents_visited: number;
  total_points: number;
  rank: number;
  current_streak: number;
}

interface ProgressStats {
  overall: {
    visited: number;
    total: number;
    percentage: number;
  };
  totalPoints?: number;
  continents: Record<string, {
    visited: number;
    total: number;
    percentage: number;
  }>;
  countries: Record<string, {
    country_name: string;
    continent: string;
    visited: number;
    total: number;
    percentage: number;
  }>;
}

interface Badge {
  achievement_id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  earned_at: string;
}

interface Visit {
  visit_id: string;
  landmark_id: string;
  landmark_name?: string;
  country_name?: string;
  visited_at: string;
  points_earned: number;
}

export default function JourneyScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = await getToken();
      
      const [statsRes, progressRes, badgesRes, visitsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/progress`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/achievements`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/visits`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (progressRes.ok) {
        const data = await progressRes.json();
        setProgressStats(data);
      }

      if (badgesRes.ok) {
        const data = await badgesRes.json();
        setBadges(data);
      }

      if (visitsRes.ok) {
        const data = await visitsRes.json();
        setRecentVisits(data.slice(0, 5)); // Show 5 most recent
      }
    } catch (error) {
      console.error('Error fetching journey data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const getNextMilestone = () => {
    const visited = progressStats?.overall.visited || 0;
    const milestones = [10, 25, 50, 100, 250, 500];
    const next = milestones.find(m => m > visited);
    if (next) {
      return {
        target: next,
        remaining: next - visited,
        name: next === 10 ? 'Explorer' : next === 25 ? 'Adventurer' : next === 50 ? 'Globetrotter' : next === 100 ? 'World Traveler' : next === 250 ? 'Legend' : 'Ultimate Explorer'
      };
    }
    return null;
  };

  const getTopContinent = () => {
    if (!progressStats) return null;
    const sorted = Object.entries(progressStats.continents)
      .sort((a, b) => b[1].visited - a[1].visited);
    if (sorted.length > 0 && sorted[0][1].visited > 0) {
      return {
        name: sorted[0][0],
        visited: sorted[0][1].visited,
        total: sorted[0][1].total
      };
    }
    return null;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Loading your journey..." />
      </SafeAreaView>
    );
  }

  const nextMilestone = getNextMilestone();
  const topContinent = getTopContinent();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Greeting */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
        >
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()}, {user?.name?.split(' ')[0]}! 👋</Text>
            <Text style={styles.subGreeting}>Here's your travel journey</Text>
          </View>
        </LinearGradient>

        {/* Travel Statistics Dashboard */}
        {stats && progressStats && (
          <Surface style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text style={styles.sectionTitle}>Your Stats</Text>
              <TouchableOpacity>
                <Ionicons name="share-social-outline" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="flag" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.statValue}>
                  {Object.keys(progressStats.countries).filter(
                    countryId => progressStats.countries[countryId].visited > 0
                  ).length}
                </Text>
                <Text style={styles.statLabel}>Countries</Text>
                <Text style={styles.statSubtext}>visited</Text>
              </View>

              <View style={styles.statBox}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="location" size={24} color={theme.colors.accent} />
                </View>
                <Text style={styles.statValue}>{progressStats.overall.visited}</Text>
                <Text style={styles.statLabel}>Landmarks</Text>
                <Text style={styles.statSubtext}>explored</Text>
              </View>

              <View style={styles.statBox}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="star" size={24} color={theme.colors.accentYellow} />
                </View>
                <Text style={styles.statValue}>{progressStats.totalPoints || 0}</Text>
                <Text style={styles.statLabel}>Points</Text>
                <Text style={styles.statSubtext}>earned</Text>
              </View>

              <View style={styles.statBox}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="flame" size={24} color={theme.colors.error} />
                </View>
                <Text style={styles.statValue}>{stats.current_streak || 0}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
                <Text style={styles.statSubtext}>current</Text>
              </View>

              <View style={styles.statBox}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="trophy" size={24} color={theme.colors.accentBronze} />
                </View>
                <Text style={styles.statValue}>#{stats.rank || '-'}</Text>
                <Text style={styles.statLabel}>Rank</Text>
                <Text style={styles.statSubtext}>global</Text>
              </View>

              <View style={styles.statBox}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="ribbon" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.statValue}>{badges.length}</Text>
                <Text style={styles.statLabel}>Badges</Text>
                <Text style={styles.statSubtext}>earned</Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Overall Progress */}
        {progressStats && (
          <Surface style={styles.progressCard}>
            <Text style={styles.sectionTitle}>Overall Progress</Text>
            <View style={styles.progressContainer}>
              <CircularProgress
                percentage={progressStats.overall.percentage}
                size={140}
                strokeWidth={12}
                label="Complete"
                sublabel={`${progressStats.overall.visited}/${progressStats.overall.total}`}
              />
              <Text style={styles.progressDescription}>
                {progressStats.overall.percentage < 10
                  ? "Just getting started! Keep exploring! 🌟"
                  : progressStats.overall.percentage < 30
                  ? "Great progress! The world awaits! 🗺️"
                  : progressStats.overall.percentage < 60
                  ? "Amazing journey! Halfway there! 🎉"
                  : progressStats.overall.percentage < 90
                  ? "Incredible! You're a true explorer! 🏆"
                  : "Almost there! World master status! 👑"}
              </Text>
            </View>
          </Surface>
        )}

        {/* Next Milestone */}
        {nextMilestone && (
          <Surface style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <Ionicons name="flag-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.milestoneTitle}>Next Milestone</Text>
            </View>
            <Text style={styles.milestoneName}>{nextMilestone.name}</Text>
            <Text style={styles.milestoneProgress}>
              {nextMilestone.remaining} more visit{nextMilestone.remaining !== 1 ? 's' : ''} to unlock!
            </Text>
            <ProgressBar 
              percentage={((nextMilestone.target - nextMilestone.remaining) / nextMilestone.target) * 100}
              style={styles.milestoneProgressBar}
            />
          </Surface>
        )}

        {/* Top Continent */}
        {topContinent && (
          <Surface style={styles.topContinentCard}>
            <View style={styles.topContinentHeader}>
              <Ionicons name="earth" size={24} color={theme.colors.accent} />
              <Text style={styles.topContinentTitle}>Your Top Continent</Text>
            </View>
            <Text style={styles.topContinentName}>{topContinent.name}</Text>
            <Text style={styles.topContinentStats}>
              {topContinent.visited} of {topContinent.total} countries explored
            </Text>
          </Surface>
        )}

        {/* Continental Progress */}
        {progressStats && (
          <Surface style={styles.continentalCard}>
            <Text style={styles.sectionTitle}>Continental Progress</Text>
            {Object.entries(progressStats.continents)
              .sort((a, b) => b[1].percentage - a[1].percentage)
              .map(([continent, data]) => (
                <View key={continent} style={styles.continentItem}>
                  <View style={styles.continentHeader}>
                    <View style={styles.continentNameRow}>
                      <Ionicons
                        name={
                          continent === 'Europe' ? 'business-outline' :
                          continent === 'Asia' ? 'earth-outline' :
                          continent === 'Africa' ? 'sunny-outline' :
                          continent === 'Americas' ? 'leaf-outline' :
                          'water-outline'
                        }
                        size={20}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.continentName}>{continent}</Text>
                    </View>
                    <Text style={styles.continentCount}>
                      {data.visited}/{data.total}
                    </Text>
                  </View>
                  <ProgressBar
                    percentage={data.percentage}
                    style={styles.continentProgressBar}
                  />
                </View>
              ))}
          </Surface>
        )}

        {/* Recent Milestones */}
        {badges.length > 0 && (
          <Surface style={styles.recentBadgesCard}>
            <Text style={styles.sectionTitle}>Recent Achievements</Text>
            <View style={styles.timelineContainer}>
              {badges
                .sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime())
                .slice(0, 3)
                .map((badge) => (
                  <View key={badge.achievement_id} style={styles.timelineItem}>
                    <View style={styles.timelineDot}>
                      <Text style={styles.timelineEmoji}>{badge.badge_icon}</Text>
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.badgeName}>{badge.badge_name}</Text>
                      <Text style={styles.badgeDate}>
                        {new Date(badge.earned_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/profile')}
            >
              <Text style={styles.viewAllText}>View All Badges</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </Surface>
        )}

        {/* Recent Visits */}
        {recentVisits.length > 0 && (
          <Surface style={styles.recentVisitsCard}>
            <Text style={styles.sectionTitle}>Recent Visits</Text>
            {recentVisits.map((visit) => (
              <TouchableOpacity
                key={visit.visit_id}
                style={styles.visitItem}
                onPress={() => router.push(`/visit-detail/${visit.visit_id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.visitIcon}>
                  <Ionicons name="location" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.visitInfo}>
                  <Text style={styles.visitName}>{visit.landmark_name || 'Landmark'}</Text>
                  <Text style={styles.visitDate}>
                    {new Date(visit.visited_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                <View style={styles.visitPoints}>
                  <Ionicons name="star" size={14} color={theme.colors.accentYellow} />
                  <Text style={styles.visitPointsText}>{visit.points_earned}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
              </TouchableOpacity>
            ))}
          </Surface>
        )}

        {/* Quick Actions */}
        <Surface style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/explore')}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                style={styles.actionGradient}
              >
                <Ionicons name="compass" size={28} color="#fff" />
                <Text style={styles.actionText}>Explore</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/search')}
            >
              <LinearGradient
                colors={[theme.colors.accent, theme.colors.accentDark]}
                style={styles.actionGradient}
              >
                <Ionicons name="search" size={28} color="#fff" />
                <Text style={styles.actionText}>Search</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/feed')}
            >
              <LinearGradient
                colors={[theme.colors.accentYellow, '#F39C12']}
                style={styles.actionGradient}
              >
                <Ionicons name="newspaper" size={28} color="#fff" />
                <Text style={styles.actionText}>Feed</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Surface>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-country-visit')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  greetingContainer: {
    marginTop: theme.spacing.sm,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  statBox: {
    width: '31%',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  progressCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  progressDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  milestoneCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  milestoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  milestoneName: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  milestoneProgress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  milestoneProgressBar: {
    marginTop: theme.spacing.xs,
  },
  topContinentCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  topContinentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  topContinentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  topContinentName: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  topContinentStats: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  continentalCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  continentItem: {
    marginTop: theme.spacing.md,
  },
  continentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  continentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  continentName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  continentCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  continentProgressBar: {
    marginTop: theme.spacing.xs / 2,
  },
  recentBadgesCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  timelineContainer: {
    marginTop: theme.spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  timelineDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  timelineEmoji: {
    fontSize: 24,
  },
  timelineContent: {
    flex: 1,
  },
  badgeName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  badgeDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  recentVisitsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  visitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  visitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  visitInfo: {
    flex: 1,
  },
  visitName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  visitDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  visitPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  visitPointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  quickActionsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  actionGradient: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    borderRadius: 28,
    ...theme.shadows.lg,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
