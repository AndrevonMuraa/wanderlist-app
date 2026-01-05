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
        colors={[theme.colors.primary, theme.colors.secondary]}
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
              <Ionicons name="flag-outline" size={28} color={theme.colors.primary} />
              <Text style={styles.statNumber}>{stats.total_visits}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="map-outline" size={28} color={theme.colors.secondary} />
              <Text style={styles.statNumber}>{stats.countries_visited}</Text>
              <Text style={styles.statLabel}>Countries</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="earth-outline" size={28} color={theme.colors.accent} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="compass" size={64} color="#ccc" />
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
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#6200ee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0d0ff',
  },
  statsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  visitCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  visitImage: {
    width: '100%',
    height: 200,
  },
  visitContent: {
    padding: 12,
  },
  visitComment: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  visitDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});
