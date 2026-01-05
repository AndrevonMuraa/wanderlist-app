import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Surface, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Visit {
  visit_id: string;
  landmark_id: string;
  photo_base64: string;
  comments?: string;
  diary_notes?: string;
  visited_at: string;
}

interface Stats {
  total_visits: number;
  countries_visited: number;
  continents_visited: number;
  friends_count: number;
}

export default function JourneyScreen() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      
      const [visitsRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/visits`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (visitsRes.ok) {
        const visitsData = await visitsRes.json();
        setVisits(visitsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching journey:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderVisit = ({ item }: { item: Visit }) => (
    <TouchableOpacity
      onPress={() => router.push(`/visit-details/${item.visit_id}`)}
      activeOpacity={0.7}
    >
      <Surface style={styles.visitCard}>
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.photo_base64}` }}
          style={styles.visitImage}
        />
        <View style={styles.visitContent}>
          {item.comments && (
            <Text style={styles.visitComment} numberOfLines={2}>
              {item.comments}
            </Text>
          )}
          <Text style={styles.visitDate}>
            {new Date(item.visited_at).toLocaleDateString()}
          </Text>
        </View>
      </Surface>
    </TouchableOpacity>
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
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>My Journey</Text>
        <Text style={styles.headerSubtitle}>Your travel memories</Text>
      </LinearGradient>

      {stats && (
        <Surface style={styles.statsCard}>
          <Text style={styles.statsCardTitle}>Your Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="flag-outline" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.statNumber}>{stats.total_visits}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
                <Ionicons name="map-outline" size={24} color={theme.colors.accent} />
              </View>
              <Text style={styles.statNumber}>{stats.countries_visited}</Text>
              <Text style={styles.statLabel}>Countries</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.accentBronze + '20' }]}>
                <Ionicons name="earth-outline" size={24} color={theme.colors.accentBronze} />
              </View>
              <Text style={styles.statNumber}>{stats.continents_visited}</Text>
              <Text style={styles.statLabel}>Continents</Text>
            </View>
          </View>
          <ProgressBar
            progress={stats.total_visits / 200}
            color={theme.colors.primary}
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>
            {stats.total_visits} of 200 landmarks visited
          </Text>
        </Surface>
      )}

      <FlatList
        data={visits}
        renderItem={renderVisit}
        keyExtractor={(item) => item.visit_id}
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
            <Ionicons name="compass-outline" size={64} color={theme.colors.border} />
            <Text style={styles.emptyText}>No visits yet</Text>
            <Text style={styles.emptySubtext}>Start exploring and mark your first landmark!</Text>
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
  statsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  statsCardTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statNumber: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceTinted,
  },
  progressText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  visitCard: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  visitImage: {
    width: '100%',
    height: 220,
  },
  visitContent: {
    padding: theme.spacing.md,
  },
  visitComment: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  visitDate: {
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
