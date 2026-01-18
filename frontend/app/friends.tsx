import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, Alert, TouchableOpacity, Platform } from 'react-native';
import { Text, ActivityIndicator, Surface, Searchbar, Button, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import UpgradeModal from '../components/UpgradeModal';
import { useUpgradePrompt } from '../hooks/useUpgradePrompt';
import { useAuth } from '../contexts/AuthContext';
import UniversalHeader from '../components/UniversalHeader';
import ProFeatureLock from '../components/ProFeatureLock';
import { useSubscription } from '../hooks/useSubscription';

// Helper to get token (works on both web and native)
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface User {
  user_id: string;
  username: string;
  name: string;
  picture?: string;
  is_premium: boolean;
}

interface FriendRequest {
  friendship_id: string;
  user: User;
}

export default function FriendsScreen() {
  const [friends, setFriends] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [showProLock, setShowProLock] = useState(false);
  
  // All hooks must be called in consistent order
  const router = useRouter();
  const { user } = useAuth();
  const subscriptionData = useSubscription();
  const isAtFriendLimit = subscriptionData.isAtFriendLimit;
  const maxFriends = subscriptionData.maxFriends;
  const isPro = subscriptionData.isPro;
  const friendsRemaining = subscriptionData.friendsRemaining;

  // Navigate back to social tab explicitly
  const handleBack = () => {
    router.push('/(tabs)/social');
  };
  
  const { showUpgradeModal, upgradeReason, checkResponse, handleUpgrade, closeModal } = useUpgradePrompt({
    onUpgrade: (tier) => {
      if (Platform.OS === 'web') {
        alert(`Upgrade to ${tier} would redirect to payment page`);
      } else {
        Alert.alert('Upgrade', `Upgrade to ${tier} would redirect to payment page`);
      }
    }
  });
  
  // Get friend limit based on subscription
  const isAtLimit = isAtFriendLimit;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getToken();
      
      const [friendsRes, requestsRes] = await Promise.all([
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
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setPendingRequests(requestsData);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSendRequest = async () => {
    if (!searchEmail) {
      Alert.alert('Email Required', 'Please enter an email address');
      return;
    }

    // Check if at friend limit before sending request
    if (isAtLimit && !isPro) {
      setShowProLock(true);
      return;
    }

    setSending(true);

    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friend_email: searchEmail })
      });

      // Check for 403 (limit exceeded)
      if (response.status === 403) {
        const error = await response.json();
        if (error.detail?.includes('limit') || error.detail?.includes('friend')) {
          setShowProLock(true);
        } else {
          Alert.alert('Error', error.detail || 'Failed to send request');
        }
        setSending(false);
        return;
      }

      if (response.ok) {
        Alert.alert('Success', 'Friend request sent!');
        setSearchEmail('');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert('Error', 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    // Check if at friend limit before accepting
    if (isAtLimit && !isPro) {
      setShowProLock(true);
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/friends/${friendshipId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Check for 403 (limit exceeded)
      if (response.status === 403) {
        const error = await response.json();
        if (error.detail?.includes('limit') || error.detail?.includes('friend')) {
          setShowProLock(true);
        } else {
          Alert.alert('Error', error.detail || 'Failed to accept request');
        }
        return;
      }

      if (response.ok) {
        Alert.alert('Success', 'Friend request accepted!');
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const renderFriend = ({ item }: { item: User }) => (
    <Surface style={styles.friendCard}>
      <View style={styles.friendInfo}>
        {item.picture ? (
          <Image source={{ uri: item.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Ionicons name="person" size={24} color="#666" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.friendName}>{item.name}</Text>
          <Text style={styles.friendEmail}>@{item.username}</Text>
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => router.push(`/messages/${item.user_id}?name=${encodeURIComponent(item.name)}`)}
        style={styles.messageButton}
      >
        <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
      {item.is_premium && (
        <Ionicons name="star" size={20} color="#FFD700" />
      )}
    </Surface>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <Surface style={styles.requestCard}>
      <View style={styles.requestInfo}>
        {item.user.picture ? (
          <Image source={{ uri: item.user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Ionicons name="person" size={24} color="#666" />
          </View>
        )}
        <View style={styles.requestText}>
          <Text style={styles.friendName}>{item.user.name}</Text>
          <Text style={styles.friendEmail}>@{item.user.username}</Text>
        </View>
      </View>
      <Button
        mode="contained"
        compact
        onPress={() => handleAcceptRequest(item.friendship_id)}
      >
        Accept
      </Button>
    </Surface>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="Friends" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniversalHeader title="Friends" onBack={handleBack} />

      <Surface style={styles.searchCard}>
        <View style={styles.searchHeader}>
          <Text style={styles.sectionTitle}>Add Friend</Text>
          {user?.subscription_tier === 'free' && (
            <Chip 
              icon={() => <Ionicons name="people" size={14} color={isAtLimit ? theme.colors.error : theme.colors.textSecondary} />}
              style={[
                styles.limitChip,
                isAtLimit && styles.limitChipError
              ]}
              textStyle={styles.limitChipText}
            >
              {friends.length}/{maxFriends}
            </Chip>
          )}
        </View>
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Enter email address"
            value={searchEmail}
            onChangeText={setSearchEmail}
            style={styles.searchBar}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            mode="contained"
            onPress={handleSendRequest}
            loading={sending}
            disabled={sending}
            style={[styles.sendButton, (isAtLimit && !isPro) && styles.sendButtonDisabled]}
          >
            {isAtLimit && !isPro ? 'Limit' : 'Send'}
          </Button>
        </View>
        {isAtLimit && !isPro && (
          <TouchableOpacity 
            style={styles.upgradeHint}
            onPress={() => setShowProLock(true)}
          >
            <Ionicons name="star" size={16} color={theme.colors.accent} />
            <Text style={styles.upgradeHintText}>
              Friend limit ({maxFriends}) reached • Upgrade for unlimited
            </Text>
          </TouchableOpacity>
        )}
        {!isPro && !isAtLimit && (
          <View style={styles.limitInfo}>
            <Ionicons name="information-circle-outline" size={14} color={theme.colors.textLight} />
            <Text style={styles.limitInfoText}>
              {friendsRemaining} friend slot{friendsRemaining !== 1 ? 's' : ''} remaining (Free tier: {maxFriends} max)
            </Text>
          </View>
        )}
      </Surface>

      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Requests ({pendingRequests.length})</Text>
          <FlatList
            data={pendingRequests}
            renderItem={renderRequest}
            keyExtractor={(item) => item.friendship_id}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Friends ({friends.length})</Text>
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.user_id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>Add friends to see their rankings!</Text>
            </View>
          }
        />
      </View>

      <UpgradeModal 
        visible={showUpgradeModal}
        onClose={closeModal}
        onUpgrade={handleUpgrade}
        reason={upgradeReason}
      />

      <ProFeatureLock
        visible={showProLock}
        onClose={() => setShowProLock(false)}
        feature="unlimited_friends"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
  },
  sendButton: {
    height: 48,
    justifyContent: 'center',
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  defaultAvatar: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestText: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  limitChip: {
    backgroundColor: theme.colors.surface,
    height: 28,
  },
  limitChipError: {
    backgroundColor: theme.colors.error + '15',
  },
  limitChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  upgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: 8,
  },
  upgradeHintText: {
    fontSize: 13,
    color: theme.colors.accent,
    marginLeft: 6,
    fontWeight: '600',
    flex: 1,
  },
  limitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
  },
  limitInfoText: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginLeft: 4,
  },
  messageButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '15',
  },
});
