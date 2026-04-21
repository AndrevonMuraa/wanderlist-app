import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Skeleton } from '../components/Skeleton';
import theme, { gradients } from '../styles/theme';
import UniversalHeader from '../components/UniversalHeader';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';

interface LandmarkVisit {
  visit_id: string;
  landmark_id: string;
  landmark_name: string;
  country_name: string;
  visited_at: string;
  has_photo: boolean;
  thumbnail_url?: string;
  points_earned: number;
  verified: boolean;
  photo_count?: number;
}

type SortType = 'recent' | 'country' | 'points';

const AnimatedCard = ({ item, index, onPress, formatDate }: {
  item: LandmarkVisit;
  index: number;
  onPress: () => void;
  formatDate: (d: string) => string;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.visitCard}
        onPress={onPress}
        activeOpacity={0.7}
        data-testid={`landmark-visit-${item.visit_id}`}
      >
        <View style={styles.visitSurface}>
          <View style={styles.visitImageContainer}>
            {item.thumbnail_url ? (
              <Image source={{ uri: item.thumbnail_url }} style={styles.visitImage} resizeMode="cover" />
            ) : item.has_photo ? (
              <View style={styles.visitImagePlaceholder}>
                <Ionicons name="camera" size={24} color={theme.colors.primary} />
              </View>
            ) : (
              <View style={styles.visitImagePlaceholder}>
                <Ionicons name="location" size={28} color={theme.colors.textLight} />
              </View>
            )}
            {item.verified && (
              <View style={styles.verifiedBadgeOverlay}>
                <Ionicons name="shield-checkmark" size={10} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.visitContent}>
            <Text style={styles.visitLandmark} numberOfLines={1}>{item.landmark_name}</Text>
            <View style={styles.visitLocationRow}>
              <Ionicons name="flag-outline" size={11} color={theme.colors.textSecondary} />
              <Text style={styles.visitCountry} numberOfLines={1}>{item.country_name}</Text>
            </View>
            <Text style={styles.visitDate}>{formatDate(item.visited_at)}</Text>
            <View style={styles.visitFooter}>
              <View style={styles.visitBadges}>
                {item.verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
                {item.has_photo && (
                  <View style={styles.photoBadge}>
                    <Ionicons name="camera-outline" size={10} color={theme.colors.primary} />
                    <Text style={styles.photoCount}>{item.photo_count || 0}</Text>
                  </View>
                )}
              </View>
              <View style={styles.visitPoints}>
                <Ionicons name="star" size={12} color="#FFA726" />
                <Text style={styles.visitPointsText}>{item.points_earned} pts</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function MyLandmarkVisits() {
  const router = useRouter();
  const [visits, setVisits] = useState<LandmarkVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('recent');


  const fetchVisits = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/visits/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setVisits(data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVisits();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVisits();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const sortedVisits = React.useMemo(() => {
    const sorted = [...visits];
    switch (sortBy) {
      case 'country':
        return sorted.sort((a, b) => (a.country_name || '').localeCompare(b.country_name || ''));
      case 'points':
        return sorted.sort((a, b) => (b.points_earned || 0) - (a.points_earned || 0));
      case 'recent':
      default:
        return sorted.sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());
    }
  }, [visits, sortBy]);

  const verifiedCount = visits.filter(v => v.verified).length;
  const totalPoints = visits.reduce((sum, v) => sum + (v.points_earned || 0), 0);
  const verifiedPoints = visits.filter(v => v.verified).reduce((sum, v) => sum + (v.points_earned || 0), 0);

  const SortChip = ({ label, value, icon }: { label: string; value: SortType; icon: keyof typeof Ionicons.glyphMap }) => (
    <TouchableOpacity
      style={[styles.sortChip, sortBy === value && styles.sortChipActive]}
      onPress={() => setSortBy(value)}
      data-testid={`sort-${value}`}
    >
      <Ionicons name={icon} size={13} color={sortBy === value ? '#fff' : theme.colors.textSecondary} />
      <Text style={[styles.sortChipText, sortBy === value && styles.sortChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="Landmarks" />
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 16, gap: 8 }}>
            {[1, 2, 3].map(i => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Skeleton width={36} height={36} borderRadius={18} style={{ marginBottom: 6 }} />
                <Skeleton width={30} height={18} style={{ marginBottom: 4 }} />
                <Skeleton width={50} height={10} />
              </View>
            ))}
          </View>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
              <Skeleton width={90} height={90} borderRadius={0} />
              <View style={{ flex: 1, padding: 12, gap: 6 }}>
                <Skeleton width="75%" height={16} />
                <Skeleton width="50%" height={12} />
                <Skeleton width="30%" height={10} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniversalHeader title="Landmarks" />

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={[styles.statItem, { flex: 0.7 }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#E3F6FC' }]}>
            <Ionicons name="footsteps-outline" size={14} color={theme.colors.primary} />
          </View>
          <Text style={styles.statNumber}>{visits.length}</Text>
          <Text style={styles.statLabel}>Visited</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statIconWrap, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
          </View>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{verifiedCount}</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statIconWrap, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="star" size={14} color="#FFA726" />
          </View>
          <Text style={[styles.statNumber, { color: '#FFA726' }]}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Total pts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.statItem, { flex: 1.2 }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
          </View>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{verifiedPoints}</Text>
          <Text style={styles.statLabel}>Verified pts</Text>
        </View>
      </View>

      {/* Sort Row */}
      {visits.length > 1 && (
        <View style={styles.sortRow}>
          <SortChip label="Recent" value="recent" icon="time-outline" />
          <SortChip label="Country" value="country" icon="flag-outline" />
          <SortChip label="Points" value="points" icon="star-outline" />
        </View>
      )}

      <FlatList
        data={sortedVisits}
        renderItem={({ item, index }) => (
          <AnimatedCard
            item={item}
            index={index}
            onPress={() => router.push(`/visit-detail/${item.visit_id}`)}
            formatDate={formatDate}
          />
        )}
        keyExtractor={(item) => item.visit_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="compass-outline" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No landmarks visited yet</Text>
            <Text style={styles.emptySubtitle}>
              Explore the world and record your first landmark visit to start building your collection!
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => router.push('/(tabs)/explore' as any)}
              data-testid="start-exploring-btn"
            >
              <Ionicons name="compass" size={18} color="#fff" />
              <Text style={styles.emptyCtaText}>Start Exploring</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    ...theme.shadows.card,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  // Sort
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  sortChipTextActive: {
    color: '#fff',
  },
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  // Visit Card
  visitCard: {
    marginBottom: 10,
  },
  visitSurface: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...theme.shadows.card,
  },
  visitImageContainer: {
    width: 90,
    height: 90,
  },
  visitImage: {
    width: 90,
    height: 90,
  },
  visitImagePlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadgeOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  visitContent: {
    flex: 1,
    padding: 10,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  visitLandmark: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  visitLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  visitCountry: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  visitDate: {
    fontSize: 11,
    color: theme.colors.textLight,
    marginTop: 3,
  },
  visitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  visitBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '700',
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E3F6FC',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  photoCount: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  visitPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  visitPointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFA726',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F6FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
