import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Text, Surface, ActivityIndicator, Avatar, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKEND_URL } from '../../utils/config';
import theme from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import UpgradeModal from '../../components/UpgradeModal';

// Helper to get token
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface Friend {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
}

interface Conversation {
  friend: Friend;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.subscription_tier === 'free') {
      setShowUpgradeModal(true);
    } else {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      const token = await getToken();
      const friendsRes = await fetch(`${BACKEND_URL}/api/friends`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (friendsRes.ok) {
        const friends = await friendsRes.json();
        
        // Fetch last message for each friend
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
                unreadCount: 0  // TODO: Implement read status tracking
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
        setConversations(convos);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
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
    fetchConversations();
  };

  const handleConversationPress = (friend: Friend) => {
    if (user?.subscription_tier === 'free') {
      setShowUpgradeModal(true);
      return;
    }
    router.push(`/messages/${friend.user_id}?name=${encodeURIComponent(friend.name)}`);
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      onPress={() => handleConversationPress(item.friend)}
      activeOpacity={0.7}
    >
      <Surface style={styles.conversationCard}>
        <View style={styles.avatarContainer}>
          {item.friend.picture ? (
            <Avatar.Image size={56} source={{ uri: item.friend.picture }} />
          ) : (
            <Avatar.Text 
              size={56} 
              label={item.friend.name.substring(0, 2).toUpperCase()}
              style={styles.avatar}
            />
          )}
          {item.unreadCount > 0 && (
            <Badge style={styles.badge}>{item.unreadCount}</Badge>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.friendName}>{item.friend.name}</Text>
            {item.lastMessageTime && (
              <Text style={styles.timestamp}>{item.lastMessageTime}</Text>
            )}
          </View>
          
          {item.lastMessage ? (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          ) : (
            <Text style={styles.noMessages}>Start a conversation</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </Surface>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#3BB8C3', '#2AA8B3']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {user?.subscription_tier === 'free' ? (
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.lockedTitle}>Messaging is Pro Only</Text>
          <Text style={styles.lockedText}>
            Upgrade to Pro to chat with your travel buddies!
          </Text>
          <TouchableOpacity 
            style={styles.upgradeButtonLarge}
            onPress={() => setShowUpgradeModal(true)}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDark]}
              style={styles.upgradeGradient}
            >
              <Ionicons name="rocket-outline" size={20} color="#fff" />
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.friend.user_id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Add friends to start messaging!
              </Text>
            </View>
          }
        />
      )}

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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
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
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#fff',
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  lastMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  noMessages: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  lockedText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  upgradeButtonLarge: {
    width: '100%',
    maxWidth: 300,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
