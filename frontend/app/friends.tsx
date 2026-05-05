import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, Alert, TouchableOpacity, Platform, StatusBar, TextInput } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { useAuth } from '../contexts/AuthContext';
import FriendsCrew from '../components/FriendsCrew';
import FriendsLeaderboardCard from '../components/FriendsLeaderboardCard';
import SharedPlacesStrip from '../components/SharedPlacesStrip';
import FriendsActivityFeed from '../components/FriendsActivityFeed';
import GroupStatsModal from '../components/GroupStatsModal';
import ProFeatureLock from '../components/ProFeatureLock';
import { useSubscription } from '../hooks/useSubscription';
import { PersistentTabBar } from '../components/PersistentTabBar';
import { NewMessageNotifPrompt } from '../components/NewMessageNotifPrompt';

import { HeaderBranding } from '../components/BrandedGlobeIcon';
import { getToken } from '../utils/token';

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
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [showProLock, setShowProLock] = useState(false);
  const [friendsFilter, setFriendsFilter] = useState('');
  const [groupMode, setGroupMode] = useState(false);
  const [groupSelected, setGroupSelected] = useState<string[]>([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const toggleGroupMember = (uid: string) => {
    setGroupSelected((prev) => {
      if (prev.includes(uid)) return prev.filter((id) => id !== uid);
      if (prev.length >= 4) return prev;
      return [...prev, uid];
    });
  };
  
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

  const filteredFriends = friendsFilter.length > 0
    ? friends.filter(f => 
        f.name.toLowerCase().includes(friendsFilter.toLowerCase()) ||
        (f.username && f.username.toLowerCase().includes(friendsFilter.toLowerCase()))
      )
    : friends;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getToken();
      
      const [friendsRes, requestsRes, sentRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/friends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/friends/pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/friends/sent`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (friendsRes.ok) setFriends(await friendsRes.json());
      if (requestsRes.ok) setPendingRequests(await requestsRes.json());
      if (sentRes.ok) setSentRequests(await sentRes.json());
    } catch (error) {
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
    if (!searchUsername) {
      Alert.alert('Username Required', 'Please enter a username');
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
        body: JSON.stringify({ friend_username: searchUsername })
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
        setSearchUsername('');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to send request');
      }
    } catch (error) {
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
        headers: { 'Authorization': `Bearer ${token}` }
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
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/friends/${friendshipId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        Alert.alert('Done', 'Request rejected');
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  const handleRemoveFriend = (friend: User, friendshipId?: string) => {
    Alert.alert('Remove Friend', `Remove ${friend.name} as a friend?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const token = await getToken();
          // We need friendship_id. If not available, find via friends list
          if (friendshipId) {
            await fetch(`${BACKEND_URL}/api/friends/${friendshipId}`, {
              method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
            });
          }
          fetchData();
        } catch (e) { Alert.alert('Error', 'Failed to remove friend'); }
      }},
    ]);
  };

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchUsers = useCallback((query: string) => {
    setSearchUsername(query);
    if (query.length < 2) { setSearchResults([]); return; }
    
    // Debounce: wait 300ms after last keystroke before searching
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setSearchResults(await res.json());
      } catch (e) { }
      finally { setSearching(false); }
    }, 300);
  }, []);

  const handleSendRequestToUser = async (username: string) => {
    if (isAtLimit && !isPro) { setShowProLock(true); return; }
    setSending(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ friend_username: username })
      });
      if (response.ok) {
        Alert.alert('Success', 'Friend request sent!');
        setSearchUsername(''); setSearchResults([]);
        fetchData();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to send request');
      }
    } catch (e) { Alert.alert('Error', 'Failed to send request'); }
    finally { setSending(false); }
  };

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 24);

  const renderFriend = ({ item }: { item: User }) => (
    <View style={styles.friendCard}>
      <TouchableOpacity style={styles.friendInfo} onPress={() => router.push(`/user-profile/${item.user_id}`)} testID={`friend-${item.user_id}`}>
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
                <Ionicons name="diamond" size={10} color="#1E8A8A" />
              </View>
            )}
          </View>
          <Text style={styles.friendEmail}>@{item.username}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.friendActions}>
        <TouchableOpacity 
          onPress={() => router.push(`/messages/${item.user_id}?name=${encodeURIComponent(item.name)}`)}
          style={styles.messageButton}
        >
          <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestCard}>
      <TouchableOpacity style={styles.friendInfo} onPress={() => router.push(`/user-profile/${item.user.user_id}`)}>
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
      </TouchableOpacity>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item.friendship_id)}
          testID={`accept-${item.friendship_id}`}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleRejectRequest(item.friendship_id)}
          testID={`reject-${item.friendship_id}`}
        >
          <Ionicons name="close" size={18} color="#E53935" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <>
      {/* === NEW: Friends hub sections (only show if friends exist) === */}
      {friends.length > 0 && (
        <>
          <FriendsCrew
            friends={friends.map((f: any) => ({
              user_id: f.user_id, name: f.name, username: f.username, picture: f.picture,
            }))}
            pendingCount={pendingRequests.length}
            selectedIds={groupMode ? groupSelected : undefined}
            onToggleSelect={groupMode ? toggleGroupMember : undefined}
          />

          {/* Group-mode toolbar */}
          <View style={styles.groupToolbar}>
            <TouchableOpacity
              onPress={() => {
                setGroupMode((m) => !m);
                setGroupSelected([]);
              }}
              style={[styles.groupToggle, groupMode && styles.groupToggleActive]}
              activeOpacity={0.85}
              testID="group-mode-toggle"
            >
              <Ionicons name={groupMode ? 'close-circle' : 'people-circle'} size={16} color={groupMode ? '#FFF' : theme.colors.primary} />
              <Text style={[styles.groupToggleText, groupMode && { color: '#FFF' }]}>
                {groupMode ? 'Cancel' : 'Group mode'}
              </Text>
            </TouchableOpacity>
            {groupMode && groupSelected.length > 0 && (
              <TouchableOpacity
                style={styles.compareGroupBtn}
                onPress={() => setGroupModalOpen(true)}
                activeOpacity={0.85}
                testID="compare-group-btn"
              >
                <Ionicons name="stats-chart" size={15} color="#1a1a2e" />
                <Text style={styles.compareGroupText}>
                  Compare {groupSelected.length} {groupSelected.length === 1 ? 'friend' : 'friends'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <FriendsLeaderboardCard />
          <SharedPlacesStrip />
          <FriendsActivityFeed />

          {/* One-time onboarding: ask permission to ping on new messages */}
          <NewMessageNotifPrompt />

          {/* Messages inbox shortcut — messaging is a friends-only feature */}
          <TouchableOpacity
            style={styles.messagesInboxCard}
            onPress={() => router.push('/messages')}
            activeOpacity={0.85}
            testID="friends-messages-inbox"
          >
            <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(77, 184, 216, 0.14)' }]}>
              <Ionicons name="chatbubbles" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.messagesInboxTitle}>Messages</Text>
              <Text style={styles.messagesInboxSubtitle}>
                Chat with your travel crew — tap a friend below or open the inbox
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </>
      )}

      {/* Search Users Section */}
      <View style={styles.addFriendCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(77, 184, 216, 0.1)' }]}>
            <Ionicons name="people" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Find Friends</Text>
            <Text style={styles.sectionSubtitle}>
              {isPro ? 'Unlimited friends' : `${friends.length} of ${maxFriends} friends`}
            </Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="person-outline" size={18} color={theme.colors.textLight} style={styles.searchIcon} />
            <TextInput
              placeholder="Search by username"
              value={searchUsername}
              onChangeText={handleSearchUsers}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              placeholderTextColor={theme.colors.textLight}
              testID="user-search-input"
            />
            {searchUsername.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchUsername(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((u: any) => (
              <View key={u.user_id} style={styles.searchResultItem}>
                <TouchableOpacity style={styles.friendInfo} onPress={() => router.push(`/user-profile/${u.user_id}`)}>
                  {u.picture ? (
                    <Image source={{ uri: u.picture }} style={styles.searchAvatar} />
                  ) : (
                    <View style={[styles.searchAvatar, styles.defaultAvatar]}>
                      <Ionicons name="person" size={16} color={theme.colors.textLight} />
                    </View>
                  )}
                  <View style={styles.friendTextContainer}>
                    <Text style={styles.friendName}>{u.name}</Text>
                    {u.username && <Text style={styles.friendEmail}>@{u.username}</Text>}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleSendRequestToUser(u.username)}
                  disabled={sending}
                  testID={`add-${u.user_id}`}
                >
                  <Ionicons name="person-add-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {searching && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 8 }} />}

        {isAtLimit && !isPro && (
          <TouchableOpacity 
            style={styles.upgradeHint}
            onPress={() => setShowProLock(true)}
          >
            <View style={styles.upgradeHintIcon}>
              <Ionicons name="diamond" size={14} color="#1E8A8A" />
            </View>
            <Text style={styles.upgradeHintText}>
              Upgrade to Pro for unlimited friends
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#1E8A8A" />
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

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconSmall, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
              <Ionicons name="paper-plane" size={16} color="#2196F3" />
            </View>
            <Text style={styles.sectionTitleSmall}>
              Sent Requests ({sentRequests.length})
            </Text>
          </View>
          {sentRequests.map((item) => (
            <View key={item.friendship_id} style={styles.requestCard}>
              <TouchableOpacity style={styles.friendInfo} onPress={() => router.push(`/user-profile/${item.user.user_id}`)}>
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
              </TouchableOpacity>
              <View style={styles.pendingLabel}>
                <Text style={styles.pendingLabelText}>Pending</Text>
              </View>
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

      {/* Friends Filter */}
      {friends.length > 3 && (
        <View style={styles.friendsFilterContainer} testID="friends-filter">
          <Ionicons name="search-outline" size={16} color={theme.colors.textLight} />
          <TextInput
            placeholder="Filter friends..."
            value={friendsFilter}
            onChangeText={setFriendsFilter}
            style={styles.friendsFilterInput}
            autoCapitalize="none"
            placeholderTextColor={theme.colors.textLight}
            testID="friends-filter-input"
          />
          {friendsFilter.length > 0 && (
            <TouchableOpacity onPress={() => setFriendsFilter('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      )}
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
        style={[styles.header, { paddingTop: topPadding }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Friends</Text>
          </View>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <HeaderBranding size={18} textColor="#2A2A2A" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={filteredFriends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.user_id}
        ListHeaderComponent={renderHeader()}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="always"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={48} color={theme.colors.textLight} />
            </View>
            <Text style={styles.emptyText}>{friendsFilter ? 'No matching friends' : 'No friends yet'}</Text>
            <Text style={styles.emptySubtext}>
              {friendsFilter ? 'Try a different search term' : 'Add friends to see their travel stats and compete on the leaderboard!'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <PersistentTabBar />

      <GroupStatsModal
        visible={groupModalOpen}
        onDismiss={() => setGroupModalOpen(false)}
        selectedFriendIds={groupSelected}
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
  groupToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
  },
  groupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    backgroundColor: theme.colors.surface,
  },
  groupToggleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  groupToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  compareGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#FFD700',
  },
  compareGroupText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 0.2,
  },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#1E8A8A',
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
  headerRight: {
    width: 36,
  },
  searchResults: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  searchAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingLabel: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  friendsFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
    gap: 8,
  },
  friendsFilterInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
});
