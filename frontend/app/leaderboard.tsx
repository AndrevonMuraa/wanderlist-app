import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { Text, Surface, Avatar, SegmentedButtons, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import RankBadge from '../components/RankBadge';
import { getUserRank } from '../utils/rankSystem';
import UniversalHeader from '../components/UniversalHeader';

const BACKEND_URL = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_BACKEND_URL || '');

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface LeaderboardEntry {
  user_id: string;
  name: string;
  picture?: string;
  username?: string;
  value: number;
  rank: number;
  current_streak?: number;
  longest_streak?: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  user_rank: number | null;
  total_users: number;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [timePeriod, setTimePeriod] = useState<'all_time' | 'monthly' | 'weekly'>('all_time');
  const [category, setCategory] = useState<'points' | 'visits' | 'countries' | 'streaks'>('points');
  const [friendsOnly, setFriendsOnly] = useState(false);
  
  // Data states
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  // Navigate back to social tab explicitly
  const handleBack = () => {
    router.push('/(tabs)/social');
  };

  useEffect(() => {
    loadLeaderboard();
  }, [timePeriod, category, friendsOnly]);

  const loadLeaderboard = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/leaderboard?time_period=${timePeriod}&category=${category}&friends_only=${friendsOnly}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data: LeaderboardResponse = await response.json();
        setLeaderboard(data.leaderboard);
        setUserRank(data.user_rank);
        setTotalUsers(data.total_users);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const getCategoryLabel = () => {
    switch (category) {
      case 'points': return 'Points';
      case 'visits': return 'Visits';
      case 'countries': return 'Countries';
      case 'streaks': return 'Streak Days';
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'points': return 'star';
      case 'visits': return 'location-outline';
      case 'countries': return 'earth-outline';
      case 'streaks': return 'flame-outline';
    }
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const renderLeaderboardEntry = (entry: LeaderboardEntry, index: number) => {
    const medal = getMedalEmoji(entry.rank);
    const rankInfo = getUserRank(Math.max(entry.value || 0, 0));

    return (
      <Surface key={entry.user_id} style={styles.entryCard} elevation={1}>
        <View style={styles.entryContent}>
          {/* Rank */}
          <View style={styles.rankContainer}>
            {medal ? (
              <Text style={styles.medalText}>{medal}</Text>
            ) : (
              <Text style={styles.rankText}>#{entry.rank}</Text>
            )}
          </View>

          {/* Avatar */}
          {entry.picture ? (
            <Avatar.Image
              size={48}
              source={{ uri: entry.picture }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={48}
              label={entry.name.substring(0, 2).toUpperCase()}
              style={styles.avatar}
            />
          )}

          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{entry.name}</Text>
              <RankBadge rank={rankInfo.name} size={18} />
            </View>
            {entry.username && (
              <Text style={styles.username}>@{entry.username}</Text>
            )}
            
            {/* Show additional stats for certain categories */}
            {category === 'points' && entry.current_streak !== undefined && (
              <View style={styles.statsRow}>
                <Ionicons name="flame-outline" size={12} color="#FF6B35" />
                <Text style={styles.statText}>{entry.current_streak} day streak</Text>
              </View>
            )}
            {category === 'streaks' && entry.current_streak !== undefined && (
              <View style={styles.statsRow}>
                <Text style={styles.statText}>Current: {entry.current_streak} days</Text>
              </View>
            )}
          </View>

          {/* Value */}
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>{entry.value.toLocaleString()}</Text>
            <Text style={styles.valueLabel}>{getCategoryLabel()}</Text>
          </View>
        </View>
      </Surface>
    );
  };

  const renderUserRankCard = () => {
    if (userRank === null) {
      return (
        <Surface style={styles.userRankCard} elevation={2}>
          <Text style={styles.noRankText}>
            {friendsOnly 
              ? "You don't have any friends on the leaderboard yet" 
              : "Start your journey to appear on the leaderboard!"}
          </Text>
        </Surface>
      );
    }

    return (
      <Surface style={styles.userRankCard} elevation={2}>
        <LinearGradient
          colors={['#4DB8D8', '#2E9AB5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userRankGradient}
        >
          <View style={styles.userRankContent}>
            <View style={styles.userRankLeft}>
              <Text style={styles.userRankLabel}>Your Rank</Text>
              <Text style={styles.userRankNumber}>#{userRank}</Text>
            </View>
            <View style={styles.userRankRight}>
              <Text style={styles.userRankTotal}>of {totalUsers.toLocaleString()}</Text>
              <Ionicons name="trophy" size={32} color="#FFD700" />
            </View>
          </View>
        </LinearGradient>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <UniversalHeader title="Leaderboard" onBack={handleBack} />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Time Period Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Time Period</Text>
          <SegmentedButtons
            value={timePeriod}
            onValueChange={(value) => setTimePeriod(value as any)}
            buttons={[
              {
                value: 'all_time',
                label: 'All Time',
                icon: 'calendar',
              },
              {
                value: 'monthly',
                label: 'Monthly',
                icon: 'calendar-month',
              },
              {
                value: 'weekly',
                label: 'Weekly',
                icon: 'calendar-week',
              },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Category Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.categoryChips}>
            <Chip
              selected={category === 'points'}
              onPress={() => setCategory('points')}
              icon="star"
              style={styles.chip}
            >
              Points
            </Chip>
            <Chip
              selected={category === 'visits'}
              onPress={() => setCategory('visits')}
              icon="location"
              style={styles.chip}
            >
              Visits
            </Chip>
            <Chip
              selected={category === 'countries'}
              onPress={() => setCategory('countries')}
              icon="earth"
              style={styles.chip}
            >
              Countries
            </Chip>
            <Chip
              selected={category === 'streaks'}
              onPress={() => setCategory('streaks')}
              icon="flame"
              style={styles.chip}
            >
              Streaks
            </Chip>
          </View>
        </View>

        {/* Friends Toggle - Enhanced UI */}
        <View style={styles.filterSection}>
          <View style={styles.leaderboardTypeContainer}>
            <TouchableOpacity
              style={[
                styles.leaderboardTypeButton,
                !friendsOnly && styles.leaderboardTypeButtonActive,
              ]}
              onPress={() => setFriendsOnly(false)}
              activeOpacity={0.8}
            >
              {!friendsOnly && (
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.leaderboardTypeGradient}
                >
                  <Ionicons name="earth" size={18} color="#fff" />
                  <Text style={styles.leaderboardTypeTextActive}>Global</Text>
                </LinearGradient>
              )}
              {friendsOnly && (
                <View style={styles.leaderboardTypeContent}>
                  <Ionicons name="earth" size={18} color={theme.colors.textSecondary} />
                  <Text style={styles.leaderboardTypeText}>Global</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.leaderboardTypeButton,
                friendsOnly && styles.leaderboardTypeButtonActive,
              ]}
              onPress={() => setFriendsOnly(true)}
              activeOpacity={0.8}
            >
              {friendsOnly && (
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.leaderboardTypeGradient}
                >
                  <Ionicons name="people" size={18} color="#fff" />
                  <Text style={styles.leaderboardTypeTextActive}>Friends</Text>
                </LinearGradient>
              )}
              {!friendsOnly && (
                <View style={styles.leaderboardTypeContent}>
                  <Ionicons name="people" size={18} color={theme.colors.textSecondary} />
                  <Text style={styles.leaderboardTypeText}>Friends</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* User Rank Card */}
        {renderUserRankCard()}

        {/* Leaderboard Entries */}
        <View style={styles.leaderboardSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name={getCategoryIcon()} size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Top Rankings</Text>
          </View>

          {leaderboard.length === 0 ? (
            <Surface style={styles.emptyCard} elevation={1}>
              <Ionicons name="trophy-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No rankings yet</Text>
              <Text style={styles.emptySubtext}>
                {friendsOnly
                  ? 'Add friends to see their rankings'
                  : 'Be the first to start your journey!'}
              </Text>
            </Surface>
          ) : (
            leaderboard.map((entry, index) => renderLeaderboardEntry(entry, index))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  segmentedButtons: {
    backgroundColor: '#fff',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  friendsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 1,
  },
  friendsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendsToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  userRankCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  userRankGradient: {
    padding: 20,
  },
  userRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userRankLeft: {
    flex: 1,
  },
  userRankLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userRankNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  userRankRight: {
    alignItems: 'center',
    gap: 4,
  },
  userRankTotal: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  noRankText: {
    padding: 20,
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  leaderboardSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  entryCard: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: {
    fontSize: 24,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  avatar: {
    marginLeft: 8,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  username: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  valueContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  valueText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  valueLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
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
