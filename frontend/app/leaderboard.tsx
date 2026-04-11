import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text, Surface, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';
import RankBadge from '../components/RankBadge';
import { getUserRank } from '../utils/rankSystem';
import UniversalHeader from '../components/UniversalHeader';
import ShareRankCard from '../components/ShareRankCard';
import { BACKEND_URL } from '../utils/config';

import { HeaderBranding } from '../components/BrandedGlobeIcon';
import { getToken } from '../../utils/token';

interface LeaderboardEntry {
  user_id: string;
  name: string;
  picture?: string;
  username?: string;
  value: number;
  verified_points?: number;
  total_points?: number;
  rank: number;
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
  const [timePeriod] = useState<'all_time'>('all_time');
  const [category, setCategory] = useState<'points' | 'visits' | 'countries'>('points');
  const [friendsOnly, setFriendsOnly] = useState(false);
  
  // Data states
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPointsInfo, setShowPointsInfo] = useState(false);
  const [showShareRank, setShowShareRank] = useState(false);
  const [userValue, setUserValue] = useState(0);
  const [userName, setUserName] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  // Navigate back to social tab explicitly
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/social');
    }
  };

  useEffect(() => {
    setExpanded(false);
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
        
        // Find the current user's entry for share card
        const token2 = await getToken();
        try {
          const meRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token2}` },
          });
          if (meRes.ok) {
            const me = await meRes.json();
            setUserName(me.name || me.username || 'Traveler');
            setCurrentUserId(me.user_id || '');
          }
        } catch {}
        
        // Get user value from their rank position in the leaderboard or stats
        try {
          const statsRes = await fetch(`${BACKEND_URL}/api/stats`, {
            headers: { 'Authorization': `Bearer ${token2}` },
          });
          if (statsRes.ok) {
            const stats = await statsRes.json();
            if (category === 'points') setUserValue(stats.leaderboard_points || stats.points || 0);
            else if (category === 'visits') setUserValue(stats.total_visits || 0);
            else setUserValue(stats.countries_visited || 0);
          }
        } catch {}
      }
    } catch (error) {
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
      case 'points': return friendsOnly ? 'Points' : 'Verified';
      case 'visits': return 'Landmarks';
      case 'countries': return 'Destinations';
    }
  };

  const getCategoryColor = () => {
    switch (category) {
      case 'points': return '#FFD700';
      case 'visits': return '#E87850';
      case 'countries': return '#4DB8D8';
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'points': return 'star';
      case 'visits': return 'location';
      case 'countries': return 'flag';
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
    const rankInfo = getUserRank(Math.max(entry.verified_points || 0, 0));
    const showDualPoints = category === 'points' && !friendsOnly && entry.total_points !== undefined;
    const isMe = entry.user_id === currentUserId;

    return (
      <Surface key={entry.user_id} style={[styles.entryCard, isMe && styles.entryCardHighlight]} elevation={1}>
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
              <RankBadge rank={rankInfo} size="small" />
            </View>
            {entry.username && (
              <Text style={styles.username}>@{entry.username}</Text>
            )}
            
          </View>

          {/* Value */}
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>{entry.value.toLocaleString()}</Text>
            <Text style={styles.valueLabel}>{getCategoryLabel()}</Text>
            {showDualPoints && entry.total_points !== entry.value && (
              <Text style={styles.totalPointsLabel}>{entry.total_points?.toLocaleString()} total</Text>
            )}
          </View>
        </View>
      </Surface>
    );
  };

  const renderCompactEntry = (entry: LeaderboardEntry) => {
    const isMe = entry.user_id === currentUserId;
    return (
      <View key={entry.user_id} style={[styles.compactEntry, isMe && styles.compactEntryHighlight]}>
        <Text style={[styles.compactRank, isMe && styles.compactTextBold]}>#{entry.rank}</Text>
        {entry.picture ? (
          <Avatar.Image size={28} source={{ uri: entry.picture }} style={styles.compactAvatar} />
        ) : (
          <Avatar.Text size={28} label={entry.name.substring(0, 2).toUpperCase()} style={styles.compactAvatar} />
        )}
        <Text style={[styles.compactName, isMe && styles.compactTextBold]} numberOfLines={1}>{entry.name}</Text>
        <Text style={[styles.compactValue, isMe && styles.compactTextBold]}>{entry.value.toLocaleString()}</Text>
      </View>
    );
  };

  const renderYourPositionCard = () => {
    if (!userRank || userRank <= 10) return null;
    const userEntry = leaderboard.find(e => e.user_id === currentUserId);
    const top10Value = leaderboard.length >= 10 ? leaderboard[9].value : 0;
    const gap = top10Value - (userEntry?.value || userValue);

    return (
      <Surface style={styles.yourPositionCard} elevation={1}>
        <View style={styles.yourPositionContent}>
          <View style={styles.yourPositionLeft}>
            <Text style={styles.yourPositionLabel}>Your position</Text>
            <Text style={styles.yourPositionRank}>#{userRank}</Text>
          </View>
          <View style={styles.yourPositionRight}>
            <Text style={styles.yourPositionValue}>{userEntry?.value?.toLocaleString() || userValue.toLocaleString()} {getCategoryLabel()}</Text>
            {gap > 0 && (
              <Text style={styles.yourPositionGap}>{gap.toLocaleString()} behind #10</Text>
            )}
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
            <Ionicons name="trophy" size={22} color="#FFD700" />
            <Text style={styles.userRankNumber}>#{userRank}</Text>
            <Text style={styles.userRankLabel}>of {totalUsers.toLocaleString()} travelers</Text>
          </View>
        </LinearGradient>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <UniversalHeader title="Leaderboard" onBack={handleBack} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Category Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.categoryChips}>
            {[
              { value: 'points', label: 'Points', icon: 'star', color: '#FFD700' },
              { value: 'visits', label: 'Landmarks', icon: 'location', color: '#E87850' },
              { value: 'countries', label: 'Destinations', icon: 'flag', color: '#4DB8D8' },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.categoryChip,
                  category === item.value && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(item.value as any)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={item.icon as any} 
                  size={14} 
                  color={category === item.value ? '#fff' : item.color} 
                />
                <Text style={[
                  styles.categoryChipText,
                  category === item.value && styles.categoryChipTextActive,
                ]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
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
                  colors={[theme.colors.accent, '#B8860B']}
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

        {/* Share Ranking */}
        {userRank !== null && (
          <TouchableOpacity
            style={styles.shareRankButton}
            onPress={() => setShowShareRank(true)}
            activeOpacity={0.7}
            data-testid="share-ranking-button"
          >
            <Ionicons name="share-social-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.shareRankText}>Share my ranking</Text>
          </TouchableOpacity>
        )}

        {/* Leaderboard Entries */}
        <View style={styles.leaderboardSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name={getCategoryIcon()} size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Top rankings</Text>
          </View>

          {/* Info banner for global points leaderboard */}
          {category === 'points' && !friendsOnly && (
            <TouchableOpacity 
              style={styles.infoBanner}
              onPress={() => setShowPointsInfo(!showPointsInfo)}
              activeOpacity={0.7}
            >
              <View style={styles.infoBannerRow}>
                <Ionicons name="shield-checkmark" size={16} color="#2E9AB5" />
                <Text style={styles.infoBannerText}>
                  Global rankings use verified points. Only personal photos where you are clearly visible at the landmark count as verified. Photos from the internet or without yourself in them may lead to removal of verified points.
                </Text>
                <Ionicons 
                  name={showPointsInfo ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#999" 
                />
              </View>
              {showPointsInfo && (
                <Text style={styles.infoBannerDetail}>
                  Take a personal photo of yourself at each landmark to earn verified points and climb the global leaderboard. Only photos where you are visible count as verified.
                  Switch to Friends to see total points.
                </Text>
              )}
            </TouchableOpacity>
          )}

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
          ) : expanded ? (
            <>
              {leaderboard.map((entry) => renderCompactEntry(entry))}
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setExpanded(false)}
                activeOpacity={0.7}
                data-testid="show-less-btn"
              >
                <Ionicons name="chevron-up" size={16} color={theme.colors.primary} />
                <Text style={styles.expandButtonText}>Show Less</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {leaderboard.slice(0, 10).map((entry, index) => renderLeaderboardEntry(entry, index))}
              {renderYourPositionCard()}
              {leaderboard.length > 10 && (
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => setExpanded(true)}
                  activeOpacity={0.7}
                  data-testid="show-full-rankings-btn"
                >
                  <Ionicons name="list-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.expandButtonText}>Show Full Rankings ({leaderboard.length})</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
      )}

      {/* Share Rank Card Modal */}
      <ShareRankCard
        visible={showShareRank}
        onDismiss={() => setShowShareRank(false)}
        rank={userRank || 0}
        totalUsers={totalUsers}
        category={category}
        value={userValue}
        userName={userName}
      />
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
  shareRankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  shareRankText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  segmentedButtons: {
    backgroundColor: '#fff',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
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
  // New enhanced leaderboard type toggle
  leaderboardTypeContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  leaderboardTypeButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  leaderboardTypeButtonActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  leaderboardTypeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  leaderboardTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  leaderboardTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  leaderboardTypeTextActive: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  userRankCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  userRankGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userRankLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  userRankNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
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
  infoBanner: {
    backgroundColor: '#E8F6F9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#B8E4ED',
  },
  infoBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D8C',
    fontWeight: '500',
  },
  infoBannerDetail: {
    fontSize: 12,
    color: '#5A9DAA',
    marginTop: 8,
    lineHeight: 18,
  },
  totalPointsLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 1,
  },
  entryCardHighlight: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  // Compact entries (expanded mode)
  compactEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  compactEntryHighlight: {
    backgroundColor: '#E3F6FC',
  },
  compactRank: {
    width: 36,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  compactAvatar: {
    marginRight: 8,
  },
  compactName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  compactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 8,
  },
  compactTextBold: {
    fontWeight: '800',
    color: theme.colors.text,
  },
  // Expand button
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  // Your Position card
  yourPositionCard: {
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  yourPositionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  yourPositionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  yourPositionLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  yourPositionRank: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  yourPositionRight: {
    alignItems: 'flex-end',
  },
  yourPositionValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  yourPositionGap: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
