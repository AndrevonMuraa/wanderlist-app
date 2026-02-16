import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { BACKEND_URL } from '../../utils/config';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface UserItem {
  user_id: string;
  email: string;
  name: string;
  username?: string;
  picture?: string;
  subscription_tier: string;
  role: string;
  is_banned: boolean;
  visit_count: number;
  points: number;
  created_at: string;
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string | null>(params.filter as string || null);

  useEffect(() => {
    fetchUsers();
  }, [page, filter]);

  const fetchUsers = async (search?: string) => {
    try {
      const token = await getToken();
      let url = `${BACKEND_URL}/api/admin/users?page=${page}&limit=20`;
      
      if (search || searchQuery) {
        url += `&search=${encodeURIComponent(search || searchQuery)}`;
      }
      
      if (filter === 'banned') {
        url += '&is_banned=true';
      } else if (filter === 'pro') {
        url += '&tier=pro';
      } else if (filter === 'admin') {
        url += '&role=admin';
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pages);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers(searchQuery);
  };

  const handleUserAction = async (userId: string, action: 'ban' | 'unban' | 'upgrade' | 'downgrade' | 'make_mod' | 'make_admin' | 'demote') => {
    const token = await getToken();
    let body: Record<string, any> = {};
    let message = '';

    switch (action) {
      case 'ban':
        body = { is_banned: true, ban_reason: 'Banned by admin' };
        message = 'User has been banned';
        break;
      case 'unban':
        body = { is_banned: false };
        message = 'User has been unbanned';
        break;
      case 'upgrade':
        body = { subscription_tier: 'pro' };
        message = 'User upgraded to Pro';
        break;
      case 'downgrade':
        body = { subscription_tier: 'free' };
        message = 'User downgraded to Free';
        break;
      case 'make_mod':
        body = { role: 'moderator' };
        message = 'User promoted to Moderator';
        break;
      case 'make_admin':
        body = { role: 'admin' };
        message = 'User promoted to Admin';
        break;
      case 'demote':
        body = { role: 'user' };
        message = 'User demoted to regular user';
        break;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        Alert.alert('Success', message);
        fetchUsers();
      } else {
        Alert.alert('Error', 'Action failed');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
    }
  };

  const UserCard = ({ user }: { user: UserItem }) => (
    <TouchableOpacity 
      style={[styles.userCard, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/admin/user-detail?id=${user.user_id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.userHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '30' }]}>
          {user.picture ? (
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          ) : (
            <Ionicons name="person" size={24} color={colors.primary} />
          )}
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {user.name}
            </Text>
            {user.subscription_tier === 'pro' && (
              <View style={[styles.proBadge, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="diamond" size={10} color="#fff" />
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
            {user.role === 'admin' && (
              <View style={[styles.roleBadge, { backgroundColor: '#8b5cf6' }]}>
                <Text style={styles.roleBadgeText}>ADMIN</Text>
              </View>
            )}
            {user.role === 'moderator' && (
              <View style={[styles.roleBadge, { backgroundColor: '#3b82f6' }]}>
                <Text style={styles.roleBadgeText}>MOD</Text>
              </View>
            )}
            {user.is_banned && (
              <View style={[styles.bannedBadge, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.bannedBadgeText}>BANNED</Text>
              </View>
            )}
          </View>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </View>
      
      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{user.visit_count} visits</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="star-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{user.points} pts</Text>
        </View>
      </View>

      <View style={styles.userActions}>
        {/* Role management */}
        {user.role === 'user' && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#3b82f6' + '20' }]}
            onPress={() => {
              Alert.alert('Promote to Moderator', `Make ${user.name} a moderator?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Promote', onPress: () => handleUserAction(user.user_id, 'make_mod') }
              ]);
            }}
            data-testid={`promote-mod-${user.user_id}`}
          >
            <Ionicons name="shield-outline" size={16} color="#3b82f6" />
          </TouchableOpacity>
        )}
        {user.role === 'moderator' && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#8b5cf6' + '20' }]}
              onPress={() => {
                Alert.alert('Promote to Admin', `Make ${user.name} an admin?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Promote', onPress: () => handleUserAction(user.user_id, 'make_admin') }
                ]);
              }}
              data-testid={`promote-admin-${user.user_id}`}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color="#8b5cf6" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.textSecondary + '20' }]}
              onPress={() => {
                Alert.alert('Demote User', `Remove ${user.name}'s moderator role?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Demote', style: 'destructive', onPress: () => handleUserAction(user.user_id, 'demote') }
                ]);
              }}
              data-testid={`demote-${user.user_id}`}
            >
              <Ionicons name="person-remove-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}

        {/* Ban/Unban */}
        {!user.is_banned ? (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
            onPress={() => {
              Alert.alert('Ban User', `Are you sure you want to ban ${user.name}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Ban', style: 'destructive', onPress: () => handleUserAction(user.user_id, 'ban') }
              ]);
            }}
          >
            <Ionicons name="ban-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#10b981' + '20' }]}
            onPress={() => handleUserAction(user.user_id, 'unban')}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
          </TouchableOpacity>
        )}
        
        {user.subscription_tier === 'free' ? (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#f59e0b' + '20' }]}
            onPress={() => handleUserAction(user.user_id, 'upgrade')}
          >
            <Ionicons name="arrow-up-circle-outline" size={16} color="#f59e0b" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.textSecondary + '20' }]}
            onPress={() => handleUserAction(user.user_id, 'downgrade')}
          >
            <Ionicons name="arrow-down-circle-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      </View>
    </TouchableOpacity>
  );

  const FilterChip = ({ label, value, active }: { label: string; value: string | null; active: boolean }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        { backgroundColor: active ? colors.primary : colors.surface },
      ]}
      onPress={() => {
        setFilter(active ? null : value);
        setPage(1);
      }}
    >
      <Text style={[styles.filterChipText, { color: active ? '#fff' : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name, email, username..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchUsers(''); }}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filtersRow}>
          <FilterChip label="All" value={null} active={filter === null} />
          <FilterChip label="Banned" value="banned" active={filter === 'banned'} />
          <FilterChip label="Pro Users" value="pro" active={filter === 'pro'} />
          <FilterChip label="Admins" value="admin" active={filter === 'admin'} />
        </View>
      </ScrollView>

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {users.map((user) => (
            <UserCard key={user.user_id} user={user} />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, { opacity: page === 1 ? 0.5 : 1 }]}
                onPress={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.pageText, { color: colors.text }]}>
                Page {page} of {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageButton, { opacity: page === totalPages ? 0.5 : 1 }]}
                onPress={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    padding: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filtersScroll: {
    maxHeight: 50,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    paddingVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 10,
  },
  userCard: {
    padding: 14,
    borderRadius: 14,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  bannedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bannedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  userStats: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 16,
  },
  pageButton: {
    padding: 8,
  },
  pageText: {
    fontSize: 15,
  },
  bottomSpacer: {
    height: 40,
  },
});
