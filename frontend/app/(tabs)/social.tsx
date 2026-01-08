import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, Alert } from 'react-native';
import { Text, Avatar, Badge, Surface, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKEND_URL } from '../../utils/config';
import theme from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import UpgradeModal from '../../components/UpgradeModal';
import * as SecureStore from 'expo-secure-store';

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
  picture?: string;
  subscription_tier?: string;
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

export default function SocialScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = await getToken();
      
      // Fetch friends, pending requests, and conversations in parallel
      const [friendsRes, pendingRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/friends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/friends/pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        setFriends(friendsData);
        
        // Fetch last messages for messaging-enabled users (Basic+)
        if (user?.subscription_tier !== 'free') {
          const convosPromises = friendsData.map(async (friend: Friend) => {
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
              console.error(`Error fetching messages for ${friend.name}:`, error);
            }
            
            return {
              friend,
              lastMessage: undefined,
              lastMessageTime: undefined,
              unreadCount: 0
            };
          });
          
          const convos = await Promise.all(convosPromises);
          setConversations(convos.filter(c => c.lastMessage)); // Only show conversations with messages
        }
      }

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingRequests(pendingData);
      }
    } catch (error) {
      console.error('Error fetching social data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleSendFriendRequest = async () => {
    if (!friendEmail.trim()) return;

    try {
      const token = await getToken();
      
      // Determine if input is email or username
      const isEmail = friendEmail.includes('@');
      const requestBody = isEmail 
        ? { friend_email: friendEmail.trim() }
        : { friend_username: friendEmail.trim() };
      
      const response = await fetch(`${BACKEND_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        fetchAllData();
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

      if (response.ok) {
        fetchAllData();
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleMessagePress = (friend: Friend) => {
    if (user?.subscription_tier === 'free') {
      setShowUpgradeModal(true);
      return;
    }
    router.push(`/messages/${friend.user_id}?name=${encodeURIComponent(friend.name)}`);
  };

  const renderSection = (title: string, icon: string, count?: number) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Ionicons name={icon as any} size={20} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined && count > 0 && (
          <Badge style={styles.sectionBadge}>{count}</Badge>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Friends & Messages</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
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
        <Text style={styles.headerTitle}>Friends & Messages</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddFriend(!showAddFriend)}
        >
          <Ionicons name={showAddFriend ? "close" : "person-add"} size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Add Friend Section */}
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
              <TouchableOpacity 
                style={styles.sendRequestButton}
                onPress={handleSendFriendRequest}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDark]}
                  style={styles.sendRequestGradient}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Surface>
        )}

        {/* Pending Friend Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            {renderSection('Friend Requests', 'person-add', pendingRequests.length)}
            {pendingRequests.map((request) => (
              <Surface key={request.friendship_id} style={styles.requestCard}>
                <View style={styles.friendInfo}>
                  {request.user.picture ? (
                    <Avatar.Image size={48} source={{ uri: request.user.picture }} />
                  ) : (
                    <Avatar.Text 
                      size={48} 
                      label={request.user.name.substring(0, 2).toUpperCase()}
                      style={styles.avatar}
                    />
                  )}
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>{request.user.name}</Text>
                    <Text style={styles.friendEmail}>{request.user.email}</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(request.friendship_id)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </Surface>
            ))}
          </View>
        )}

        {/* Recent Conversations */}
        {conversations.length > 0 && user?.subscription_tier !== 'free' && (
          <View style={styles.section}>
            {renderSection('Recent Messages', 'chatbubbles', conversations.length)}
            {conversations.map((convo) => (
              <TouchableOpacity
                key={convo.friend.user_id}
                onPress={() => handleMessagePress(convo.friend)}
                activeOpacity={0.7}
              >
                <Surface style={styles.conversationCard}>
                  <View style={styles.friendInfo}>
                    {convo.friend.picture ? (
                      <Avatar.Image size={48} source={{ uri: convo.friend.picture }} />
                    ) : (
                      <Avatar.Text 
                        size={48} 
                        label={convo.friend.name.substring(0, 2).toUpperCase()}
                        style={styles.avatar}
                      />
                    )}
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>{convo.friend.name}</Text>
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {convo.lastMessage}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.conversationMeta}>
                    <Text style={styles.timestamp}>{convo.lastMessageTime}</Text>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </View>
                </Surface>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* All Friends */}
        {friends.length > 0 && (
          <View style={styles.section}>
            {renderSection('My Friends', 'people', friends.length)}
            {friends.map((friend) => (
              <Surface key={friend.user_id} style={styles.friendCard}>
                <View style={styles.friendInfo}>
                  {friend.picture ? (
                    <Avatar.Image size={48} source={{ uri: friend.picture }} />
                  ) : (
                    <Avatar.Text 
                      size={48} 
                      label={friend.name.substring(0, 2).toUpperCase()}
                      style={styles.avatar}
                    />
                  )}
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendName}>{friend.name}</Text>
                    <Text style={styles.friendEmail}>{friend.email}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.messageIconButton}
                  onPress={() => handleMessagePress(friend)}
                >
                  <Ionicons 
                    name="chatbubble-outline" 
                    size={24} 
                    color={user?.subscription_tier === 'free' ? theme.colors.textLight : theme.colors.primary} 
                  />
                </TouchableOpacity>
              </Surface>
            ))}
          </View>
        )}

        {/* Empty State */}
        {friends.length === 0 && pendingRequests.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>
              Add friends to start exploring together!
            </Text>
            <TouchableOpacity 
              style={styles.addFriendButton}
              onPress={() => setShowAddFriend(true)}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                style={styles.addFriendGradient}
              >
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.addFriendButtonText}>Add Your First Friend</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <UpgradeModal 
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={(tier) => {
          setShowUpgradeModal(false);
          if (Platform.OS === 'web') {
            alert(`Upgrade to ${tier} would redirect to payment page`);
          }
        }}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  addButton: {
    padding: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionBadge: {
    backgroundColor: theme.colors.error,
  },
  addFriendSection: {
    margin: theme.spacing.md,
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
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    elevation: 2,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
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
  requestActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
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
  conversationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
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
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    elevation: 2,
  },
  messageIconButton: {
    padding: theme.spacing.sm,
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
    marginBottom: theme.spacing.xl,
  },
  addFriendButton: {
    width: '100%',
    maxWidth: 280,
  },
  addFriendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  addFriendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
