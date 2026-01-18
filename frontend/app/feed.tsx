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
  has_tips?: boolean;
  photo_count?: number;
  visit_id?: string;
}

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

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

export default function FeedScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
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
    loadFeed();
  }, [loadFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadFeed(1, false);
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
    const hasRichContent = activity.has_photos || activity.has_diary || activity.has_tips;

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
              {activity.has_tips && (
                <View style={styles.richBadge}>
                  <Ionicons name="bulb" size={12} color={theme.colors.primary} />
                  <Text style={styles.richBadgeText}>Tips</Text>
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

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="newspaper-outline" size={64} color={theme.colors.textLight} />
      <Text style={styles.emptyTitle}>No Activity Yet</Text>
      <Text style={styles.emptyText}>
        When you or your friends visit landmarks, the activity will appear here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding + 10 }]}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Feed</Text>
        <View style={styles.headerRight}>
          <Ionicons name="newspaper-outline" size={20} color="#fff" />
        </View>
      </LinearGradient>

      <FlatList
        data={activities}
        renderItem={renderActivityItem}
        keyExtractor={(item) => item.activity_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!loading ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
      />

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    width: 40,
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
});
