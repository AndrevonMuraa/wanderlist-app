import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, Alert, Image } from 'react-native';
import { Text, Avatar, TextInput, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKEND_URL } from '../../utils/config';
import theme from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';

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
  activity_type: 'visit' | 'country_complete' | 'milestone';
  landmark_id?: string;
  landmark_name?: string;
  landmark_image?: string;
  country_name?: string;
  points_earned?: number;
  milestone_count?: number;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface Comment {
  comment_id: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  content: string;
  created_at: string;
}

export default function FeedScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [comments, setComments] = useState<{[key: string]: Comment[]}>({});
  const [commentText, setCommentText] = useState<{[key: string]: string}>({});
  const { user } = useAuth();

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/feed?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  const handleLike = async (activity_id: string, is_liked: boolean) => {
    try {
      const token = await getToken();
      const method = is_liked ? 'DELETE' : 'POST';
      const response = await fetch(`${BACKEND_URL}/api/activities/${activity_id}/like`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Update local state
        setActivities(activities.map(activity => 
          activity.activity_id === activity_id
            ? { 
                ...activity, 
                is_liked: !is_liked,
                likes_count: is_liked ? activity.likes_count - 1 : activity.likes_count + 1
              }
            : activity
        ));
      }
    } catch (error) {
      console.error('Error liking activity:', error);
    }
  };

  const fetchComments = async (activity_id: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/activities/${activity_id}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({ ...prev, [activity_id]: data }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async (activity_id: string) => {
    const content = commentText[activity_id]?.trim();
    if (!content) return;

    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/activities/${activity_id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });

      if (response.ok) {
        setCommentText(prev => ({ ...prev, [activity_id]: '' }));
        
        // Update comments count
        setActivities(activities.map(activity => 
          activity.activity_id === activity_id
            ? { ...activity, comments_count: activity.comments_count + 1 }
            : activity
        ));
        
        // Refresh comments
        fetchComments(activity_id);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const toggleComments = (activity_id: string) => {
    if (expandedActivity === activity_id) {
      setExpandedActivity(null);
    } else {
      setExpandedActivity(activity_id);
      if (!comments[activity_id]) {
        fetchComments(activity_id);
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderActivityCard = ({ item }: { item: Activity }) => {
    const isExpanded = expandedActivity === item.activity_id;
    const activityComments = comments[item.activity_id] || [];

    return (
      <Surface style={styles.activityCard}>
        {/* User Header */}
        <View style={styles.activityHeader}>
          {item.user_picture ? (
            <Avatar.Image size={40} source={{ uri: item.user_picture }} />
          ) : (
            <Avatar.Text 
              size={40} 
              label={item.user_name.substring(0, 2).toUpperCase()}
              style={styles.avatar}
            />
          )}
          <View style={styles.activityUserInfo}>
            <Text style={styles.userName}>{item.user_name}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
          </View>
        </View>

        {/* Activity Content */}
        {item.activity_type === 'visit' && (
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              Visited <Text style={styles.bold}>{item.landmark_name}</Text> in {item.country_name}
            </Text>
            {item.landmark_image && (
              <Image 
                source={{ uri: item.landmark_image }} 
                style={styles.landmarkImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={14} color={theme.colors.accentYellow} />
              <Text style={styles.pointsText}>+{item.points_earned} points</Text>
            </View>
          </View>
        )}

        {item.activity_type === 'milestone' && (
          <View style={styles.activityContent}>
            <View style={styles.milestoneContainer}>
              <Ionicons name="trophy" size={32} color={theme.colors.accentYellow} />
              <Text style={styles.milestoneText}>
                Reached {item.milestone_count} landmarks! 🎉
              </Text>
            </View>
          </View>
        )}

        {/* Interaction Bar */}
        <View style={styles.interactionBar}>
          <TouchableOpacity 
            style={styles.interactionButton}
            onPress={() => handleLike(item.activity_id, item.is_liked)}
          >
            <Ionicons 
              name={item.is_liked ? "heart" : "heart-outline"} 
              size={22} 
              color={item.is_liked ? theme.colors.error : theme.colors.textSecondary} 
            />
            <Text style={[styles.interactionText, item.is_liked && styles.likedText]}>
              {item.likes_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.interactionButton}
            onPress={() => toggleComments(item.activity_id)}
          >
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.interactionText}>{item.comments_count}</Text>
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        {isExpanded && (
          <View style={styles.commentsSection}>
            {activityComments.map((comment) => (
              <View key={comment.comment_id} style={styles.commentItem}>
                {comment.user_picture ? (
                  <Avatar.Image size={28} source={{ uri: comment.user_picture }} />
                ) : (
                  <Avatar.Text 
                    size={28} 
                    label={comment.user_name.substring(0, 2).toUpperCase()}
                    style={styles.commentAvatar}
                  />
                )}
                <View style={styles.commentBubble}>
                  <Text style={styles.commentUserName}>{comment.user_name}</Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  <Text style={styles.commentTime}>{formatTimestamp(comment.created_at)}</Text>
                </View>
              </View>
            ))}

            {/* Add Comment */}
            <View style={styles.addCommentContainer}>
              <TextInput
                value={commentText[item.activity_id] || ''}
                onChangeText={(text) => setCommentText(prev => ({ ...prev, [item.activity_id]: text }))}
                placeholder="Write a comment..."
                style={styles.commentInput}
                mode="outlined"
                dense
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.primary}
                right={
                  <TextInput.Icon 
                    icon="send" 
                    onPress={() => handleAddComment(item.activity_id)}
                    disabled={!commentText[item.activity_id]?.trim()}
                  />
                }
              />
            </View>
          </View>
        )}
      </Surface>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Activity Feed</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text>Loading feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Activity Feed</Text>
      </LinearGradient>

      <FlatList
        data={activities}
        renderItem={renderActivityCard}
        keyExtractor={(item) => item.activity_id}
        contentContainerStyle={styles.feedList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No activities yet</Text>
            <Text style={styles.emptySubtext}>
              Add friends to see their travel activities!
            </Text>
          </View>
        }
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedList: {
    padding: theme.spacing.md,
  },
  activityCard: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
  },
  activityUserInfo: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  activityContent: {
    marginTop: theme.spacing.xs,
  },
  activityText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  landmarkImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  milestoneContainer: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
  },
  milestoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  interactionBar: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.lg,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interactionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  likedText: {
    color: theme.colors.error,
  },
  commentsSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  commentAvatar: {
    backgroundColor: theme.colors.primaryLight,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  commentUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addCommentContainer: {
    marginTop: theme.spacing.sm,
  },
  commentInput: {
    backgroundColor: '#fff',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
