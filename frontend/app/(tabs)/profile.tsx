import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Alert, StatusBar } from 'react-native';
import { Text, Surface, Button, Divider, Switch, List, Dialog, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKEND_URL } from '../../utils/config';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../../styles/theme';
import UpgradeModal from '../../components/UpgradeModal';
import { CircularProgress } from '../../components/CircularProgress';
import { ProgressBar } from '../../components/ProgressBar';
import RankBadge from '../../components/RankBadge';
import RankProgress from '../../components/RankProgress';
import StreakDisplay from '../../components/StreakDisplay';
import { getUserRank } from '../../utils/rankSystem';
import { DefaultAvatar } from '../../components/DefaultAvatar';

// Helper to get token (works on both web and native)
import { shareProgress } from '../../utils/shareUtils';

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
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
    fetchProgressStats();
    fetchBadges();
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

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
        style={[styles.stickyHeader, { paddingTop: topPadding }]}
      >
        {/* Single Row: Title + Actions Left, Branding Right */}
        <View style={styles.headerRow}>
          <View style={styles.titleWithActions}>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push('/notifications')}
              >
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <Ionicons name="earth" size={16} color="#2A2A2A" />
            <Text style={styles.brandingTextDark}>WanderList</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView>

        {/* FINAL: User Left, Rank Right, Stats Row */}
        <Surface style={styles.profileCard}>
          {/* Top: User & Rank - Tight & Balanced */}
          <View style={{ flexDirection: 'row', marginTop: 4, marginBottom: 8, width: '100%', alignItems: 'center' }}>
            {/* Left: User */}
            <View style={{ flex: 65, flexDirection: 'row', alignItems: 'center', paddingRight: 4 }}>
              {user?.picture ? (
                <Image source={{ uri: user.picture }} style={styles.profileImageLarge} />
              ) : (
                <DefaultAvatar name={user?.name || 'User'} size={85} />
              )}
              <View style={{ flex: 1, marginLeft: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={styles.userNameLarge}>{user?.name}</Text>
                  <TouchableOpacity 
                    onPress={() => router.push('/edit-profile')}
                    style={{ marginLeft: 6, padding: 2 }}
                  >
                    <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.tierBadgeLarge}>
                  {user?.subscription_tier === 'premium' ? (
                    <>
                      <Ionicons name="diamond" size={12} color={theme.colors.accent} />
                      <Text style={[styles.tierTextLarge, { color: theme.colors.accent }]}>Premium user</Text>
                    </>
                  ) : user?.subscription_tier === 'basic' ? (
                    <>
                      <Ionicons name="ribbon" size={12} color={theme.colors.primary} />
                      <Text style={[styles.tierTextLarge, { color: theme.colors.primary }]}>Basic user</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="person-outline" size={12} color={theme.colors.textSecondary} />
                      <Text style={[styles.tierTextLarge, { color: theme.colors.textSecondary }]}>Freemium user</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
            
            {/* Right: Rank - 35% - Vertically Centered */}
            <View style={{ flex: 35, alignItems: 'flex-end', justifyContent: 'center' }}>
              <RankBadge 
                rank={getUserRank(progressStats?.totalPoints || 0)} 
                size="medium"
                showName={true}
              />
            </View>
          </View>
          
          {/* Stats - One Horizontal Row */}
          {stats && progressStats && (
            <View style={{ flexDirection: 'row', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Ionicons name="location" size={16} color="#4DB8D8" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#2A2A2A', marginTop: 2 }}>
                  {progressStats.totalLandmarks || stats.total_visits || 0}
                </Text>
                <Text style={{ fontSize: 8, fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase' }}>
                  Landmarks
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Ionicons name="flag" size={16} color="#FF6B6B" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#2A2A2A', marginTop: 2 }}>
                  {stats.countries_visited || 0}
                </Text>
                <Text style={{ fontSize: 8, fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase' }}>
                  Countries
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Ionicons name="earth" size={16} color="#66BB6A" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#2A2A2A', marginTop: 2 }}>
                  {stats.continents_visited || 0}
                </Text>
                <Text style={{ fontSize: 8, fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase' }}>
                  Continents
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#C9A961', marginTop: 2 }}>
                  {progressStats.totalPoints || 0}
                </Text>
                <Text style={{ fontSize: 8, fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase' }}>
                  Points
                </Text>
              </View>
            </View>
          )}
        </Surface>


        {/* Rank Progress - Removed, overlaps with Journey */}

        {/* Streak - Removed, overlaps with Journey */}

        {/* Badges - Removed, duplicates Journey */}

        {/* Menu - Simplified */}
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

        {/* Stats - Removed, duplicates Journey/Explore */}

        {/* Menu - Simplified */}
        <Surface style={styles.menuCard}>
          <List.Item
            title="About WanderList"
            description="Learn how to use the app"
            left={props => <List.Icon {...props} icon="information-outline" color={theme.colors.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.textLight} />}
            onPress={() => router.push('/about')}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="WanderList Pro"
            description="Upgrade for premium features"
            left={props => <List.Icon {...props} icon="diamond" color="#764ba2" />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.textLight} />}
            onPress={() => router.push('/subscription')}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Settings"
            description="App preferences and account"
            left={props => <List.Icon {...props} icon="cog-outline" color={theme.colors.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.textLight} />}
            onPress={() => router.push('/settings')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stickyHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandingTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  titleWithActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    marginLeft: theme.spacing.sm,
  },
  headerIconButton: {
    padding: theme.spacing.xs,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 8,
  },
  profileCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  profileImage: {
    width: 80,  // Reduced from 100
    height: 80,
    borderRadius: 40,
    marginBottom: theme.spacing.sm,  // Reduced from md
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
  userBio: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: theme.spacing.sm,
  },
  userLocation: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
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
  compactStatsCard: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  compactStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  compactStat: {
    alignItems: 'center',
    flex: 1,
  },
  compactStatNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2A2A2A',  // Explicit dark color
    marginBottom: 4,
  compactContainer: {
    margin: theme.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: '#FFFFFF',
    ...theme.shadows.card,
    marginBottom: theme.spacing.sm,
  },
  userSection: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  compactProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: theme.spacing.sm,
  },
  userInfo: {
    flex: 1,
  },
  compactUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  compactBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  quickStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  compactRankSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },

  },
  compactStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B6B6B',  // Explicit gray
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactStatDivider: {
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  profileImageCompact: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  userNameCompact: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  tierBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tierText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  gridHeader: {
  rankBadgeSmall: {
    marginTop: 6,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },

    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  userHeroSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  profileImageLarge: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    marginRight: theme.spacing.md,
  },
  userInfoLeft: {
    flex: 1,
  },
  userNameLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  tierBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  tierTextLarge: {
    fontSize: 12,
    fontWeight: '600',
  },
  rankRight: {
    marginLeft: theme.spacing.sm,
  },

  profileImageHero: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: theme.spacing.md,
  },
  userNameHero: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  tierRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  tierBadgeHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierTextHero: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsGrid2x2: {
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
  },
  statBox2x2: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    flex: 1,
  },
  statNum2x2: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel2x2: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },

    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  rankHeroSection: {
    marginTop: theme.spacing.xs,
  },
  elegantStatsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  elegantStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  elegantStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  elegantStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },

    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  gridProfileImage: {
    width: 45,
    height: 45,
    borderRadius: 22,
    marginRight: theme.spacing.sm,
  },
  gridUserInfo: {
    flex: 1,
  },
  gridUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  gridStatsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statsChip: {
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.text,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  gridCard: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },

  },
  statItemCompact: {
    alignItems: 'center',
  },
  statNumCompact: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabelCompact: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
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
  streakCard: {
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
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
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
