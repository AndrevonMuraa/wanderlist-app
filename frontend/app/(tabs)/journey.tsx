import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl, StatusBar } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress } from '../../components/CircularProgress';
import { ProgressBar } from '../../components/ProgressBar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import AddUserCreatedVisitModal from '../../components/AddUserCreatedVisitModal';
import ProFeatureLock from '../../components/ProFeatureLock';
import { useSubscription } from '../../hooks/useSubscription';
import { BACKEND_URL } from '../../utils/config';
import { HeaderBranding } from '../../components/BrandedGlobeIcon';

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
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [userCreatedVisits, setUserCreatedVisits] = useState<UserCreatedVisit[]>([]);
  const [showCustomVisitModal, setShowCustomVisitModal] = useState(false);
  const [showProLock, setShowProLock] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // All hooks must be called in consistent order
  const router = useRouter();
  const { user } = useAuth();
  const subscriptionData = useSubscription();
  const canCreateCustomVisits = subscriptionData.canCreateCustomVisits;
  const isPro = subscriptionData.isPro;

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = await getToken();
      
      const [statsRes, progressRes, badgesRes, visitsRes, customVisitsRes] = await Promise.all([
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
        }),
        fetch(`${BACKEND_URL}/api/user-created-visits`, {
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
      
      if (customVisitsRes.ok) {
        const data = await customVisitsRes.json();
        setUserCreatedVisits(data);
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
    // Milestones adjusted for 520 total landmarks
    const milestones = [10, 25, 50, 100, 200, 350, 500];
    const next = milestones.find(m => m > visited);
    if (next) {
      return {
        target: next,
        remaining: next - visited,
        name: next === 10 ? 'Explorer' : 
              next === 25 ? 'Adventurer' : 
              next === 50 ? 'Globetrotter' : 
              next === 100 ? 'World Traveler' : 
              next === 200 ? 'Seasoned Traveler' :
              next === 350 ? 'Legend' : 
              'Ultimate Explorer'
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
    return <LoadingSpinner message="Loading your journey..." />;
  }

  const nextMilestone = getNextMilestone();
  const topContinent = getTopContinent();
  
  // Get safe area insets for proper header padding (matches Explore Continents)
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding }]}
      >
        {/* Single Row: Title Left, Branding Right */}
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>My Journey</Text>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <HeaderBranding size={18} textColor="#2A2A2A" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Travel Statistics Dashboard - Compressed */}
        {stats && progressStats && (
          <Surface style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text style={styles.sectionTitle}>Your Stats</Text>
              <TouchableOpacity>
                <Ionicons name="share-social-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsGridCompact}>
              <View style={styles.statBoxCompact}>
                <Ionicons name="flag" size={20} color={theme.colors.primary} />
                <Text style={styles.statValueCompact}>
                  {Object.keys(progressStats.countries).filter(
                    countryId => progressStats.countries[countryId].visited > 0
                  ).length}
                </Text>
                <Text style={styles.statLabelCompact}>Countries</Text>
              </View>

              <View style={styles.statBoxCompact}>
                <Ionicons name="location" size={20} color={theme.colors.accent} />
                <Text style={styles.statValueCompact}>{progressStats.overall.visited}</Text>
                <Text style={styles.statLabelCompact}>Landmarks</Text>
              </View>

              <View style={styles.statBoxCompact}>
                <Ionicons name="star" size={20} color={theme.colors.accentYellow} />
                <Text style={styles.statValueCompact}>{progressStats.totalPoints || 0}</Text>
                <Text style={styles.statLabelCompact}>Points</Text>
              </View>

              <View style={styles.statBoxCompact}>
                <Ionicons name="flame" size={20} color={theme.colors.error} />
                <Text style={styles.statValueCompact}>{stats.current_streak || 0}</Text>
                <Text style={styles.statLabelCompact}>Streak</Text>
              </View>

              <View style={styles.statBoxCompact}>
                <Ionicons name="trophy" size={20} color={theme.colors.accentBronze} />
                <Text style={styles.statValueCompact}>
                  {stats.rank && stats.rank > 0 ? `#${stats.rank}` : 'N/A'}
                </Text>
                <Text style={styles.statLabelCompact}>Rank</Text>
              </View>

              <View style={styles.statBoxCompact}>
                <Ionicons name="ribbon" size={20} color={theme.colors.primary} />
                <Text style={styles.statValueCompact}>{badges.length}</Text>
                <Text style={styles.statLabelCompact}>Badges</Text>
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

        {/* My Country Visits Section */}
        <Surface style={styles.countryVisitsCard}>
          <TouchableOpacity
            style={styles.countryVisitsRow}
            onPress={() => router.push('/my-country-visits')}
            activeOpacity={0.7}
          >
            <View style={styles.countryVisitsLeft}>
              <View style={styles.countryVisitsIcon}>
                <Ionicons name="flag" size={22} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.countryVisitsTitle}>My Country Visits</Text>
                <Text style={styles.countryVisitsSubtitle}>Photo collages and travel diaries</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.colors.textLight} />
          </TouchableOpacity>
        </Surface>

        {/* My Photos Section */}
        <Surface style={styles.countryVisitsCard}>
          <TouchableOpacity
            style={styles.countryVisitsRow}
            onPress={() => router.push('/photo-collection')}
            activeOpacity={0.7}
          >
            <View style={styles.countryVisitsLeft}>
              <View style={[styles.countryVisitsIcon, { backgroundColor: theme.colors.accentLight + '20' }]}>
                <Ionicons name="images" size={22} color={theme.colors.accent} />
              </View>
              <View>
                <Text style={styles.countryVisitsTitle}>My Photos</Text>
                <Text style={styles.countryVisitsSubtitle}>All your travel memories in one place</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.colors.textLight} />
          </TouchableOpacity>
        </Surface>

        {/* Travel Map Section */}
        <Surface style={styles.countryVisitsCard}>
          <TouchableOpacity
            style={styles.countryVisitsRow}
            onPress={() => router.push('/(tabs)/map')}
            activeOpacity={0.7}
          >
            <View style={styles.countryVisitsLeft}>
              <View style={[styles.countryVisitsIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="globe" size={22} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.countryVisitsTitle}>Travel Map</Text>
                <Text style={styles.countryVisitsSubtitle}>See all your visited places on a map</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.colors.textLight} />
          </TouchableOpacity>
        </Surface>

        {/* Detailed Statistics Section */}
        <Surface style={styles.countryVisitsCard}>
          <TouchableOpacity
            style={styles.countryVisitsRow}
            onPress={() => router.push('/statistics')}
            activeOpacity={0.7}
          >
            <View style={styles.countryVisitsLeft}>
              <View style={[styles.countryVisitsIcon, { backgroundColor: '#AB47BC20' }]}>
                <Ionicons name="stats-chart" size={22} color="#AB47BC" />
              </View>
              <View>
                <Text style={styles.countryVisitsTitle}>Detailed Statistics</Text>
                <Text style={styles.countryVisitsSubtitle}>Charts, rankings & travel insights</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.colors.textLight} />
          </TouchableOpacity>
        </Surface>

        {/* Custom Visits Section */}
        <Surface style={styles.customVisitsCard}>
          <View style={styles.customVisitsHeader}>
            <View style={styles.customVisitsHeaderLeft}>
              <Ionicons name="globe-outline" size={24} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>Custom Visits</Text>
              {!canCreateCustomVisits && (
                <View style={styles.proBadge}>
                  <Ionicons name="diamond" size={12} color="#764ba2" />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.addCustomButton, !canCreateCustomVisits && styles.addCustomButtonLocked]}
              onPress={() => {
                if (canCreateCustomVisits) {
                  setShowCustomVisitModal(true);
                } else {
                  setShowProLock(true);
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={canCreateCustomVisits ? "add-circle" : "lock-closed"} 
                size={20} 
                color={canCreateCustomVisits ? theme.colors.primary : "#764ba2"} 
              />
              <Text style={[styles.addCustomButtonText, !canCreateCustomVisits && styles.addCustomButtonTextLocked]}>
                {canCreateCustomVisits ? "Add Visit" : "Unlock"}
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.customVisitsDescription}>
            {canCreateCustomVisits 
              ? "Record visits to places not in our database" 
              : "Upgrade to Pro to record visits to any destination worldwide"}
          </Text>

          {!canCreateCustomVisits ? (
            <TouchableOpacity 
              style={styles.emptyCustomVisitsLocked}
              onPress={() => setShowProLock(true)}
              activeOpacity={0.8}
            >
              <View style={styles.lockIconContainer}>
                <Ionicons name="lock-closed" size={36} color="#764ba2" />
              </View>
              <Text style={styles.emptyCustomTextLocked}>Pro Feature</Text>
              <Text style={styles.emptyCustomSubtextLocked}>Tap to learn more about Custom Visits</Text>
            </TouchableOpacity>
          ) : userCreatedVisits.length === 0 ? (
            <TouchableOpacity 
              style={styles.emptyCustomVisits}
              onPress={() => setShowCustomVisitModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="airplane-outline" size={40} color={theme.colors.textLight} />
              <Text style={styles.emptyCustomText}>No custom visits yet</Text>
              <Text style={styles.emptyCustomSubtext}>Tap to add your first custom visit!</Text>
            </TouchableOpacity>
          ) : (
            <>
              {userCreatedVisits.slice(0, 5).map((visit) => {
                // Get landmarks info
                const landmarkNames = visit.landmarks?.map(lm => 
                  typeof lm === 'string' ? lm : lm.name
                ).filter(Boolean) || [];
                const hasLandmarks = landmarkNames.length > 0;
                const landmarkPhotosCount = visit.landmarks?.filter(lm => 
                  typeof lm === 'object' && lm.photo
                ).length || 0;
                const totalPhotos = (visit.photos?.length || 0) + landmarkPhotosCount;
                
                // Build display text
                let displayName = visit.country_name;
                let displaySubtext = '';
                
                if (hasLandmarks) {
                  if (landmarkNames.length === 1) {
                    displayName = landmarkNames[0];
                    displaySubtext = visit.country_name;
                  } else {
                    displayName = `${landmarkNames.length} places in ${visit.country_name}`;
                    displaySubtext = landmarkNames.slice(0, 2).join(', ') + (landmarkNames.length > 2 ? '...' : '');
                  }
                }
                
                return (
                  <View key={visit.user_created_visit_id} style={styles.customVisitItem}>
                    <View style={styles.customVisitIcon}>
                      <Ionicons 
                        name={hasLandmarks ? "location" : "flag"} 
                        size={20} 
                        color={theme.colors.accent} 
                      />
                    </View>
                    <View style={styles.customVisitInfo}>
                      <Text style={styles.customVisitName} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text style={styles.customVisitCountry} numberOfLines={1}>
                        {displaySubtext ? `${displaySubtext} • ` : ''}
                        {new Date(visit.visited_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                    <View style={styles.customVisitMeta}>
                      {totalPhotos > 0 && (
                        <View style={styles.photoCountBadge}>
                          <Ionicons name="images-outline" size={14} color={theme.colors.textLight} />
                          <Text style={styles.photoCountText}>{totalPhotos}</Text>
                        </View>
                      )}
                      <Ionicons 
                        name={
                          visit.visibility === 'public' ? 'globe-outline' : 
                          visit.visibility === 'friends' ? 'people-outline' : 
                          'lock-closed-outline'
                        } 
                        size={16} 
                        color={theme.colors.textLight} 
                      />
                    </View>
                  </View>
                );
              })}
              {userCreatedVisits.length > 5 && (
                <Text style={styles.viewMoreText}>
                  +{userCreatedVisits.length - 5} more custom visits
                </Text>
              )}
            </>
          )}
        </Surface>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Custom Visit Modal */}
      <AddUserCreatedVisitModal
        visible={showCustomVisitModal}
        onClose={() => setShowCustomVisitModal(false)}
        onSuccess={fetchAllData}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  // My Country Visits Section Styles
  countryVisitsCard: {
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
    overflow: 'hidden',
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
  customVisitsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  customVisitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  customVisitsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addCustomButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  customVisitsDescription: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.md,
  },
  emptyCustomVisits: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.lg,
  },
  emptyCustomText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
  },
  emptyCustomSubtext: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  customVisitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  customVisitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  customVisitInfo: {
    flex: 1,
  },
  customVisitName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  customVisitCountry: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  customVisitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  photoCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textLight,
  },
  viewMoreText: {
    fontSize: 13,
    color: theme.colors.primary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontWeight: '500',
  },
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
    color: '#764ba2',
  },
  addCustomButtonLocked: {
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
  },
  addCustomButtonTextLocked: {
    color: '#764ba2',
  },
  emptyCustomVisitsLocked: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(118, 75, 162, 0.3)',
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(118, 75, 162, 0.05)',
  },
  lockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyCustomTextLocked: {
    fontSize: 15,
    fontWeight: '600',
    color: '#764ba2',
    marginTop: theme.spacing.xs,
  },
  emptyCustomSubtextLocked: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 4,
  },
});
