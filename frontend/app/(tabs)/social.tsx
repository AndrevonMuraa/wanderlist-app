import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform, 
  RefreshControl, 
  Image,
  Alert 
} from 'react-native';
import { Text, Surface, Avatar, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import RankBadge from '../../components/RankBadge';
import CommentsSection from '../../components/CommentsSection';
import { getUserRank } from '../../utils/rankSystem';
import { BACKEND_URL } from '../../utils/config';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface Activity {
  activity_id: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  activity_type: 'visit' | 'milestone' | 'country_complete' | 'continent_complete' | 'country_visit' | 'trip_completed';
  landmark_name?: string;
  country_name?: string;
  country_id?: string;
  continent?: string;
  countries_count?: number;
  landmarks_count?: number;
  points_earned?: number;
  milestone_count?: number;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
  comments_count: number;
  visit_id?: string;
  has_diary?: boolean;
  has_tips?: boolean;
  has_photos?: boolean;
  photo_count?: number;
}

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
  total_points: number;
  rank: number;
}

export default function SocialHubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [activities, setActivities] = useState<Activity[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const [visitDetails, setVisitDetails] = useState<{[key: string]: any}>({});

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadFeed(),
      loadFriends(),
      loadLeaderboard(),
      loadPendingRequests(),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const loadFeed = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/feed?limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setActivities(data.slice(0, 3)); // Show only top 3
      }
    } catch (error) {
      console.error('Error loading feed:', error);
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
        setLeaderboard(data.slice(0, 5)); // Show top 5
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
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
            ? { 
                ...a, 
                is_liked: !a.is_liked,
                likes_count: a.is_liked ? a.likes_count - 1 : a.likes_count + 1 
              }
            : a
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const loadVisitDetails = async (visitId: string) => {
    if (visitDetails[visitId]) return; // Already loaded
    
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/visits/${visitId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setVisitDetails(prev => ({ ...prev, [visitId]: data }));
      }
    } catch (error) {
      console.error('Error loading visit details:', error);
    }
  };

  const toggleVisitExpansion = async (visitId: string) => {
    if (expandedVisits.has(visitId)) {
      setExpandedVisits(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitId);
        return newSet;
      });
    } else {
      await loadVisitDetails(visitId);
      setExpandedVisits(prev => new Set(prev).add(visitId));
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const renderActivityItem = (activity: Activity) => {
    const isExpanded = activity.visit_id && expandedVisits.has(activity.visit_id);
    const visit = activity.visit_id ? visitDetails[activity.visit_id] : null;
    const hasRichContent = activity.has_photos || activity.has_diary || activity.has_tips;

    return (
      <TouchableOpacity 
        key={activity.activity_id}
        style={styles.activityItem}
        activeOpacity={0.7}
        onPress={() => activity.visit_id && hasRichContent && toggleVisitExpansion(activity.visit_id)}
      >
        <View style={styles.activityHeader}>
          <Avatar.Image 
            size={40} 
            source={{ uri: activity.user_picture || 'https://via.placeholder.com/100' }} 
          />
          <View style={styles.activityInfo}>
            <Text style={styles.activityUser}>{activity.user_name}</Text>
            <Text style={styles.activityTime}>{formatTimeAgo(activity.created_at)}</Text>
          </View>
        </View>

        {activity.activity_type === 'visit' && (
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              Visited <Text style={styles.activityHighlight}>{activity.landmark_name}</Text>
              {activity.country_name && ` in ${activity.country_name}`}
            </Text>
            <View style={styles.activityPoints}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.pointsText}>+{activity.points_earned} pts</Text>
            </View>

            {/* Rich Content Indicators */}
            {hasRichContent && (
              <View style={styles.richContentBadges}>
                {activity.has_photos && activity.photo_count && activity.photo_count > 0 && (
                  <View style={styles.richBadge}>
                    <Ionicons name="images" size={12} color={theme.colors.primary} />
                    <Text style={styles.richBadgeText}>{activity.photo_count} {activity.photo_count === 1 ? 'photo' : 'photos'}</Text>
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

            {/* Expanded Rich Content */}
            {isExpanded && visit && (
              <View style={styles.richContentExpanded}>
                {/* Photos */}
                {visit.photos && visit.photos.length > 0 && (
                  <View style={styles.richSection}>
                    <View style={styles.photoPreviewGrid}>
                      {visit.photos.slice(0, 3).map((photo: string, index: number) => (
                        <Image 
                          key={index}
                          source={{ uri: photo }} 
                          style={styles.photoPreview} 
                        />
                      ))}
                    </View>
                    {visit.photos.length > 3 && (
                      <Text style={styles.morePhotosText}>+{visit.photos.length - 3} more photos</Text>
                    )}
                  </View>
                )}

                {/* Diary */}
                {visit.diary_notes && (
                  <View style={styles.richSection}>
                    <View style={styles.richSectionHeader}>
                      <Ionicons name="journal" size={16} color={theme.colors.primary} />
                      <Text style={styles.richSectionTitle}>Travel Diary</Text>
                    </View>
                    <Text style={styles.diaryText}>
                      {visit.diary_notes.length > 150 
                        ? visit.diary_notes.substring(0, 150) + '...' 
                        : visit.diary_notes}
                    </Text>
                  </View>
                )}

                {/* Travel Tips */}
                {visit.travel_tips && visit.travel_tips.length > 0 && (
                  <View style={styles.richSection}>
                    <View style={styles.richSectionHeader}>
                      <Ionicons name="bulb" size={16} color={theme.colors.primary} />
                      <Text style={styles.richSectionTitle}>Travel Tips</Text>
                    </View>
                    {visit.travel_tips.slice(0, 2).map((tip: string, index: number) => (
                      <View key={index} style={styles.tipItem}>
                        <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}
                    {visit.travel_tips.length > 2 && (
                      <Text style={styles.moreTipsText}>+{visit.travel_tips.length - 2} more tips</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* View Full Visit Button */}
            {hasRichContent && !isExpanded && (
              <TouchableOpacity 
                style={styles.viewFullButton}
                onPress={() => activity.visit_id && router.push(`/visit-detail/${activity.visit_id}`)}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.viewFullGradient}
                >
                  <Text style={styles.viewFullText}>View Full Details</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Collapse Button */}
            {isExpanded && (
              <TouchableOpacity 
                style={styles.collapseButton}
                onPress={() => activity.visit_id && toggleVisitExpansion(activity.visit_id)}
              >
                <Text style={styles.collapseText}>Show Less</Text>
                <Ionicons name="chevron-up" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {activity.activity_type === 'milestone' && (
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              🎉 Reached <Text style={styles.activityHighlight}>{activity.milestone_count} visits</Text> milestone!
            </Text>
          </View>
        )}

        {activity.activity_type === 'country_complete' && (
          <View style={styles.activityContent}>
            <LinearGradient
              colors={['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.05)']}
              style={styles.completionBanner}
            >
              <View style={styles.completionHeader}>
                <Ionicons name="flag" size={24} color="#4CAF50" />
                <Text style={styles.completionTitle}>Country Completed! 🎊</Text>
              </View>
              <Text style={styles.completionText}>
                Conquered all <Text style={styles.completionHighlight}>{activity.landmarks_count} landmarks</Text> in{' '}
                <Text style={styles.completionHighlight}>{activity.country_name}</Text>!
              </Text>
              <View style={styles.completionPoints}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.completionPointsText}>+{activity.points_earned} bonus points</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {activity.activity_type === 'continent_complete' && (
          <View style={styles.activityContent}>
            <LinearGradient
              colors={['rgba(156, 39, 176, 0.15)', 'rgba(156, 39, 176, 0.05)']}
              style={styles.completionBanner}
            >
              <View style={styles.completionHeader}>
                <Ionicons name="earth" size={28} color="#9C27B0" />
                <Text style={[styles.completionTitle, { color: '#9C27B0' }]}>Continent Mastered! 🌍</Text>
              </View>
              <Text style={styles.completionText}>
                Amazing! Completed all <Text style={styles.completionHighlight}>{activity.countries_count} countries</Text> in{' '}
                <Text style={[styles.completionHighlight, { color: '#9C27B0' }]}>
                  {activity.continent?.charAt(0).toUpperCase() + activity.continent?.slice(1)}
                </Text>!
              </Text>
              <View style={styles.completionPoints}>
                <Ionicons name="trophy" size={16} color="#9C27B0" />
                <Text style={[styles.completionPointsText, { color: '#9C27B0' }]}>+{activity.points_earned} bonus points</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {activity.activity_type === 'country_visit' && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => activity.country_visit_id && router.push(`/country-visit-detail/${activity.country_visit_id}`)}
          >
            <View style={styles.countryVisitContent}>
              <View style={styles.countryVisitHeader}>
                <Ionicons name="earth" size={20} color={theme.colors.primary} />
                <Text style={styles.countryVisitText}>
                  Visited <Text style={styles.activityHighlight}>{activity.country_name}</Text>
                </Text>
              </View>
              
              {/* Photo Preview Grid */}
              {activity.photos && activity.photos.length > 0 && (
                <View style={styles.photoCollagePreview}>
                  {activity.photos.slice(0, 4).map((photo, index) => (
                    <Image
                      key={index}
                      source={{ uri: photo }}
                      style={[
                        styles.photoCollageItem,
                        activity.photos.length === 1 && styles.photoCollageSingle,
                        activity.photos.length === 2 && styles.photoCollageHalf,
                      ]}
                      resizeMode="cover"
                    />
                  ))}
                  {activity.photos.length > 4 && (
                    <View style={styles.photoCollageOverlay}>
                      <Text style={styles.photoCollageOverlayText}>+{activity.photos.length - 4}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Diary Preview */}
              {activity.diary && (
                <Text style={styles.diaryPreview} numberOfLines={3}>
                  {activity.diary}
                </Text>
              )}

              <View style={styles.countryVisitFooter}>
                <View style={styles.activityPoints}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.pointsText}>+{activity.points_earned} pts</Text>
                </View>
                <View style={styles.viewDetailsBadge}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="arrow-forward" size={12} color={theme.colors.primary} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.activityActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(activity.activity_id)}
          >
            <Ionicons 
              name={activity.is_liked ? "heart" : "heart-outline"} 
              size={20} 
              color={activity.is_liked ? "#FF6B6B" : theme.colors.textLight} 
            />
            <Text style={styles.actionText}>{activity.likes_count}</Text>
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        <CommentsSection
          activityId={activity.activity_id}
          commentsCount={activity.comments_count}
          currentUserId={user?.user_id || ''}
          onCommentsChange={(newCount) => {
            setActivities(prev =>
              prev.map(a =>
                a.activity_id === activity.activity_id
                  ? { ...a, comments_count: newCount }
                  : a
              )
            );
          }}
        />
      </TouchableOpacity>
    );
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
    const userRank = getUserRank(entry.total_points);
    
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
          <Text style={styles.leaderboardPoints}>{entry.total_points}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Universal Header with Branding */}
        <LinearGradient
          colors={['#3BB8C3', '#2AA8B3']}
          style={styles.headerGradient}
        >
          {/* Top Row: Branding + Profile */}
          <View style={styles.brandingRow}>
            <TouchableOpacity 
              style={styles.brandingContainer}
              onPress={() => router.push('/about')}
              activeOpacity={0.7}
            >
              <Ionicons name="earth" size={18} color="#fff" />
              <Text style={styles.brandingText}>WanderList</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.profileButtonHeader}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <View style={styles.profileCircleHeader}>
                <Text style={styles.profileInitialHeader}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <Text style={styles.headerTitle}>Social Hub</Text>
          <Text style={styles.headerSubtitle}>Connect with your travel community</Text>
        </LinearGradient>

        {/* Activity Feed Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="newspaper" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Activity Feed</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/feed')}>
              <Text style={styles.seeAllButton}>See All →</Text>
            </TouchableOpacity>
          </View>

          <Surface style={styles.card}>
            {activities.length > 0 ? (
              <>
                {activities.map(activity => renderActivityItem(activity))}
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => router.push('/feed')}
                >
                  <Text style={styles.viewAllText}>View All Activity</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={48} color={theme.colors.textLight} />
                <Text style={styles.emptyText}>No recent activity</Text>
                <Text style={styles.emptySubtext}>Start exploring landmarks!</Text>
              </View>
            )}
          </Surface>
        </View>

        {/* Friends Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Friends</Text>
              {pendingCount > 0 && (
                <Badge size={20} style={styles.pendingBadge}>{pendingCount}</Badge>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/friends')}>
              <Text style={styles.seeAllButton}>Manage →</Text>
            </TouchableOpacity>
          </View>

          <Surface style={styles.card}>
            <View style={styles.friendsStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{friends.length}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
              {pendingCount > 0 && (
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, styles.pendingNumber]}>{pendingCount}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
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
                  <Text style={styles.viewAllText}>View All Friends</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={theme.colors.textLight} />
                <Text style={styles.emptyText}>No friends yet</Text>
                <TouchableOpacity 
                  style={styles.addFriendButton}
                  onPress={() => router.push('/friends')}
                >
                  <Text style={styles.addFriendButtonText}>Add Friends</Text>
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
              <Text style={styles.sectionTitle}>Messages</Text>
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
              onPress={() => router.push('/messages')}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.messagesGradient}
              >
                <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
                <Text style={styles.messagesButtonText}>Open Messages</Text>
                {unreadMessages > 0 && (
                  <Badge size={20} style={styles.messageBadge}>{unreadMessages}</Badge>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.messagesHint}>
              {user?.subscription_tier === 'free' 
                ? '🔒 Upgrade to Basic to message friends'
                : 'Stay in touch with your travel buddies'}
            </Text>
          </Surface>
        </View>

        {/* Leaderboard Section */}
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

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
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
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerGradient: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
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
  // Activity Feed Styles
  activityItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  activityInfo: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  activityUser: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  activityTime: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
  },
  activityContent: {
    marginBottom: theme.spacing.sm,
  },
  activityText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  activityHighlight: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  activityPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.xs,
  },
  pointsText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  activityActions: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  // Rich Content Styles
  richContentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  richBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(32, 178, 170, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(32, 178, 170, 0.2)',
  },
  richBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  viewFullButton: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
  },
  viewFullGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  viewFullText: {
    ...theme.typography.caption,
    color: '#fff',
    fontWeight: '700',
  },
  // Country Visit Styles
  countryVisitContent: {
    marginTop: theme.spacing.sm,
  },
  countryVisitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  countryVisitText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  photoCollagePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  photoCollageItem: {
    width: '49%',
    height: 120,
    backgroundColor: theme.colors.border,
  },
  photoCollageSingle: {
    width: '100%',
    height: 200,
  },
  photoCollageHalf: {
    width: '49.5%',
  },
  photoCollageOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: '49%',
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCollageOverlayText: {
    ...theme.typography.h3,
    color: '#fff',
    fontWeight: '700',
  },
  diaryPreview: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  countryVisitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetailsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: `${theme.colors.primary}15`,
    borderRadius: theme.borderRadius.sm,
  },
  viewDetailsText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  collapseText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  richContentExpanded: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  richSection: {
    marginBottom: theme.spacing.md,
  },
  richSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  richSectionTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
  },
  photoPreviewGrid: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.border,
  },
  morePhotosText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  diaryText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tipText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 18,
  },
  moreTipsText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  // Completion Banner Styles
  completionBanner: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  completionTitle: {
    ...theme.typography.h3,
    color: '#4CAF50',
    fontWeight: '700',
  },
  completionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  completionHighlight: {
    fontWeight: '700',
    color: '#4CAF50',
  },
  completionPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.2)',
  },
  completionPointsText: {
    ...theme.typography.body,
    color: '#4CAF50',
    fontWeight: '700',
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
});
