import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Alert, StatusBar } from 'react-native';
import { Text, Surface, Button, Divider, List, Dialog, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKEND_URL } from '../../utils/config';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../../styles/theme';
import UpgradeModal from '../../components/UpgradeModal';
import RankBadge from '../../components/RankBadge';
import { getUserRank } from '../../utils/rankSystem';
import { DefaultAvatar } from '../../components/DefaultAvatar';

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
          {/* Top: User & Rank Row */}
          <View style={styles.userRankRow}>
            {/* Left: User Info */}
            <View style={styles.userSection}>
              {user?.picture ? (
                <Image source={{ uri: user.picture }} style={styles.profileImageLarge} />
              ) : (
                <DefaultAvatar name={user?.name || 'User'} size={85} />
              )}
              <View style={styles.userDetails}>
                <View style={styles.nameEditRow}>
                  <Text style={styles.userNameLarge}>{user?.name}</Text>
                  <TouchableOpacity 
                    onPress={() => router.push('/edit-profile')}
                    style={styles.editButton}
                  >
                    <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.tierBadge}>
                  {user?.subscription_tier === 'premium' ? (
                    <>
                      <Ionicons name="diamond" size={12} color={theme.colors.accent} />
                      <Text style={[styles.tierText, styles.tierPremium]}>Premium user</Text>
                    </>
                  ) : user?.subscription_tier === 'basic' ? (
                    <>
                      <Ionicons name="ribbon" size={12} color={theme.colors.primary} />
                      <Text style={[styles.tierText, styles.tierBasic]}>Basic user</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="person-outline" size={12} color={theme.colors.textSecondary} />
                      <Text style={[styles.tierText, styles.tierFree]}>Freemium user</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
            
            {/* Right: Rank Badge */}
            <View style={styles.rankSection}>
              <RankBadge 
                rank={getUserRank(progressStats?.totalPoints || 0)} 
                size="medium"
                showName={true}
              />
            </View>
          </View>
          
          {/* Stats Row */}
          {stats && progressStats && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="location" size={16} color="#4DB8D8" />
                <Text style={styles.statValue}>
                  {progressStats.overall?.visited || stats.total_visits || 0}
                </Text>
                <Text style={styles.statLabel}>Landmarks</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="flag" size={16} color="#FF6B6B" />
                <Text style={styles.statValue}>
                  {stats.countries_visited || 0}
                </Text>
                <Text style={styles.statLabel}>Countries</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="earth" size={16} color="#66BB6A" />
                <Text style={styles.statValue}>
                  {stats.continents_visited || 0}
                </Text>
                <Text style={styles.statLabel}>Continents</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={[styles.statValue, styles.statValueGold]}>
                  {progressStats.totalPoints || 0}
                </Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
            </View>
          )}
        </Surface>


        {/* Rank Progress - Removed, overlaps with Journey */}

        {/* Streak - Removed, overlaps with Journey */}

        {/* Badges - Removed, duplicates Journey */}

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
  // ============ CONTAINER ============
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ============ HEADER ============
  stickyHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
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

  // ============ PROFILE CARD ============
  profileCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },

  // ============ USER & RANK ROW ============
  userRankRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
  },
  userSection: {
    flex: 65,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  profileImageLarge: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    marginRight: theme.spacing.md,
  },
  userDetails: {
    flex: 1,
    marginLeft: 8,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userNameLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  editButton: {
    marginLeft: 6,
    padding: 2,
  },
  rankSection: {
    flex: 35,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  // ============ TIER BADGE ============
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tierPremium: {
    color: theme.colors.accent,
  },
  tierBasic: {
    color: theme.colors.primary,
  },
  tierFree: {
    color: theme.colors.textSecondary,
  },

  // ============ STATS ROW ============
  statsRow: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2A2A',
    marginTop: 2,
  },
  statValueGold: {
    color: '#C9A961',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#6B6B6B',
    textTransform: 'uppercase',
  },

  // ============ MENU CARD ============
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

  // ============ FOOTER ============
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
});
