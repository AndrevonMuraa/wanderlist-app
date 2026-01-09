import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { Text, Surface, ProgressBar as PaperProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';

const BACKEND_URL = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_BACKEND_URL || '');

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface BadgeData {
  badge_type: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  is_earned: boolean;
  progress: number;
  current_value: number;
  target_value: number;
  progress_text: string;
  earned_at: string | null;
}

interface AchievementsData {
  earned_badges: BadgeData[];
  locked_badges: BadgeData[];
  stats: {
    total_badges: number;
    earned_count: number;
    locked_count: number;
    completion_percentage: number;
  };
}

export default function AchievementsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'earned' | 'locked'>('earned');

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/achievements/showcase`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const achievementsData = await response.json();
        setData(achievementsData);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAchievements();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderBadgeCard = (badge: BadgeData) => {
    const isEarned = badge.is_earned;

    return (
      <Surface
        key={badge.badge_type}
        style={[
          styles.badgeCard,
          isEarned ? styles.badgeCardEarned : styles.badgeCardLocked,
        ]}
        elevation={isEarned ? 2 : 1}
      >
        {isEarned && (
          <View style={styles.earnedRibbon}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          </View>
        )}

        <View style={styles.badgeIconContainer}>
          <Text style={[
            styles.badgeIcon,
            !isEarned && styles.badgeIconLocked,
          ]}>
            {badge.badge_icon}
          </Text>
        </View>

        <Text style={[
          styles.badgeName,
          !isEarned && styles.textLocked,
        ]}>
          {badge.badge_name}
        </Text>

        <Text style={[
          styles.badgeDescription,
          !isEarned && styles.textLocked,
        ]}>
          {badge.badge_description}
        </Text>

        {!isEarned && badge.target_value > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>{badge.progress_text}</Text>
              <Text style={styles.progressPercent}>{badge.progress}%</Text>
            </View>
            <PaperProgressBar
              progress={badge.progress / 100}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
          </View>
        )}

        {isEarned && badge.earned_at && (
          <View style={styles.earnedDateContainer}>
            <Ionicons name="calendar-outline" size={12} color="#666" />
            <Text style={styles.earnedDate}>
              {formatDate(badge.earned_at)}
            </Text>
          </View>
        )}
      </Surface>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Achievements</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Achievements</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text>Failed to load achievements</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayedBadges = selectedTab === 'earned' ? data.earned_badges : data.locked_badges;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.headerRight}>
          <Ionicons name="trophy" size={24} color="#FFD700" />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Card */}
        <Surface style={styles.statsCard} elevation={2}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsGradient}
          >
            <View style={styles.statsContent}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{data.stats.earned_count}</Text>
                  <Text style={styles.statLabel}>Earned</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{data.stats.total_badges}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{data.stats.completion_percentage}%</Text>
                  <Text style={styles.statLabel}>Complete</Text>
                </View>
              </View>
              <View style={styles.overallProgressContainer}>
                <Text style={styles.overallProgressLabel}>Overall Progress</Text>
                <PaperProgressBar
                  progress={data.stats.completion_percentage / 100}
                  color="#FFD700"
                  style={styles.overallProgressBar}
                />
              </View>
            </View>
          </LinearGradient>
        </Surface>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'earned' && styles.tabActive]}
            onPress={() => setSelectedTab('earned')}
          >
            <Text style={[styles.tabText, selectedTab === 'earned' && styles.tabTextActive]}>
              Earned ({data.stats.earned_count})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'locked' && styles.tabActive]}
            onPress={() => setSelectedTab('locked')}
          >
            <Text style={[styles.tabText, selectedTab === 'locked' && styles.tabTextActive]}>
              Locked ({data.stats.locked_count})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Badges Grid */}
        <View style={styles.badgesSection}>
          {displayedBadges.length === 0 ? (
            <Surface style={styles.emptyCard} elevation={1}>
              <Ionicons
                name={selectedTab === 'earned' ? 'trophy-outline' : 'lock-closed-outline'}
                size={48}
                color="#ccc"
              />
              <Text style={styles.emptyText}>
                {selectedTab === 'earned' 
                  ? 'No achievements earned yet'
                  : 'All achievements unlocked!'}
              </Text>
              <Text style={styles.emptySubtext}>
                {selectedTab === 'earned'
                  ? 'Start your journey to unlock amazing badges!'
                  : 'Congratulations on completing everything!'}
              </Text>
            </Surface>
          ) : (
            <View style={styles.badgesGrid}>
              {displayedBadges.map((badge) => renderBadgeCard(badge))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
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
  statsCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 20,
  },
  statsContent: {
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  overallProgressContainer: {
    gap: 8,
  },
  overallProgressLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  overallProgressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    elevation: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  badgesSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    position: 'relative',
  },
  badgeCardEarned: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  badgeCardLocked: {
    opacity: 0.7,
  },
  earnedRibbon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  badgeIconContainer: {
    marginBottom: 12,
  },
  badgeIcon: {
    fontSize: 48,
  },
  badgeIconLocked: {
    opacity: 0.5,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  textLocked: {
    opacity: 0.6,
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
  },
  earnedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  earnedDate: {
    fontSize: 11,
    color: '#666',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});
