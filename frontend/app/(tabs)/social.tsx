import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform, 
  RefreshControl, 
  Image,
  Alert,
  StatusBar
} from 'react-native';
import { Text, Surface, Avatar, Badge } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import theme, { gradients } from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import RankBadge from '../../components/RankBadge';
import { lightHaptic, successHaptic } from '../../utils/haptics';
import ReportModal from '../../components/ReportModal';
import { getUserRank } from '../../utils/rankSystem';
import { BACKEND_URL } from '../../utils/config';
import { HeaderBranding } from '../../components/BrandedGlobeIcon';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface Friend {
  user_id: string;
  name: string;
  email: string;
  username?: string;
  picture?: string;
}

interface LeaderboardEntry {
  name: string;
  picture?: string;
  value: number;
  rank: number;
}

export default function SocialHubScreen() {
  const router = useRouter();
  const { scrollRef, scrollHandler } = useScrollRestore();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [communityFeed, setCommunityFeed] = useState<any[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Report modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: 'user' | 'activity';
    id: string;
    name: string;
  } | null>(null);

  const openReportModal = (type: 'user' | 'activity', id: string, name: string) => {
    setReportTarget({ type, id, name });
    setReportModalVisible(true);
  };

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    await Promise.all([
      loadCommunityFeed(),
      loadFriends(),
      loadLeaderboard(),
      loadPendingRequests(),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await lightHaptic();
    await loadAllData();
    await successHaptic();
    setRefreshing(false);
  };

  const loadCommunityFeed = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/community-feed?limit=8`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCommunityFeed(data.items || []);
      }
    } catch (error) {
      console.error('Error loading community feed:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/friends`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/friends/pending`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.length);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/leaderboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // API returns { leaderboard: [...], user_rank: ..., total_users: ... }
        const entries = data.leaderboard || data;
        setLeaderboard(entries.slice(0, 5)); // Show top 5
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const renderFriendItem = (friend: Friend, index: number) => (
    <TouchableOpacity 
      key={friend.user_id}
      style={styles.friendItem}
      onPress={() => router.push(`/messages/${friend.user_id}`)}
    >
      <Avatar.Image 
        size={36} 
        source={{ uri: friend.picture || 'https://via.placeholder.com/100' }} 
      />
      <Text style={styles.friendName} numberOfLines={1}>
        {friend.name.split(' ')[0]}
      </Text>
    </TouchableOpacity>
  );

  const renderLeaderboardItem = (entry: LeaderboardEntry, index: number) => {
    const userRank = getUserRank(entry.value || 0);
    
    return (
      <View key={index} style={styles.leaderboardItem}>
        <View style={styles.leaderboardLeft}>
          <View style={[
            styles.rankBadge,
            index === 0 && styles.rankBadgeGold,
            index === 1 && styles.rankBadgeSilver,
            index === 2 && styles.rankBadgeBronze,
          ]}>
            <Text style={styles.rankText}>{entry.rank}</Text>
          </View>
          <Avatar.Image 
            size={32} 
            source={{ uri: entry.picture || 'https://via.placeholder.com/100' }} 
          />
          <View style={styles.leaderboardNameContainer}>
            <Text style={styles.leaderboardName} numberOfLines={1}>{entry.name}</Text>
            <View style={styles.userRankBadgeSmall}>
              <RankBadge rank={userRank} size="small" showName={false} />
            </View>
          </View>
        </View>
        <View style={styles.leaderboardRight}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.leaderboardPoints}>{entry.value || 0}</Text>
        </View>
      </View>
    );
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
        {/* Single Row: Title Left, Branding Right */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t('social.title')}</Text>
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
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* Leaderboard Section - TOP */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="trophy" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Leaderboard</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/leaderboard')}>
              <Text style={styles.seeAllButton}>Full List →</Text>
            </TouchableOpacity>
          </View>

          <Surface style={styles.card}>
            {leaderboard.length > 0 ? (
              <>
                {leaderboard.map((entry, index) => renderLeaderboardItem(entry, index))}
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => router.push('/leaderboard')}
                >
                  <Text style={styles.viewAllText}>View Full Leaderboard</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={48} color={theme.colors.textLight} />
                <Text style={styles.emptyText}>No rankings yet</Text>
              </View>
            )}
          </Surface>
        </View>

        {/* Community Feed Section */}
        {communityFeed.length > 0 && (
          <View style={styles.section} data-testid="community-feed-section">
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="earth" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Activity Feed</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/feed')} style={styles.seeAllRow}>
                <Text style={styles.seeAllButton}>{t('common.seeAll')}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.cfVerticalList}>
              {communityFeed.slice(0, 5).map((item) => (
                <TouchableOpacity
                  key={item.visit_id}
                  style={styles.cfVerticalCard}
                  onPress={() => router.push(`/landmark-community-photos/${item.landmark_id}?name=${encodeURIComponent(item.landmark_name)}&country=${encodeURIComponent(item.country_name || '')}`)}
                  activeOpacity={0.85}
                  data-testid={`cf-card-${item.visit_id}`}
                >
                  {item.photo_url ? (
                    <Image source={{ uri: item.photo_url }} style={styles.cfVerticalImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.cfVerticalImage, { backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="image-outline" size={30} color={theme.colors.textLight} />
                    </View>
                  )}
                  <View style={styles.cfVerticalContent}>
                    <Text style={styles.cfVerticalLandmark} numberOfLines={1}>{item.landmark_name}</Text>
                    <Text style={styles.cfVerticalCountry} numberOfLines={1}>{item.country_name}</Text>
                    <View style={styles.cfVerticalBottom}>
                      <Text style={styles.cfVerticalUser} numberOfLines={1}>{item.user_name}</Text>
                      <View style={styles.cfMeta}>
                        {item.has_diary && (
                          <Ionicons name="book" size={11} color={theme.colors.textLight} style={{ marginRight: 4 }} />
                        )}
                        <Ionicons name="heart" size={11} color="#FF6B6B" />
                        <Text style={styles.cfUpvotes}>{item.upvotes}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}


        {/* Friends Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>{t('social.friends')}</Text>
              {pendingCount > 0 && (
                <Badge size={20} style={styles.pendingBadge}>{pendingCount}</Badge>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/friends')}>
              <Text style={styles.seeAllButton}>{t('common.manage')} →</Text>
            </TouchableOpacity>
          </View>

          <Surface style={styles.card}>
            <View style={styles.friendsStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{friends.length}</Text>
                <Text style={styles.statLabel}>{t('social.friends')}</Text>
              </View>
              {pendingCount > 0 && (
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, styles.pendingNumber]}>{pendingCount}</Text>
                  <Text style={styles.statLabel}>{t('social.pending')}</Text>
                </View>
              )}
            </View>

            {friends.length > 0 ? (
              <>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.friendsList}
                >
                  {friends.slice(0, 8).map((friend, index) => renderFriendItem(friend, index))}
                </ScrollView>
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => router.push('/friends')}
                >
                  <Text style={styles.viewAllText}>{t('social.viewAllFriends')}</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={theme.colors.textLight} />
                <Text style={styles.emptyText}>{t('social.noFriendsYet')}</Text>
                <TouchableOpacity 
                  style={styles.addFriendButton}
                  onPress={() => router.push('/friends')}
                >
                  <Text style={styles.addFriendButtonText}>{t('social.addFriends')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </Surface>
        </View>

        {/* Messages Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="chatbubbles" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>{t('social.messages')}</Text>
              {unreadMessages > 0 && (
                <Badge size={20} style={styles.unreadBadge}>{unreadMessages}</Badge>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/messages')}>
              <Text style={styles.seeAllButton}>View All →</Text>
            </TouchableOpacity>
          </View>

          <Surface style={styles.card}>
            <TouchableOpacity 
              style={styles.messagesButton}
              onPress={() => {
                if (user?.subscription_tier === 'free') {
                  Alert.alert(
                    '🔒 Pro Feature',
                    'Messaging is available for Pro members. Upgrade to Pro to chat with your travel buddies!',
                    [
                      { text: 'Maybe Later', style: 'cancel' },
                      { text: 'Upgrade to Pro', onPress: () => router.push('/subscription') }
                    ]
                  );
                } else {
                  router.push('/messages');
                }
              }}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.messagesGradient}
              >
                <Ionicons name={user?.subscription_tier === 'free' ? 'lock-closed' : 'chatbubble-ellipses'} size={24} color="#fff" />
                <Text style={styles.messagesButtonText}>
                  {user?.subscription_tier === 'free' ? 'Unlock Messages' : 'Open Messages'}
                </Text>
                {user?.subscription_tier !== 'free' && unreadMessages > 0 && (
                  <Badge size={20} style={styles.messageBadge}>{unreadMessages}</Badge>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={[styles.messagesHint, { color: user?.subscription_tier === 'free' ? theme.colors.textSecondary : theme.colors.textSecondary }]}>
              {user?.subscription_tier === 'free' 
                ? '🔒 Upgrade to Pro to message friends'
                : 'Stay in touch with your travel buddies'}
            </Text>
          </Surface>
        </View>

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => {
          setReportModalVisible(false);
          setReportTarget(null);
        }}
        reportType={reportTarget?.type || 'activity'}
        targetId={reportTarget?.id || ''}
        targetName={reportTarget?.name}
      />
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
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
  section: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  seeAllButton: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pendingBadge: {
    backgroundColor: theme.colors.accent,
  },
  unreadBadge: {
    backgroundColor: theme.colors.accent,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  // Friends Styles
  friendsStats: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  pendingNumber: {
    color: theme.colors.accent,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  friendsList: {
    marginBottom: theme.spacing.md,
  },
  friendItem: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
    width: 60,
  },
  friendName: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginTop: theme.spacing.xs / 2,
    textAlign: 'center',
  },
  // Messages Styles
  messagesButton: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  messagesGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  messagesButtonText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  messageBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  messagesHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  // Leaderboard Styles
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeGold: {
    backgroundColor: '#FFD700',
  },
  rankBadgeSilver: {
    backgroundColor: '#C0C0C0',
  },
  rankBadgeBronze: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    ...theme.typography.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  leaderboardName: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  leaderboardNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  userRankBadgeSmall: {
    transform: [{ scale: 0.6 }],
    marginLeft: -8,
  },
  leaderboardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderboardPoints: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  // Common Styles
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  viewAllText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptySubtext: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs / 2,
  },
  addFriendButton: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  addFriendButtonText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  // Community Feed styles
  cfScroll: {
    paddingRight: theme.spacing.lg,
    gap: 12,
  },
  cfCard: {
    width: 180,
    height: 230,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  cfImage: {
    width: '100%',
    height: '100%',
  },
  cfOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  cfLandmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  cfCountry: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 1,
  },
  cfBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  cfUser: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    flex: 1,
  },
  cfMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cfUpvotes: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  cfDiaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  cfDiarySnippet: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
    fontStyle: 'italic',
    lineHeight: 12,
  },
  // Vertical Community Feed Styles
  cfVerticalList: {
    gap: theme.spacing.sm,
  },
  cfVerticalCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  cfVerticalImage: {
    width: 100,
    height: 100,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.lg,
  },
  cfVerticalContent: {
    flex: 1,
    padding: theme.spacing.sm,
    justifyContent: 'center',
  },
  cfVerticalLandmark: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  cfVerticalCountry: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  cfVerticalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cfVerticalUser: {
    color: theme.colors.textLight,
    fontSize: 11,
    flex: 1,
  },
});
