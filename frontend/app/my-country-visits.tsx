import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import UniversalHeader from '../components/UniversalHeader';
import { Skeleton } from '../components/Skeleton';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface CountryVisit {
  country_visit_id: string;
  country_id: string;
  country_name: string;
  continent?: string;
  photos: string[];
  points_earned: number;
  visited_at: string;
  created_at: string;
  has_photos?: boolean;
}

type SortType = 'recent' | 'continent' | 'points';

const countryFlags: Record<string, string> = {
  france: '🇫🇷', spain: '🇪🇸', italy: '🇮🇹', germany: '🇩🇪',
  'united kingdom': '🇬🇧', greece: '🇬🇷', norway: '🇳🇴', portugal: '🇵🇹',
  netherlands: '🇳🇱', switzerland: '🇨🇭', austria: '🇦🇹', sweden: '🇸🇪',
  denmark: '🇩🇰', iceland: '🇮🇸', croatia: '🇭🇷', finland: '🇫🇮',
  turkey: '🇹🇷', ireland: '🇮🇪', hungary: '🇭🇺', 'czech republic': '🇨🇿',
  japan: '🇯🇵', china: '🇨🇳', thailand: '🇹🇭', india: '🇮🇳',
  vietnam: '🇻🇳', 'south korea': '🇰🇷', indonesia: '🇮🇩', malaysia: '🇲🇾',
  singapore: '🇸🇬', philippines: '🇵🇭', cambodia: '🇰🇭', nepal: '🇳🇵',
  'sri lanka': '🇱🇰', taiwan: '🇹🇼', laos: '🇱🇦', mongolia: '🇲🇳',
  bhutan: '🇧🇹', georgia: '🇬🇪', uzbekistan: '🇺🇿', kyrgyzstan: '🇰🇬',
  egypt: '🇪🇬', 'south africa': '🇿🇦', morocco: '🇲🇦', kenya: '🇰🇪',
  tanzania: '🇹🇿', botswana: '🇧🇼', namibia: '🇳🇦', tunisia: '🇹🇳',
  ghana: '🇬🇭', rwanda: '🇷🇼', uganda: '🇺🇬', ethiopia: '🇪🇹',
  senegal: '🇸🇳', zimbabwe: '🇿🇼', zambia: '🇿🇲', mozambique: '🇲🇿',
  'ivory coast': '🇨🇮', malawi: '🇲🇼', lesotho: '🇱🇸', eswatini: '🇸🇿',
  usa: '🇺🇸', 'united states': '🇺🇸', canada: '🇨🇦', mexico: '🇲🇽',
  brazil: '🇧🇷', peru: '🇵🇪', argentina: '🇦🇷', chile: '🇨🇱',
  colombia: '🇨🇴', ecuador: '🇪🇨', 'costa rica': '🇨🇷', cuba: '🇨🇺',
  jamaica: '🇯🇲', 'dominican republic': '🇩🇴', panama: '🇵🇦', bahamas: '🇧🇸',
  barbados: '🇧🇧', uruguay: '🇺🇾', bolivia: '🇧🇴', belize: '🇧🇿',
  'saint lucia': '🇱🇨',
  australia: '🇦🇺', 'new zealand': '🇳🇿', fiji: '🇫🇯', 'french polynesia': '🇵🇫',
  maldives: '🇲🇻', mauritius: '🇲🇺', seychelles: '🇸🇨',
  'cook islands': '🇨🇰', samoa: '🇼🇸', vanuatu: '🇻🇺',
  hawaii: '🇺🇸', madagascar: '🇲🇬', 'cape verde': '🇨🇻',
  'papua new guinea': '🇵🇬', palau: '🇵🇼', 'solomon islands': '🇸🇧',
  'new caledonia': '🇳🇨', guam: '🇬🇺', comoros: '🇰🇲', reunion: '🇷🇪',
};

const getFlag = (name: string) => countryFlags[name.toLowerCase()] || '🏳️';

const AnimatedCard = ({ item, index, onPress, formatDate }: {
  item: CountryVisit;
  index: number;
  onPress: () => void;
  formatDate: (d: string) => string;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 400, delay: index * 80, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hasPhoto = item.photos && item.photos.length > 0;
  const thumbnail = hasPhoto ? item.photos[0] : null;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.visitCard}
        onPress={onPress}
        activeOpacity={0.7}
        data-testid={`country-visit-${item.country_visit_id}`}
      >
        <View style={styles.visitSurface}>
          <View style={styles.visitImageContainer}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail }} style={styles.visitImage} resizeMode="cover" />
            ) : (
              <View style={styles.visitFlagPlaceholder}>
                <Text style={styles.flagLarge}>{getFlag(item.country_name)}</Text>
              </View>
            )}
            {hasPhoto && item.photos.length > 1 && (
              <View style={styles.photoCountOverlay}>
                <Ionicons name="images" size={10} color="#fff" />
                <Text style={styles.photoCountText}>{item.photos.length}</Text>
              </View>
            )}
          </View>
          <View style={styles.visitContent}>
            <View style={styles.visitNameRow}>
              <Text style={styles.flagSmall}>{getFlag(item.country_name)}</Text>
              <Text style={styles.visitName} numberOfLines={1}>{item.country_name}</Text>
            </View>
            {item.continent && (
              <View style={styles.visitContinentRow}>
                <Ionicons name="earth-outline" size={11} color={theme.colors.textSecondary} />
                <Text style={styles.visitContinent}>{item.continent}</Text>
              </View>
            )}
            <Text style={styles.visitDate}>{formatDate(item.visited_at || item.created_at)}</Text>
            <View style={styles.visitFooter}>
              <View style={styles.visitBadges}>
                {hasPhoto && (
                  <View style={styles.photoBadge}>
                    <Ionicons name="camera-outline" size={10} color={theme.colors.primary} />
                    <Text style={styles.photoBadgeText}>{item.photos.length}</Text>
                  </View>
                )}
              </View>
              <View style={styles.visitPoints}>
                <Ionicons name="star" size={12} color="#FFA726" />
                <Text style={styles.visitPointsText}>+{item.points_earned} pts</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function MyCountryVisitsScreen() {
  const router = useRouter();
  const [visits, setVisits] = useState<CountryVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('recent');

  const fetchCountryVisits = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/country-visits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setVisits(data);
      }
    } catch (error) {
      console.error('Error fetching country visits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchCountryVisits(); }, []);

  useFocusEffect(
    useCallback(() => { fetchCountryVisits(); }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCountryVisits();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const sortedVisits = React.useMemo(() => {
    const sorted = [...visits];
    switch (sortBy) {
      case 'continent':
        return sorted.sort((a, b) => (a.continent || '').localeCompare(b.continent || ''));
      case 'points':
        return sorted.sort((a, b) => (b.points_earned || 0) - (a.points_earned || 0));
      case 'recent':
      default:
        return sorted.sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());
    }
  }, [visits, sortBy]);

  const totalPoints = visits.reduce((sum, v) => sum + (v.points_earned || 0), 0);
  const verifiedCount = visits.filter(v => (v.photos?.length || 0) > 0).length;

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
        <UniversalHeader title="Destinations" />
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
      <UniversalHeader title="Destinations" />

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statIconWrap, { backgroundColor: '#E3F6FC' }]}>
            <Ionicons name="flag" size={16} color={theme.colors.primary} />
          </View>
          <Text style={styles.statNumber}>{visits.length}</Text>
          <Text style={styles.statLabel}>Visited</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statIconWrap, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
          </View>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{verifiedCount}</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statIconWrap, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="star" size={16} color="#FFA726" />
          </View>
          <Text style={[styles.statNumber, { color: '#FFA726' }]}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      {/* Sort Row */}
      {visits.length > 1 && (
        <View style={styles.sortRow}>
          <SortChip label="Recent" value="recent" icon="time-outline" />
          <SortChip label="Continent" value="continent" icon="earth-outline" />
          <SortChip label="Points" value="points" icon="star-outline" />
        </View>
      )}

      <FlatList
        data={sortedVisits}
        renderItem={({ item, index }) => (
          <AnimatedCard
            item={item}
            index={index}
            onPress={() => router.push(`/country-visit-detail/${item.country_visit_id}`)}
            formatDate={formatDate}
          />
        )}
        keyExtractor={(item) => item.country_visit_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="flag-outline" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No destinations visited yet</Text>
            <Text style={styles.emptySubtitle}>
              Explore the world and record your first destination visit to start building your collection!
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => router.push('/(tabs)/explore' as any)}
              data-testid="explore-destinations-btn"
            >
              <Ionicons name="earth" size={18} color="#fff" />
              <Text style={styles.emptyCtaText}>Explore Destinations</Text>
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
    paddingVertical: 14,
    paddingHorizontal: 8,
    ...theme.shadows.card,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 20,
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
    minHeight: 90,
    position: 'relative',
  },
  visitImage: {
    width: '100%',
    height: '100%',
    minHeight: 90,
  },
  visitFlagPlaceholder: {
    width: '100%',
    height: '100%',
    minHeight: 90,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagLarge: {
    fontSize: 36,
  },
  photoCountOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  photoCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  visitContent: {
    flex: 1,
    padding: 10,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  visitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagSmall: {
    fontSize: 16,
  },
  visitName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  visitContinentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  visitContinent: {
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
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E3F6FC',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  photoBadgeText: {
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
