import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform, StatusBar, RefreshControl } from 'react-native';
import { Avatar, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { PersistentTabBar } from '../components/PersistentTabBar';
import { HeaderBranding } from '../components/BrandedGlobeIcon';
import UniversalHeader from '../components/UniversalHeader';
import { getToken } from '../../utils/token';

interface Activity {
  activity_id: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  activity_type: 'visit' | 'milestone' | 'country_complete' | 'continent_complete' | 'country_visit' | 'trip_completed' | 'user_created_visit';
  landmark_name?: string;
  country_name?: string;
  continent_name?: string;
  points_earned: number;
  created_at: string;
  is_liked: boolean;
  like_count: number;
  likes_count?: number;
  visibility: 'public' | 'friends' | 'private';
  has_photos?: boolean;
  has_diary?: boolean;
  photo_count?: number;
  photo_url?: string;
  visit_id?: string;
}


const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const getPrivacyIcon = (visibility: string) => {
  switch (visibility) {
    case 'public': return { icon: 'globe-outline', color: '#4CAF50' };
    case 'friends': return { icon: 'people-outline', color: '#2196F3' };
    case 'private': return { icon: 'lock-closed-outline', color: '#FF9800' };
    default: return { icon: 'globe-outline', color: '#4CAF50' };
  }
};

interface CommunityFeedItem {
  visit_id: string;
  type: string;
  source: string;
  photo_url?: string;
  user_name: string;
  user_picture?: string;
  username?: string;
  landmark_name: string;
  landmark_id?: string;
  country_name?: string;
  diary_snippet?: string;
  has_diary: boolean;
  upvotes: number;
  visited_at?: string;
}

export default function FeedScreen() {
  const [activeTab, setActiveTab] = useState<'friends' | 'community'>('community');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [communityItems, setCommunityItems] = useState<CommunityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const loadFeed = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/feed?limit=20&page=${pageNum}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setActivities(prev => [...prev, ...data]);
        } else {
          setActivities(data);
        }
        setHasMore(data.length === 20);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'friends') loadFeed();
    else loadCommunity();
  }, [loadFeed, activeTab]);

  const loadCommunity = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/community-feed?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCommunityItems(data.items || []);
      }
    } catch (e) { console.error('Error loading community:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    if (activeTab === 'friends') loadFeed(1, false);
    else loadCommunity();
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadFeed(nextPage, true);
    }
  };

  const handleLike = async (activityId: string) => {
    try {
      const token = await getToken();
      const activity = activities.find(a => a.activity_id === activityId);
      const method = activity?.is_liked ? 'DELETE' : 'POST';

      const response = await fetch(`${BACKEND_URL}/api/activities/${activityId}/like`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setActivities(prev => prev.map(a => 
          a.activity_id === activityId 
            ? { ...a, is_liked: !a.is_liked, like_count: a.is_liked ? a.like_count - 1 : a.like_count + 1 }
            : a
        ));
      }
    } catch (error) {
      console.error('Error liking activity:', error);
    }
  };

  const handleBack = () => {
    router.push('/(tabs)/social');
  };

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 24);

  const renderActivityItem = ({ item: activity }: { item: Activity }) => {
    const privacyInfo = getPrivacyIcon(activity.visibility);
    const hasRichContent = activity.has_photos || activity.has_diary;

    return (
      <Surface style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <Avatar.Image 
            size={44} 
            source={{ uri: activity.user_picture || 'https://via.placeholder.com/100' }} 
          />
          <View style={styles.activityInfo}>
            <View style={styles.activityNameRow}>
              <Text style={styles.activityUser}>{activity.user_name}</Text>
              <Ionicons 
                name={privacyInfo.icon as any} 
                size={12} 
                color={privacyInfo.color} 
                style={styles.privacyIcon}
              />
            </View>
            <Text style={styles.activityTime}>{formatTimeAgo(activity.created_at)}</Text>
          </View>
        </View>

        {/* Photo Preview */}
        {activity.photo_url && (
          <TouchableOpacity 
            onPress={() => activity.visit_id ? router.push(`/visit-detail/${activity.visit_id}`) : null}
            activeOpacity={0.9}
            data-testid={`feed-photo-${activity.activity_id}`}
          >
            <Image 
              source={{ uri: activity.photo_url }} 
              style={styles.activityPhoto} 
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {/* Activity Content */}
        <View style={styles.activityContent}>
          {activity.activity_type === 'visit' && (
            <>
              <Text style={styles.activityText}>
                Visited <Text style={styles.activityHighlight}>{activity.landmark_name}</Text>
                {activity.country_name && ` in ${activity.country_name}`}
              </Text>
              <View style={styles.activityPoints}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.pointsText}>+{activity.points_earned} pts</Text>
              </View>
            </>
          )}

          {activity.activity_type === 'user_created_visit' && (
            <>
              <Text style={styles.activityText}>
                Explored <Text style={styles.activityHighlight}>{activity.country_name || 'a new destination'}</Text>
              </Text>
              {activity.points_earned > 0 && (
                <View style={styles.activityPoints}>
                  <Ionicons name="compass" size={14} color={theme.colors.accent} />
                  <Text style={styles.pointsText}>+{activity.points_earned} pts</Text>
                </View>
              )}
            </>
          )}

          {activity.activity_type === 'country_visit' && (
            <>
              <Text style={styles.activityText}>
                Explored <Text style={styles.activityHighlight}>{activity.country_name}</Text>
              </Text>
              <View style={styles.activityPoints}>
                <Ionicons name="flag" size={14} color={theme.colors.primary} />
                <Text style={styles.pointsText}>+{activity.points_earned} pts</Text>
              </View>
            </>
          )}

          {activity.activity_type === 'milestone' && (
            <Text style={styles.activityText}>
              🏆 Reached a new milestone!
            </Text>
          )}

          {activity.activity_type === 'country_complete' && (
            <Text style={styles.activityText}>
              🎉 Completed all landmarks in <Text style={styles.activityHighlight}>{activity.country_name}</Text>!
            </Text>
          )}

          {activity.activity_type === 'continent_complete' && (
            <Text style={styles.activityText}>
              🌍 Conquered <Text style={styles.activityHighlight}>{activity.continent_name}</Text>!
            </Text>
          )}

          {/* Rich Content Indicators */}
          {hasRichContent && (
            <View style={styles.richContentBadges}>
              {activity.has_photos && activity.photo_count && activity.photo_count > 0 && (
                <View style={styles.richBadge}>
                  <Ionicons name="images" size={12} color={theme.colors.primary} />
                  <Text style={styles.richBadgeText}>{activity.photo_count} photos</Text>
                </View>
              )}
              {activity.has_diary && (
                <View style={styles.richBadge}>
                  <Ionicons name="journal" size={12} color={theme.colors.primary} />
                  <Text style={styles.richBadgeText}>Diary</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Like Section */}
        <View style={styles.activityActions}>
          <TouchableOpacity 
            style={styles.likeButton} 
            onPress={() => handleLike(activity.activity_id)}
          >
            <Ionicons 
              name={activity.is_liked ? "heart" : "heart-outline"} 
              size={20} 
              color={activity.is_liked ? "#FF4B6E" : theme.colors.textSecondary} 
            />
            {(activity.likes_count || activity.like_count || 0) > 0 && (
              <Text style={[
                styles.likeCount,
                activity.is_liked && styles.likeCountActive
              ]}>
                {activity.likes_count || activity.like_count || 0}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Surface>
    );
  };

  const renderCommunityItem = ({ item }: { item: CommunityFeedItem }) => (
    <Surface style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <Avatar.Image size={44} source={{ uri: item.user_picture || 'https://via.placeholder.com/100' }} />
        <View style={styles.activityInfo}>
          <Text style={styles.activityUser}>{item.user_name}</Text>
          <Text style={styles.activityTime}>{item.visited_at ? formatTimeAgo(item.visited_at) : ''}</Text>
        </View>
      </View>
      {item.photo_url && (
        <TouchableOpacity onPress={() => item.landmark_id ? router.push(`/landmark-community-photos/${item.landmark_id}?name=${encodeURIComponent(item.landmark_name)}`) : null} activeOpacity={0.9}>
          <Image source={{ uri: item.photo_url }} style={styles.activityPhoto} resizeMode="cover" />
        </TouchableOpacity>
      )}
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>
          Visited <Text style={styles.activityHighlight}>{item.landmark_name}</Text>
          {item.country_name && ` in ${item.country_name}`}
        </Text>
        {item.diary_snippet && (
          <Text style={styles.diarySnippet} numberOfLines={2}>{item.diary_snippet}</Text>
        )}
      </View>
      <View style={styles.activityActions}>
        <TouchableOpacity 
          style={styles.likeButton}
          onPress={() => {
            if (item.landmark_id) {
              router.push(`/landmark-community-photos/${item.landmark_id}?name=${encodeURIComponent(item.landmark_name)}`);
            }
          }}
        >
          <Ionicons name="heart" size={18} color={item.upvotes > 0 ? "#FF6B6B" : theme.colors.textSecondary} />
          <Text style={[styles.likeCount, item.upvotes > 0 && { color: '#FF6B6B' }]}>{item.upvotes}</Text>
        </TouchableOpacity>
        {item.has_diary && (
          <View style={styles.richBadge}>
            <Ionicons name="journal" size={12} color={theme.colors.primary} />
            <Text style={styles.richBadgeText}>Diary</Text>
          </View>
        )}
      </View>
    </Surface>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="newspaper-outline" size={64} color={theme.colors.textLight} />
      <Text style={styles.emptyTitle}>{activeTab === 'friends' ? 'No Friend Activity Yet' : 'No Community Posts Yet'}</Text>
      <Text style={styles.emptyText}>
        {activeTab === 'friends'
          ? 'When your friends visit landmarks, their activity will appear here'
          : 'Visit landmarks and share photos to appear in the community feed'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <UniversalHeader title="Feed" />
      
      {/* Tabs — below header */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'community' && styles.tabActive]}
          onPress={() => setActiveTab('community')}
          data-testid="tab-community"
        >
          <Ionicons name="earth-outline" size={16} color={activeTab === 'community' ? '#fff' : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'community' && styles.tabTextActive]}>Community</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
          data-testid="tab-friends"
        >
          <Ionicons name="people-outline" size={16} color={activeTab === 'friends' ? '#fff' : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>Friends</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'friends' ? (
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.activity_id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={!loading ? renderEmpty : null}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={communityItems}
          renderItem={renderCommunityItem}
          keyExtractor={(item) => item.visit_id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={!loading ? renderEmpty : null}
          showsVerticalScrollIndicator={false}
        />
      )}

      <PersistentTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  activityInfo: {
    marginLeft: 12,
    flex: 1,
  },
  activityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityUser: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  privacyIcon: {
    marginLeft: 6,
  },
  activityTime: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  activityContent: {
    marginBottom: 12,
  },
  activityText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  activityHighlight: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  activityPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  richContentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  richBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${theme.colors.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  richBadgeText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  activityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  likeCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  likeCountActive: {
    color: '#FF4B6E',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: theme.colors.background,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  diarySnippet: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 18,
  },
});
