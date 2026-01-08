import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl, FlatList, Modal, Image, Alert } from 'react-native';
import { Text, Surface, TextInput, Avatar, Chip, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import UpgradeModal from '../../components/UpgradeModal';

const BACKEND_URL = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_BACKEND_URL || '');

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

type TabType = 'feed' | 'friends' | 'messages' | 'leaderboard';

interface Activity {
  activity_id: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  activity_type: 'visit' | 'milestone';
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

interface Friend {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
}

interface PendingRequest {
  friendship_id: string;
  user: Friend;
}

interface Conversation {
  friend: Friend;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

interface LeaderboardEntry {
  user_id: string;
  name: string;
  picture?: string;
  total_points: number;
  rank: number;
}

interface Comment {
  comment_id: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  content: string;
  created_at: string;
}

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [refreshing, setRefreshing] = useState(false);
  
  // Feed state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [comments, setComments] = useState<{[key: string]: Comment[]}>({});
  const [commentText, setCommentText] = useState<{[key: string]: string}>({});
  
  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  
  // Messages state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'friends'>('global');
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    fetchDataForTab(activeTab);
  }, [activeTab]);

  const fetchDataForTab = async (tab: TabType) => {
    switch (tab) {
      case 'feed':
        await fetchFeed();
        break;
      case 'friends':
        await fetchFriends();
        break;
      case 'messages':
        await fetchConversations();
        break;
      case 'leaderboard':
        await fetchLeaderboard();
        break;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDataForTab(activeTab).finally(() => setRefreshing(false));
  };

  // Feed functions
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
    }
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
        setActivities(activities.map(activity => 
          activity.activity_id === activity_id
            ? { ...activity, is_liked: !is_liked, likes_count: is_liked ? activity.likes_count - 1 : activity.likes_count + 1 }
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
        setActivities(activities.map(activity => 
          activity.activity_id === activity_id
            ? { ...activity, comments_count: activity.comments_count + 1 }
            : activity
        ));
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

  // Friends functions
  const fetchFriends = async () => {
    try {
      const token = await getToken();
      const [friendsRes, pendingRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/friends`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/friends/pending`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (friendsRes.ok) setFriends(await friendsRes.json());
      if (pendingRes.ok) setPendingRequests(await pendingRes.json());
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!friendEmail.trim()) return;
    try {
      const token = await getToken();
      const isEmail = friendEmail.includes('@');
      const requestBody = isEmail ? { friend_email: friendEmail.trim() } : { friend_username: friendEmail.trim() };
      
      const response = await fetch(`${BACKEND_URL}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        if (Platform.OS === 'web') {
          alert('Friend request sent!');
        } else {
          Alert.alert('Success', 'Friend request sent!');
        }
        setFriendEmail('');
        setShowAddFriend(false);
        fetchFriends();
      } else {
        const error = await response.json();
        if (Platform.OS === 'web') {
          alert(error.detail || 'Failed to send friend request');
        } else {
          Alert.alert('Error', error.detail || 'Failed to send friend request');
        }
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/friends/${friendshipId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchFriends();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  // Messages functions
  const fetchConversations = async () => {
    try {
      const token = await getToken();
      const friendsRes = await fetch(`${BACKEND_URL}/api/friends`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (friendsRes.ok) {
        const friends = await friendsRes.json();
        
        if (user?.subscription_tier === 'free') {
          setConversations(friends.map((friend: Friend) => ({
            friend,
            lastMessage: undefined,
            lastMessageTime: undefined,
            unreadCount: 0
          })));
          return;
        }

        const convosPromises = friends.map(async (friend: Friend) => {
          try {
            const messagesRes = await fetch(`${BACKEND_URL}/api/messages/${friend.user_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (messagesRes.ok) {
              const messages = await messagesRes.json();
              const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
              
              return {
                friend,
                lastMessage: lastMessage ? lastMessage.content : undefined,
                lastMessageTime: lastMessage ? formatTimestamp(lastMessage.created_at) : undefined,
                unreadCount: 0
              };
            }
          } catch (error) {
            console.error(`Error fetching messages:`, error);
          }
          
          return { friend, lastMessage: undefined, lastMessageTime: undefined, unreadCount: 0 };
        });
        
        const convos = await Promise.all(convosPromises);
        setConversations(convos);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleMessagePress = (friend: Friend) => {
    if (user?.subscription_tier === 'free') {
      setShowUpgradeModal(true);
      return;
    }
    router.push(`/messages/${friend.user_id}?name=${encodeURIComponent(friend.name)}`);
  };

  // Leaderboard functions
  const fetchLeaderboard = async () => {
    try {
      const token = await getToken();
      const endpoint = leaderboardType === 'global' ? '/api/leaderboard' : '/api/leaderboard/friends';
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
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
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString();
  };

  // Render functions for each tab
  const renderFeed = () => (
    <FlatList
      data={activities}
      renderItem={({ item }) => {
        const isExpanded = expandedActivity === item.activity_id;
        const activityComments = comments[item.activity_id] || [];

        return (
          <Surface style={styles.activityCard}>
            <View style={styles.activityHeader}>
              {item.user_picture ? (
                <Avatar.Image size={40} source={{ uri: item.user_picture }} />
              ) : (
                <Avatar.Text size={40} label={item.user_name.substring(0, 2).toUpperCase()} style={styles.avatar} />
              )}
              <View style={styles.activityUserInfo}>
                <Text style={styles.userName}>{item.user_name}</Text>
                <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
              </View>
            </View>

            {item.activity_type === 'visit' && (
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  Visited <Text style={styles.bold}>{item.landmark_name}</Text> in {item.country_name}
                </Text>
                {item.landmark_image && (
                  <Image source={{ uri: item.landmark_image }} style={styles.landmarkImage} resizeMode="cover" />
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
                  <Text style={styles.milestoneText}>Reached {item.milestone_count} landmarks! 🎉</Text>
                </View>
              </View>
            )}

            <View style={styles.interactionBar}>
              <TouchableOpacity style={styles.interactionButton} onPress={() => handleLike(item.activity_id, item.is_liked)}>
                <Ionicons name={item.is_liked ? "heart" : "heart-outline"} size={22} color={item.is_liked ? theme.colors.error : theme.colors.textSecondary} />
                <Text style={[styles.interactionText, item.is_liked && styles.likedText]}>{item.likes_count}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.interactionButton} onPress={() => toggleComments(item.activity_id)}>
                <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.interactionText}>{item.comments_count}</Text>
              </TouchableOpacity>
            </View>

            {isExpanded && (
              <View style={styles.commentsSection}>
                {activityComments.map((comment) => (
                  <View key={comment.comment_id} style={styles.commentItem}>
                    {comment.user_picture ? (
                      <Avatar.Image size={28} source={{ uri: comment.user_picture }} />
                    ) : (
                      <Avatar.Text size={28} label={comment.user_name.substring(0, 2).toUpperCase()} style={styles.commentAvatar} />
                    )}
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentUserName}>{comment.user_name}</Text>
                      <Text style={styles.commentText}>{comment.content}</Text>
                      <Text style={styles.commentTime}>{formatTimestamp(comment.created_at)}</Text>
                    </View>
                  </View>
                ))}

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
                    right={<TextInput.Icon icon="send" onPress={() => handleAddComment(item.activity_id)} disabled={!commentText[item.activity_id]?.trim()} />}
                  />
                </View>
              </View>
            )}
          </Surface>
        );
      }}
      keyExtractor={(item) => item.activity_id}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No activities yet</Text>
          <Text style={styles.emptySubtext}>Add friends to see their travel activities!</Text>
        </View>
      }
    />
  );

  const renderFriends = () => (
    <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {showAddFriend && (
        <Surface style={styles.addFriendSection}>
          <Text style={styles.addFriendTitle}>Add a Friend</Text>
          <Text style={styles.addFriendSubtitle}>Enter their email or username</Text>
          <View style={styles.addFriendInput}>
            <TextInput
              value={friendEmail}
              onChangeText={setFriendEmail}
              placeholder="email@example.com or username"
              mode="outlined"
              style={styles.input}
              outlineColor={theme.colors.primary}
              activeOutlineColor={theme.colors.primary}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.sendRequestButton} onPress={handleSendFriendRequest}>
              <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark]} style={styles.sendRequestGradient}>
                <Ionicons name="send" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Surface>
      )}

      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friend Requests</Text>
            <Badge style={styles.sectionBadge}>{pendingRequests.length}</Badge>
          </View>
          {pendingRequests.map((request) => (
            <Surface key={request.friendship_id} style={styles.friendCard}>
              <View style={styles.friendInfo}>
                {request.user.picture ? (
                  <Avatar.Image size={48} source={{ uri: request.user.picture }} />
                ) : (
                  <Avatar.Text size={48} label={request.user.name.substring(0, 2).toUpperCase()} style={styles.avatar} />
                )}
                <View style={styles.friendDetails}>
                  <Text style={styles.friendName}>{request.user.name}</Text>
                  <Text style={styles.friendEmail}>{request.user.email}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRequest(request.friendship_id)}>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </Surface>
          ))}
        </View>
      )}

      {friends.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Friends ({friends.length})</Text>
          {friends.map((friend) => (
            <Surface key={friend.user_id} style={styles.friendCard}>
              <View style={styles.friendInfo}>
                {friend.picture ? (
                  <Avatar.Image size={48} source={{ uri: friend.picture }} />
                ) : (
                  <Avatar.Text size={48} label={friend.name.substring(0, 2).toUpperCase()} style={styles.avatar} />
                )}
                <View style={styles.friendDetails}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  <Text style={styles.friendEmail}>{friend.email}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.messageIconButton} onPress={() => handleMessagePress(friend)}>
                <Ionicons name="chatbubble-outline" size={24} color={user?.subscription_tier === 'free' ? theme.colors.textLight : theme.colors.primary} />
              </TouchableOpacity>
            </Surface>
          ))}
        </View>
      )}

      {friends.length === 0 && pendingRequests.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No friends yet</Text>
          <Text style={styles.emptySubtext}>Add friends to start exploring together!</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderMessages = () => (
    <FlatList
      data={conversations}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleMessagePress(item.friend)} activeOpacity={0.7}>
          <Surface style={styles.conversationCard}>
            <View style={styles.friendInfo}>
              {item.friend.picture ? (
                <Avatar.Image size={48} source={{ uri: item.friend.picture }} />
              ) : (
                <Avatar.Text size={48} label={item.friend.name.substring(0, 2).toUpperCase()} style={styles.avatar} />
              )}
              <View style={styles.friendDetails}>
                <Text style={styles.friendName}>{item.friend.name}</Text>
                {item.lastMessage && <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>}
              </View>
            </View>
            {item.lastMessageTime && (
              <View style={styles.conversationMeta}>
                <Text style={styles.timestamp}>{item.lastMessageTime}</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </View>
            )}
          </Surface>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.friend.user_id}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Send a message to start chatting!</Text>
        </View>
      }
    />
  );

  const renderLeaderboard = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.leaderboardToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, leaderboardType === 'global' && styles.toggleButtonActive]}
          onPress={() => {
            setLeaderboardType('global');
            fetchLeaderboard();
          }}
        >
          <Text style={[styles.toggleText, leaderboardType === 'global' && styles.toggleTextActive]}>Global</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, leaderboardType === 'friends' && styles.toggleButtonActive]}
          onPress={() => {
            setLeaderboardType('friends');
            fetchLeaderboard();
          }}
        >
          <Text style={[styles.toggleText, leaderboardType === 'friends' && styles.toggleTextActive]}>Friends</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={leaderboard}
        renderItem={({ item }) => (
          <Surface style={[styles.leaderboardCard, item.user_id === user?.user_id && styles.currentUserCard]}>
            <View style={styles.rankContainer}>
              <Text style={styles.rankNumber}>#{item.rank}</Text>
            </View>
            <View style={styles.friendInfo}>
              {item.picture ? (
                <Avatar.Image size={48} source={{ uri: item.picture }} />
              ) : (
                <Avatar.Text size={48} label={item.name.substring(0, 2).toUpperCase()} style={styles.avatar} />
              )}
              <View style={styles.friendDetails}>
                <Text style={styles.friendName}>{item.name}{item.user_id === user?.user_id && ' (You)'}</Text>
                <Text style={styles.pointsDisplay}>{item.total_points} points</Text>
              </View>
            </View>
            {item.rank <= 3 && (
              <Ionicons
                name="trophy"
                size={24}
                color={item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : '#CD7F32'}
              />
            )}
          </Surface>
        )}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No rankings yet</Text>
          </View>
        }
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark]} style={styles.header}>
        <Text style={styles.headerTitle}>Social</Text>
        {activeTab === 'friends' && (
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowAddFriend(!showAddFriend)}>
            <Ionicons name={showAddFriend ? "close" : "person-add"} size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
          onPress={() => setActiveTab('feed')}
        >
          <Ionicons name="newspaper" size={22} color={activeTab === 'feed' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Ionicons name="people" size={22} color={activeTab === 'friends' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Friends</Text>
          {pendingRequests.length > 0 && <Badge style={styles.tabBadge}>{pendingRequests.length}</Badge>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Ionicons name="chatbubbles" size={22} color={activeTab === 'messages' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Ionicons name="trophy" size={22} color={activeTab === 'leaderboard' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>Ranks</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'feed' && renderFeed()}
        {activeTab === 'friends' && renderFriends()}
        {activeTab === 'messages' && renderMessages()}
        {activeTab === 'leaderboard' && renderLeaderboard()}
      </View>

      <UpgradeModal visible={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={() => setShowUpgradeModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  headerButton: {
    padding: theme.spacing.xs,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    gap: 4,
    borderRadius: theme.borderRadius.md,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: theme.colors.primaryLight,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    backgroundColor: theme.colors.error,
  },
  tabContent: {
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
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sectionBadge: {
    backgroundColor: theme.colors.error,
  },
  addFriendSection: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    elevation: 2,
  },
  addFriendTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  addFriendSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  addFriendInput: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sendRequestButton: {
    marginTop: 4,
  },
  sendRequestGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    elevation: 2,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendDetails: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  messageIconButton: {
    padding: theme.spacing.sm,
  },
  conversationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    elevation: 2,
  },
  conversationMeta: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  lastMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  leaderboardToggle: {
    flexDirection: 'row',
    margin: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  toggleTextActive: {
    color: theme.colors.primary,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    elevation: 2,
    gap: theme.spacing.md,
  },
  currentUserCard: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  pointsDisplay: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
