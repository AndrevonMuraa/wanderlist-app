import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, Alert, TouchableOpacity, Platform, StatusBar, TextInput } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { useAuth } from '../contexts/AuthContext';
import ProFeatureLock from '../components/ProFeatureLock';
import { useSubscription } from '../hooks/useSubscription';
import { PersistentTabBar } from '../components/PersistentTabBar';

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
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const subscriptionData = useSubscription();
  const isAtFriendLimit = subscriptionData.isAtFriendLimit;
  const maxFriends = subscriptionData.maxFriends;
  const isPro = subscriptionData.isPro;
  const friendsRemaining = subscriptionData.friendsRemaining;

  const handleBack = () => {
    router.push('/(tabs)/social');
  };
  
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
      console.error('Error fetching data:', error);
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

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 24);

  const renderFriend = ({ item }: { item: User }) => (
    <View style={styles.friendCard}>
      <View style={styles.friendInfo}>
        {item.picture ? (
          <Image source={{ uri: item.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Ionicons name="person" size={24} color={theme.colors.textLight} />
          </View>
        )}
        <View style={styles.friendTextContainer}>
          <View style={styles.friendNameRow}>
            <Text style={styles.friendName}>{item.name}</Text>
            {item.is_premium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={10} color="#764ba2" />
              </View>
            )}
          </View>
          <Text style={styles.friendEmail}>@{item.username}</Text>
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => router.push(`/messages/${item.user_id}?name=${encodeURIComponent(item.name)}`)}
        style={styles.messageButton}
      >
        <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.friendInfo}>
        {item.user.picture ? (
          <Image source={{ uri: item.user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Ionicons name="person" size={24} color={theme.colors.textLight} />
          </View>
        )}
        <View style={styles.friendTextContainer}>
          <Text style={styles.friendName}>{item.user.name}</Text>
          <Text style={styles.friendEmail}>@{item.user.username}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.acceptButton}
        onPress={() => handleAcceptRequest(item.friendship_id)}
      >
        <Text style={styles.acceptButtonText}>Accept</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <>
      {/* Add Friend Section */}
      <View style={styles.addFriendCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(77, 184, 216, 0.1)' }]}>
            <Ionicons name="person-add" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Add Friend</Text>
            <Text style={styles.sectionSubtitle}>
              {isPro ? 'Unlimited friends' : `${friendsRemaining} slot${friendsRemaining !== 1 ? 's' : ''} remaining`}
            </Text>
          </View>
          {!isPro && (
            <View style={[styles.limitBadge, isAtLimit && styles.limitBadgeError]}>
              <Text style={[styles.limitBadgeText, isAtLimit && styles.limitBadgeTextError]}>
                {friends.length}/{maxFriends}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="mail-outline" size={18} color={theme.colors.textLight} style={styles.searchIcon} />
            <TextInput
              placeholder="Enter email address"
              value={searchEmail}
              onChangeText={setSearchEmail}
              style={styles.searchInput}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.textLight}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSendRequest}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={16} color="#fff" />
                <Text style={styles.sendButtonText}>Send</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {isAtLimit && !isPro && (
          <TouchableOpacity 
            style={styles.upgradeHint}
            onPress={() => setShowProLock(true)}
          >
            <View style={styles.upgradeHintIcon}>
              <Ionicons name="diamond" size={14} color="#764ba2" />
            </View>
            <Text style={styles.upgradeHintText}>
              Upgrade to Pro for unlimited friends
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#764ba2" />
          </TouchableOpacity>
        )}
      </View>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconSmall, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
              <Ionicons name="time" size={16} color="#FF9800" />
            </View>
            <Text style={styles.sectionTitleSmall}>
              Pending Requests ({pendingRequests.length})
            </Text>
          </View>
          {pendingRequests.map((item) => (
            <View key={item.friendship_id}>
              {renderRequest({ item })}
            </View>
          ))}
        </View>
      )}

      {/* My Friends Header */}
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionIconSmall, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
          <Ionicons name="people" size={16} color="#4CAF50" />
        </View>
        <Text style={styles.sectionTitleSmall}>
          My Friends ({friends.length})
        </Text>
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gradients.oceanToSand}
          start={gradients.horizontal.start}
          end={gradients.horizontal.end}
          style={[styles.header, { paddingTop: topPadding + 10 }]}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Friends</Text>
          <View style={styles.headerRight} />
        </LinearGradient>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.headerRight}>
          <Ionicons name="people" size={20} color="#fff" />
        </View>
      </LinearGradient>

      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.user_id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={48} color={theme.colors.textLight} />
            </View>
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>Add friends to see their travel stats and compete on the leaderboard!</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <PersistentTabBar />

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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  addFriendCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  limitBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  limitBadgeError: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  limitBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  limitBadgeTextError: {
    color: '#F44336',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    gap: 6,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  upgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(118, 75, 162, 0.08)',
    borderRadius: 12,
    gap: 10,
  },
  upgradeHintIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(118, 75, 162, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeHintText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#764ba2',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleSmall: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  friendInfo: {
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
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendTextContainer: {
    flex: 1,
  },
  friendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  premiumBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
