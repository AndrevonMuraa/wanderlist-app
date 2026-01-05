import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, Surface, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface LeaderboardEntry {
  user_id: string;
  name: string;
  picture?: string;
  visit_count: number;
  rank: number;
}

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${BACKEND_URL}/api/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const renderEntry = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = item.user_id === user?.user_id;
    const topThree = item.rank <= 3;

    // Luxury medal colors
    const getMedalColor = (rank: number) => {
      if (rank === 1) return theme.colors.accent; // Rich gold
      if (rank === 2) return '#C0C0C0'; // Silver
      return theme.colors.accentBronze; // Bronze
    };

    return (
      <Surface style={[styles.entryCard, isCurrentUser && styles.currentUserCard]}>
        <View style={styles.rankContainer}>
          {topThree ? (
            <View style={[styles.trophy, { backgroundColor: getMedalColor(item.rank) }]}>
              <Ionicons name="trophy" size={22} color="#fff" />
            </View>
          ) : (
            <Text style={styles.rankText}>#{item.rank}</Text>
          )}
        </View>

        <View style={styles.userInfo}>
          {item.picture ? (
            <Image source={{ uri: item.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Ionicons name="person-outline" size={24} color={theme.colors.textSecondary} />
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={styles.userName}>{item.name}</Text>
            {isCurrentUser && (
              <Chip mode="flat" compact style={styles.chip} textStyle={styles.chipText}>
                You
              </Chip>
            )}
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{item.visit_count}</Text>
          <Text style={styles.scoreLabel}>visits</Text>
        </View>
      </Surface>
    );
  };

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
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <Text style={styles.headerSubtitle}>
          {user?.is_premium ? 'Global Rankings' : 'Friends Rankings'}
        </Text>
      </LinearGradient>

      {!user?.is_premium && (
        <Surface style={styles.premiumBanner}>
          <View style={styles.premiumIcon}>
            <Ionicons name="star" size={24} color={theme.colors.accent} />
          </View>
          <Text style={styles.premiumText}>
            Upgrade to Premium to see global rankings
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
        </Surface>
      )}

      <FlatList
        data={leaderboard}
        renderItem={renderEntry}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.colors.border} />
            <Text style={styles.emptyText}>No rankings yet</Text>
            <Text style={styles.emptySubtext}>
              {user?.is_premium 
                ? 'Be the first to visit landmarks!' 
                : 'Add friends to see their rankings'}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  premiumText: {
    flex: 1,
    marginLeft: theme.spacing.md,
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  trophy: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    ...theme.typography.h4,
    color: theme.colors.textSecondary,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.md,
  },
  defaultAvatar: {
    backgroundColor: theme.colors.surfaceTinted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  chip: {
    height: 24,
    backgroundColor: theme.colors.surfaceTinted,
  },
  chipText: {
    color: theme.colors.primary,
    fontSize: 10,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  scoreLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    ...theme.typography.h3,
    color: theme.colors.textLight,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    ...theme.typography.bodySmall,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
