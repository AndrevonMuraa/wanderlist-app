import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Alert } from 'react-native';
import { Text, Surface, Button, Divider, Switch, List, Dialog, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKEND_URL } from '../../utils/config';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import UpgradeModal from '../../components/UpgradeModal';
import { CircularProgress } from '../../components/CircularProgress';
import { ProgressBar } from '../../components/ProgressBar';
import RankBadge from '../../components/RankBadge';
import RankProgress from '../../components/RankProgress';
import StreakDisplay from '../../components/StreakDisplay';
import { getUserRank } from '../../utils/rankSystem';

// Helper to get token (works on both web and native)
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface UserStats {
  total_visits: number;
  countries_visited: number;
  continents_visited: number;
  friends_count: number;
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
  is_featured: boolean;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
    fetchProgressStats();
    fetchBadges();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchProgressStats = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProgressStats(data);
      }
    } catch (error) {
      console.error('Error fetching progress stats:', error);
    }
  };

  const fetchBadges = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/achievements`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBadges(data);
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  const handleLogout = async () => {
    // Use custom dialog for mobile
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Profile</Text>
        </LinearGradient>

        <Surface style={styles.profileCard}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.defaultProfileImage]}>
              <Ionicons name="person-outline" size={56} color={theme.colors.textSecondary} />
            </View>
          )}
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={[styles.premiumBadge, {
            backgroundColor: user?.subscription_tier === 'premium' ? theme.colors.accent + '20' : 
                             user?.subscription_tier === 'basic' ? theme.colors.primary + '20' : 
                             theme.colors.surfaceTinted
          }]}>
            {user?.subscription_tier === 'premium' ? (
              <>
                <Ionicons name="diamond" size={18} color={theme.colors.accent} />
                <Text style={[styles.premiumText, { color: theme.colors.accent }]}>Premium Traveler</Text>
              </>
            ) : user?.subscription_tier === 'basic' ? (
              <>
                <Ionicons name="ribbon" size={18} color={theme.colors.primary} />
                <Text style={[styles.premiumText, { color: theme.colors.primary }]}>Basic Traveler</Text>
              </>
            ) : (
              <>
                <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
                <Text style={styles.freemiumText}>Free Traveler</Text>
              </>
            )}
          </View>
          
          {/* User Rank */}
          <View style={styles.rankContainer}>
            <RankBadge 
              rank={getUserRank(progressStats?.totalPoints || 0)} 
              size="large"
              showName={true}
            />
          </View>
        </Surface>

        {/* Rank Progress */}
        <Surface style={styles.rankProgressCard}>
          <Text style={styles.sectionTitle}>Rank Progress</Text>
          <RankProgress points={progressStats?.totalPoints || 0} />
        </Surface>

        {/* Streak */}
        <Surface style={styles.streakCard}>
          <Text style={styles.sectionTitle}>Daily Streak</Text>
          <StreakDisplay 
            currentStreak={user?.current_streak || 0}
            longestStreak={user?.longest_streak || 0}
            size="large"
          />
        </Surface>

        {/* Badges & Achievements */}
        {badges.length > 0 && (
          <Surface style={styles.badgesCard}>
            <View style={styles.badgesHeader}>
              <Text style={styles.sectionTitle}>Badges & Achievements</Text>
              <Text style={styles.badgeCount}>{badges.length} earned</Text>
            </View>
            
            <View style={styles.badgesGrid}>
              {badges.slice(0, 6).map((badge) => (
                <View key={badge.achievement_id} style={styles.badgeItem}>
                  <View style={styles.badgeIconContainer}>
                    <Text style={styles.badgeEmoji}>{badge.badge_icon}</Text>
                    {badge.is_featured && (
                      <View style={styles.featuredBadge}>
                        <Ionicons name="star" size={12} color={theme.colors.accentYellow} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.badgeName} numberOfLines={2}>{badge.badge_name}</Text>
                </View>
              ))}
              
              {badges.length > 6 && (
                <TouchableOpacity 
                  style={styles.viewAllBadges}
                  onPress={() => {/* Navigate to full badges page */}}
                >
                  <Ionicons name="ellipsis-horizontal-circle" size={32} color={theme.colors.primary} />
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
          </Surface>
        )}

        {/* Friend Limit Card for Free Users */}
        {user?.subscription_tier === 'free' && stats && (
          <Surface style={styles.limitsCard}>
            <View style={styles.limitHeader}>
              <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.limitTitle}>Your Plan Limits</Text>
            </View>
            
            <View style={styles.limitItem}>
              <View style={styles.limitInfo}>
                <Ionicons name="people-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.limitLabel}>Friends</Text>
              </View>
              <View style={styles.limitProgress}>
                <Text style={[
                  styles.limitValue,
                  stats.friends_count >= 5 && { color: theme.colors.error }
                ]}>
                  {stats.friends_count}/5
                </Text>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar,
                      { 
                        width: `${(stats.friends_count / 5) * 100}%`,
                        backgroundColor: stats.friends_count >= 5 ? theme.colors.error : theme.colors.primary
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.upgradeButton} 
              onPress={() => setShowUpgradeModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeGradient}
              >
                <Ionicons name="rocket-outline" size={20} color="#fff" />
                <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Surface>
        )}

        {stats && (
          <Surface style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name="flag-outline" size={28} color={theme.colors.primary} />
                </View>
                <Text style={styles.statNumber}>{stats.total_visits}</Text>
                <Text style={styles.statLabel}>Total Visits</Text>
              </View>
              <View style={styles.statBox}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
                  <Ionicons name="map-outline" size={28} color={theme.colors.accent} />
                </View>
                <Text style={styles.statNumber}>{stats.countries_visited}</Text>
                <Text style={styles.statLabel}>Countries</Text>
              </View>
              <View style={styles.statBox}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.colors.accentBronze + '20' }]}>
                  <Ionicons name="earth-outline" size={28} color={theme.colors.accentBronze} />
                </View>
                <Text style={styles.statNumber}>{stats.continents_visited}</Text>
                <Text style={styles.statLabel}>Continents</Text>
              </View>
              <View style={styles.statBox}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.colors.primaryLight + '20' }]}>
                  <Ionicons name="people-outline" size={28} color={theme.colors.primaryLight} />
                </View>
                <Text style={styles.statNumber}>{stats.friends_count}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
            </View>
          </Surface>
        )}

        <Surface style={styles.menuCard}>
          <List.Item
            title="About the App"
            description="Learn how to use WanderList"
            left={props => <List.Icon {...props} icon="information-outline" color={theme.colors.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.textLight} />}
            onPress={() => router.push('/about')}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Friends"
            description="Manage your friend connections"
            left={props => <List.Icon {...props} icon="account-group-outline" color={theme.colors.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.textLight} />}
            onPress={() => router.push('/friends')}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Settings"
            description="App preferences"
            left={props => <List.Icon {...props} icon="cog-outline" color={theme.colors.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.textLight} />}
            onPress={() => {}}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />
        </Surface>

        <Button
          mode="outlined"
          onPress={handleLogout}
          icon="logout"
          style={styles.logoutButton}
          textColor={theme.colors.error}
          buttonColor={theme.colors.surface}
        >
          Logout
        </Button>

        <Text style={styles.versionText}>WanderList v1.0.0</Text>
      </ScrollView>

      <Portal>
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Title>Logout</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to logout?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>Cancel</Button>
            <Button onPress={confirmLogout}>Logout</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <UpgradeModal 
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={(tier) => {
          setShowUpgradeModal(false);
          if (Platform.OS === 'web') {
            alert(`Upgrade to ${tier} would redirect to payment page`);
          } else {
            Alert.alert('Upgrade', `Upgrade to ${tier} would redirect to payment page`);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  profileCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing.md,
  },
  defaultProfileImage: {
    backgroundColor: theme.colors.surfaceTinted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
  },
  premiumText: {
    marginLeft: theme.spacing.xs,
    ...theme.typography.labelSmall,
    fontWeight: '700',
  },
  freemiumText: {
    marginLeft: theme.spacing.xs,
    ...theme.typography.labelSmall,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  rankContainer: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rankProgressCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  statsCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceTinted,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  statIconCircle: {
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
  menuCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
    overflow: 'hidden',
  },
  listItemTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  listItemDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  divider: {
    backgroundColor: theme.colors.border,
  },
  logoutButton: {
    margin: theme.spacing.md,
    borderColor: theme.colors.error,
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.md,
  },
  versionText: {
    textAlign: 'center',
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xl,
  },
  limitsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  limitTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    fontWeight: '700',
  },
  limitItem: {
    marginBottom: theme.spacing.md,
  },
  limitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  limitLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  limitProgress: {
    alignItems: 'flex-end',
  },
  limitValue: {
    ...theme.typography.h4,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs / 2,
  },
  progressBarContainer: {
    width: 120,
    height: 6,
    backgroundColor: theme.colors.surfaceTinted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  upgradeButtonText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  progressCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  overallProgressContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  progressDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    maxWidth: '80%',
  },
  continentalSection: {
    marginTop: theme.spacing.md,
  },
  subsectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  continentItem: {
    marginBottom: theme.spacing.md,
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
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  continentCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  continentProgressBar: {
    marginTop: theme.spacing.xs / 2,
  },
  badgesCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  badgeCount: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  badgeItem: {
    width: '28%',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  badgeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    position: 'relative',
    ...theme.shadows.sm,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  featuredBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  badgeName: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 11,
  },
  viewAllBadges: {
    width: '28%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  viewAllText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: theme.spacing.xs / 2,
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
  milestonesCard: {
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
    marginBottom: theme.spacing.lg,
    position: 'relative',
  },
  timelineDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    ...theme.shadows.sm,
  },
  timelineEmoji: {
    fontSize: 24,
  },
  timelineLine: {
    position: 'absolute',
    left: 23,
    top: 48,
    width: 2,
    height: '100%',
    backgroundColor: theme.colors.border,
  },
  timelineContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
    paddingTop: 4,
  },
  milestoneName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  milestoneDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  milestoneDate: {
    fontSize: 11,
    color: theme.colors.textLight,
    fontWeight: '600',
  },
});
