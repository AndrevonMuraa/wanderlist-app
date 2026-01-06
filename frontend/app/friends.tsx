import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, Alert, TouchableOpacity, Platform } from 'react-native';
import { Text, ActivityIndicator, Surface, Searchbar, Button, FAB, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';

// For web, use relative URLs (same origin) which routes to localhost:8001 via proxy
// For mobile, use the external URL
const BACKEND_URL = Platform.OS === 'web' 
  ? '' 
  : (process.env.EXPO_PUBLIC_BACKEND_URL || '');

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
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      
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

    setSending(true);

    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${BACKEND_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friend_email: searchEmail })
      });

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
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${BACKEND_URL}/api/friends/${friendshipId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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
      {item.picture ? (
        <Image source={{ uri: item.picture }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.defaultAvatar]}>
          <Ionicons name="person" size={24} color="#666" />
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={styles.friendEmail}>@{item.username}</Text>
      </View>
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
          <Text style={styles.friendEmail}>{item.user.email}</Text>
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
      </LinearGradient>

      <Surface style={styles.searchCard}>
        <Text style={styles.sectionTitle}>Add Friend</Text>
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
            style={styles.sendButton}
          >
            Send
          </Button>
        </View>
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
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
  friendInfo: {
    flex: 1,
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
});
