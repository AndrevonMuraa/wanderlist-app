import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';

interface LandmarkVisit {
  visit_id: string;
  landmark_id: string;
  landmark_name: string;
  country_name: string;
  visited_at: string;
  photos: string[];
  has_photos: boolean;
  points_earned: number;
  verified: boolean;
  diary_notes?: string;
}

export default function MyLandmarkVisits() {
  const router = useRouter();
  const [visits, setVisits] = useState<LandmarkVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getToken = async () => {
    if (Platform.OS === 'web') {
      return localStorage.getItem('auth_token');
    }
    return await SecureStore.getItemAsync('auth_token');
  };

  const fetchVisits = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/visits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setVisits(data);
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVisits();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderVisit = ({ item }: { item: LandmarkVisit }) => (
    <TouchableOpacity
      style={styles.visitCard}
      onPress={() => router.push(`/visit-detail/${item.visit_id}`)}
      activeOpacity={0.8}
      data-testid={`landmark-visit-${item.visit_id}`}
    >
      <Surface style={styles.visitSurface}>
        {item.photos && item.photos.length > 0 ? (
          <Image source={{ uri: item.photos[0] }} style={styles.visitImage} resizeMode="cover" />
        ) : (
          <View style={styles.visitImagePlaceholder}>
            <Ionicons name="location" size={32} color={theme.colors.textLight} />
          </View>
        )}
        <View style={styles.visitContent}>
          <Text style={styles.visitLandmark} numberOfLines={1}>{item.landmark_name}</Text>
          <Text style={styles.visitCountry} numberOfLines={1}>{item.country_name}</Text>
          <View style={styles.visitMeta}>
            <Text style={styles.visitDate}>{formatDate(item.visited_at)}</Text>
            <View style={styles.visitPoints}>
              <Ionicons name="star" size={12} color="#FFA726" />
              <Text style={styles.visitPointsText}>{item.points_earned} pts</Text>
            </View>
          </View>
          <View style={styles.visitBadges}>
            {item.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#4CAF50" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            {item.has_photos && (
              <View style={styles.photoBadge}>
                <Ionicons name="camera" size={12} color={theme.colors.primary} />
                <Text style={styles.photoCount}>{item.photos?.length || 0}</Text>
              </View>
            )}
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradients.oceanToSand} start={gradients.horizontal.start} end={gradients.horizontal.end} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Landmark Visits</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={gradients.oceanToSand} start={gradients.horizontal.start} end={gradients.horizontal.end} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Landmark Visits</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{visits.length}</Text>
          <Text style={styles.statLabel}>Total Visits</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{visits.filter(v => v.verified).length}</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{visits.reduce((sum, v) => sum + (v.points_earned || 0), 0)}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      <FlatList
        data={visits}
        renderItem={renderVisit}
        keyExtractor={(item) => item.visit_id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No landmark visits yet</Text>
            <Text style={styles.emptySubtitle}>Start exploring landmarks to build your collection!</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.card,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    marginVertical: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  visitCard: {
    marginBottom: 12,
  },
  visitSurface: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...theme.shadows.card,
  },
  visitImage: {
    width: 100,
    height: 100,
  },
  visitImagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  visitLandmark: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  visitCountry: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  visitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  visitDate: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  visitPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  visitPointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFA726',
  },
  visitBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  photoCount: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
