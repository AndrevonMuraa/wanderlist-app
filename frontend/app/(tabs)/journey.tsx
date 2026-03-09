import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl, StatusBar } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import theme, { gradients, spacing, borderRadius, typography } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import { CircularProgress } from '../../components/CircularProgress';
import { ProgressBar } from '../../components/ProgressBar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import OfflineStatusBar from '../../components/OfflineStatusBar';
import ProFeatureLock from '../../components/ProFeatureLock';
import { useSubscription } from '../../hooks/useSubscription';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import { BACKEND_URL } from '../../utils/config';
import { cachedFetch } from '../../utils/apiCache';
import { getProgressToNextRank } from '../../utils/rankSystem';
import { HeaderBranding } from '../../components/BrandedGlobeIcon';
import ShareJourneyCard from '../../components/ShareJourneyCard';

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
  current_streak: number;  // deprecated, kept for API compatibility
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

interface LandmarkEntry {
  name: string;
  photo?: string | null;
}

interface UserCreatedVisit {
  user_created_visit_id: string;
  country_name: string;
  landmarks: LandmarkEntry[];  // Array of {name, photo} objects
  photos: string[];  // General country photos
  diary?: string;
  visibility: string;
  visited_at: string;
  created_at: string;
}

export default function JourneyScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [userCreatedVisits, setUserCreatedVisits] = useState<UserCreatedVisit[]>([]);
  const [showProLock, setShowProLock] = useState(false);
  const [showShareJourney, setShowShareJourney] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOfflineData, setIsOfflineData] = useState(false);
  
  // All hooks must be called in consistent order
  const router = useRouter();
  const { user } = useAuth();
  const { colors, shadows, gradientColors } = useTheme();
  const { t } = useTranslation();
  const { isOnline, cacheProgress, cacheVisits, getCachedProgress, getCachedVisits, syncPendingVisits } = useOffline();
  const subscriptionData = useSubscription();
  const canCreateCustomVisits = subscriptionData.canCreateCustomVisits;
  const isPro = subscriptionData.isPro;
  const { scrollRef, scrollHandler } = useScrollRestore();
  const customVisitsRef = useRef<View>(null);
  const params = useLocalSearchParams<{ scrollTo?: string }>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  useEffect(() => {
    if (params.scrollTo === 'custom-visits' && !loading && customVisitsRef.current) {
      customVisitsRef.current.measureLayout(
        scrollRef.current as any,
        (_x: number, y: number) => {
          scrollRef.current?.scrollTo({ y, animated: true });
        },
        () => {}
      );
    }
  }, [params.scrollTo, loading]);

  const fetchAllData = async () => {
    try {
      const token = await getToken();
      
      // Always try API first, fall back to cache on failure
      setIsOfflineData(false);
      
      const results = await Promise.allSettled([
        cachedFetch(`${BACKEND_URL}/api/stats`, token || '', 'stats'),
        cachedFetch(`${BACKEND_URL}/api/progress`, token || '', 'progress'),
        fetch(`${BACKEND_URL}/api/user-created-visits`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const [statsResult, progressResult, customVisitsResult] = results;
      let gotProgress = false;

      if (statsResult.status === 'fulfilled' && statsResult.value.ok) {
        const data = await statsResult.value.json();
        setStats(data);
      }

      if (progressResult.status === 'fulfilled' && progressResult.value.ok) {
        const data = await progressResult.value.json();
        setProgressStats(data);
        gotProgress = true;
        // Cache progress data for offline use
        await cacheProgress(data);
      }
      
      if (customVisitsResult.status === 'fulfilled' && customVisitsResult.value.ok) {
        const data = await customVisitsResult.value.json();
        setUserCreatedVisits(data);
      }

      // If API failed for progress, try offline cache as fallback
      if (!gotProgress) {
        const cachedProgress = await getCachedProgress();
        if (cachedProgress) {
          setProgressStats(cachedProgress);
          setStats(prev => prev || {
            total_visits: cachedProgress.overall?.visited || 0,
            countries_visited: Object.keys(cachedProgress.countries || {}).filter(
              k => cachedProgress.countries[k].visited > 0
            ).length,
            continents_visited: Object.keys(cachedProgress.continents || {}).filter(
              k => cachedProgress.continents[k].visited > 0
            ).length,
            total_points: cachedProgress.totalPoints || 0,
            rank: 0,
            current_streak: 0,
          });
          setIsOfflineData(true);
        }
      }
    } catch (error) {
      console.error('Error fetching journey data:', error);
      // Last resort: try offline cache
      try {
        const cachedProgress = await getCachedProgress();
        if (cachedProgress) {
          setProgressStats(cachedProgress);
          setIsOfflineData(true);
        }
      } catch {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return <LoadingSpinner message="Loading your journey..." />;
  }

  const rankProgress = getProgressToNextRank(progressStats?.verifiedPoints || 0);
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky Header */}
      <LinearGradient
        colors={gradientColors}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding }]}
      >
        {/* Single Row: Title Left, Branding Right */}
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Text style={[styles.greeting, { color: '#fff' }]}>{t('journey.title')}</Text>
            {isOfflineData && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline" size={12} color="#fff" />
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <HeaderBranding size={18} textColor={"#2A2A2A"} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Offline Status Bar */}
      <OfflineStatusBar onSyncPress={syncPendingVisits} />

      <ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Travel Statistics Dashboard - Compressed */}
        {stats && progressStats && (
          <Surface style={[styles.statsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statsHeader}>
              <View style={{ width: 32 }} />
              <Text style={[styles.sectionTitle, { color: colors.text, textAlign: 'center' }]}>{t('journey.yourStats')}</Text>
              <TouchableOpacity
                onPress={() => setShowShareJourney(true)}
                activeOpacity={0.7}
                data-testid="share-journey-btn"
                style={styles.shareIconBtn}
              >
                <Ionicons name="share-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsGridCompact}>
              <TouchableOpacity 
                style={[styles.statBoxCompact, { backgroundColor: '#4DB8D810' }]}
                onPress={() => router.push('/my-country-visits')}
                activeOpacity={0.7}
                data-testid="stat-countries"
              >
                <Ionicons name="flag" size={20} color="#4DB8D8" />
                <Text style={[styles.statValueCompact, { color: colors.text }]}>
                  {stats.countries_visited || 0}
                </Text>
                <Text style={[styles.statLabelCompact, { color: colors.textSecondary }]}>{t('journey.countries')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.statBoxCompact, { backgroundColor: '#E8785010' }]}
                onPress={() => router.push('/my-landmark-visits')}
                activeOpacity={0.7}
                data-testid="stat-landmarks"
              >
                <Ionicons name="location" size={20} color="#E87850" />
                <Text style={[styles.statValueCompact, { color: colors.text }]}>{progressStats.overall.visited}</Text>
                <Text style={[styles.statLabelCompact, { color: colors.textSecondary }]}>{t('journey.landmarks')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.statBoxCompact, { backgroundColor: '#FFD70010' }]}
                onPress={() => router.push('/points-summary')}
                activeOpacity={0.7}
                data-testid="stat-points"
              >
                <Ionicons name="star" size={20} color="#FFD700" />
                <Text style={[styles.statValueCompact, { color: colors.text }]}>{progressStats.totalPoints || 0}</Text>
                <Text style={[styles.statLabelCompact, { color: colors.textSecondary }]}>Total Points</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.statBoxCompact, { backgroundColor: '#4CAF5010' }]}
                onPress={() => router.push('/continents')}
                activeOpacity={0.7}
                data-testid="stat-continents"
              >
                <Ionicons name="earth" size={20} color="#4CAF50" />
                <Text style={[styles.statValueCompact, { color: colors.text }]}>
                  {stats.continents_visited || 0}
                </Text>
                <Text style={[styles.statLabelCompact, { color: colors.textSecondary }]}>Continents</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.statBoxCompact, { backgroundColor: '#FFD70010' }]}
                onPress={() => router.push('/leaderboard')}
                activeOpacity={0.7}
                data-testid="stat-leaderboard"
              >
                <Ionicons name="trophy" size={20} color="#FFD700" />
                <Text style={[styles.statValueCompact, { color: colors.text }]}>
                  {stats.rank && stats.rank > 0 ? `#${stats.rank}` : 'N/A'}
                </Text>
                <Text style={[styles.statLabelCompact, { color: colors.textSecondary }]}>Leaderboard</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.statBoxCompact, { backgroundColor: rankProgress.currentRank.color + '15' }]}
                onPress={() => router.push('/ranks')}
                activeOpacity={0.7}
                data-testid="stat-rank-level"
              >
                <Ionicons name={rankProgress.currentRank.icon as any} size={32} color={rankProgress.currentRank.color} />
                <Text style={[styles.statValueCompact, { color: colors.text, fontSize: 14 }]}>{rankProgress.currentRank.name}</Text>
                <Text style={[styles.statLabelCompact, { color: colors.textSecondary }]}>Rank</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        )}

        {/* Overall Progress */}
        {progressStats && (
          <Surface style={[styles.progressCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: 'center' }]}>{t('journey.overallProgress')}</Text>
            <View style={styles.progressContainer}>
              <CircularProgress
                percentage={progressStats.overall.percentage}
                size={140}
                strokeWidth={12}
                label={t('journey.complete')}
                sublabel={`${progressStats.overall.visited}/${progressStats.overall.total}`}
              />
              <Text style={[styles.progressDescription, { color: colors.textSecondary }]}>
                {progressStats.overall.percentage < 10
                  ? t('journey.progressMsg1')
                  : progressStats.overall.percentage < 30
                  ? t('journey.progressMsg2')
                  : progressStats.overall.percentage < 60
                  ? t('journey.progressMsg3')
                  : progressStats.overall.percentage < 90
                  ? t('journey.progressMsg4')
                  : t('journey.progressMsg5')}
              </Text>
            </View>
          </Surface>
        )}

        {/* Next Rank */}
        {rankProgress.nextRank && (
          <Surface style={[styles.milestoneCard, { backgroundColor: colors.surface }]}>
            <View style={styles.milestoneRow}>
              <View style={styles.milestoneContent}>
                <View style={styles.milestoneHeader}>
                  <Ionicons name="rocket" size={24} color={rankProgress.nextRank.color} />
                  <Text style={[styles.milestoneTitle, { color: colors.text }]}>Next Rank</Text>
                </View>
                <Text style={[styles.milestoneName, { color: rankProgress.nextRank.color }]}>{rankProgress.nextRank.name}</Text>
                <Text style={[styles.milestoneProgress, { color: colors.textSecondary }]}>
                  {rankProgress.pointsNeededForNext} more points needed
                </Text>
                <ProgressBar 
                  percentage={rankProgress.progressPercentage}
                  style={styles.milestoneProgressBar}
                />
              </View>
              <View style={[styles.milestoneBadgeIcon, { backgroundColor: rankProgress.nextRank.color + '15' }]}>
                <Ionicons 
                  name={rankProgress.nextRank.icon as any} 
                  size={36} 
                  color={rankProgress.nextRank.color} 
                />
              </View>
            </View>
          </Surface>
        )}

        {/* Continental Progress */}
        {progressStats && (
          <Surface style={[styles.continentalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('journey.continentalProgress')}</Text>
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
                        color={colors.primary}
                      />
                      <Text style={[styles.continentName, { color: colors.text }]}>{continent}</Text>
                    </View>
                    <Text style={[styles.continentCount, { color: colors.textSecondary }]}>
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

        {/* Quick Navigation Links - Between Continental Progress and Recent Badges */}
        <Surface style={[styles.countryVisitsCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.countryVisitsRow}
            onPress={() => router.push('/my-landmark-visits')}
            activeOpacity={0.7}
            data-testid="nav-my-landmark-visits"
          >
            <View style={styles.countryVisitsLeft}>
              <View style={[styles.countryVisitsIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="location" size={22} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.countryVisitsTitle, { color: colors.text }]}>My Landmark Visits</Text>
                <Text style={[styles.countryVisitsSubtitle, { color: colors.textLight }]}>All visited landmarks</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textLight} />
          </TouchableOpacity>
        </Surface>

        <Surface style={[styles.countryVisitsCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.countryVisitsRow}
            onPress={() => router.push('/my-country-visits')}
            activeOpacity={0.7}
          >
            <View style={styles.countryVisitsLeft}>
              <View style={[styles.countryVisitsIcon, { backgroundColor: colors.primaryLight + '20' }]}>
                <Ionicons name="flag" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.countryVisitsTitle, { color: colors.text }]}>{t('journey.myCountryVisits')}</Text>
                <Text style={[styles.countryVisitsSubtitle, { color: colors.textLight }]}>{t('journey.photoCollages')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textLight} />
          </TouchableOpacity>
        </Surface>

        <Surface style={[styles.countryVisitsCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.countryVisitsRow}
            onPress={() => router.push('/points-summary')}
            activeOpacity={0.7}
            data-testid="nav-points-summary"
          >
            <View style={styles.countryVisitsLeft}>
              <View style={[styles.countryVisitsIcon, { backgroundColor: colors.accentYellow + '20' }]}>
                <Ionicons name="star" size={22} color={colors.accentYellow} />
              </View>
              <View>
                <Text style={[styles.countryVisitsTitle, { color: colors.text }]}>Points Summary</Text>
                <Text style={[styles.countryVisitsSubtitle, { color: colors.textLight }]}>How points work</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textLight} />
          </TouchableOpacity>
        </Surface>

        <Surface style={[styles.countryVisitsCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.countryVisitsRow}
            onPress={() => router.push('/photo-collection')}
            activeOpacity={0.7}
          >
            <View style={styles.countryVisitsLeft}>
              <View style={[styles.countryVisitsIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="images" size={22} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.countryVisitsTitle, { color: colors.text }]}>{t('journey.myPhotos')}</Text>
                <Text style={[styles.countryVisitsSubtitle, { color: colors.textLight }]}>{t('journey.travelMemories')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textLight} />
          </TouchableOpacity>
        </Surface>

        <View style={styles.bottomSpacer} />
        <View ref={customVisitsRef}>
        <TouchableOpacity 
          style={[styles.navRow, { backgroundColor: colors.surface }]}
          onPress={() => {
            if (canCreateCustomVisits) {
              router.push('/custom-visits');
            } else {
              setShowProLock(true);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.navRowIcon, { backgroundColor: colors.accentTeal + '15' }]}>
            <Ionicons name="globe-outline" size={22} color={colors.accentTeal} />
          </View>
          <View style={styles.navRowText}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.navRowTitle, { color: colors.text }]}>Custom Visits</Text>
              {!canCreateCustomVisits && (
                <View style={[styles.proBadge, { backgroundColor: colors.accentTeal + '15' }]}>
                  <Ionicons name="diamond" size={12} color={colors.accentTeal} />
                  <Text style={[styles.proBadgeText, { color: colors.accentTeal }]}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={[styles.navRowSubtitle, { color: colors.textLight }]}>
              {userCreatedVisits.length > 0 
                ? `${userCreatedVisits.length} custom visit${userCreatedVisits.length !== 1 ? 's' : ''} recorded`
                : 'Record visits to places not in our database'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Custom Visit Modal */}

      {/* Pro Feature Lock Modal */}
      <ProFeatureLock
        visible={showProLock}
        onClose={() => setShowProLock(false)}
        feature="custom_visits"
      />

      {/* Share Journey Card Modal */}
      {stats && progressStats && (
        <ShareJourneyCard
          visible={showShareJourney}
          onDismiss={() => setShowShareJourney(false)}
          stats={{
            landmarks: progressStats.overall.visited,
            countries: stats.countries_visited,
            continents: stats.continents_visited,
            points: progressStats.totalPoints || 0,
            verifiedPoints: progressStats.verifiedPoints || 0,
            rank: stats.rank,
          }}
          userName={user?.name || 'Traveler'}
        />
      )}
    </View>
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
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  statsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  shareIconBtn: {
    padding: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  // Compact stats grid
  statsGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    justifyContent: 'space-between',
  },
  statBoxCompact: {
    width: '31%',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  statValueCompact: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statLabelCompact: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  // Share Journey Button
  // Original stats (keeping for backward compatibility)
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
  progressCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
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
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneBadgeIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.md,
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
  bottomSpacer: {
    height: theme.spacing.xl,
  },
  // My Country Visits Section Styles
  countryVisitsCard: {
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  navRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  navRowText: {
    flex: 1,
  },
  navRowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  navRowSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  countryVisitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  countryVisitsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  countryVisitsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryVisitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  countryVisitsSubtitle: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  // Custom Visits Section Styles
  // Pro badge for locked features
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: theme.spacing.xs,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E8A8A',
  },
});
