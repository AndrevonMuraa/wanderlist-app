import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Surface } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import UniversalHeader from '../components/UniversalHeader';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - theme.spacing.md * 3) / 2;

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
  diary?: string;
  visibility: string;
  points_earned: number;
  visited_at: string;
  created_at: string;
}

// Country flag mapping
const countryFlags: Record<string, string> = {
  france: '🇫🇷',
  spain: '🇪🇸',
  italy: '🇮🇹',
  germany: '🇩🇪',
  'united kingdom': '🇬🇧',
  japan: '🇯🇵',
  australia: '🇦🇺',
  brazil: '🇧🇷',
  canada: '🇨🇦',
  china: '🇨🇳',
  india: '🇮🇳',
  mexico: '🇲🇽',
  usa: '🇺🇸',
  'united states': '🇺🇸',
  egypt: '🇪🇬',
  'south africa': '🇿🇦',
  thailand: '🇹🇭',
  greece: '🇬🇷',
  portugal: '🇵🇹',
  netherlands: '🇳🇱',
  switzerland: '🇨🇭',
  austria: '🇦🇹',
  belgium: '🇧🇪',
  sweden: '🇸🇪',
  norway: '🇳🇴',
};

const getCountryFlag = (countryName: string): string => {
  const key = countryName.toLowerCase();
  return countryFlags[key] || '🏳️';
};

const getVisibilityIcon = (visibility: string) => {
  switch (visibility) {
    case 'public': return { icon: 'globe-outline', label: '🌐' };
    case 'friends': return { icon: 'people-outline', label: '👥' };
    case 'private': return { icon: 'lock-closed-outline', label: '🔒' };
    default: return { icon: 'globe-outline', label: '🌐' };
  }
};

export default function MyCountryVisitsScreen() {
  const router = useRouter();
  const [visits, setVisits] = useState<CountryVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Navigate back to journey tab explicitly
  const handleBack = () => {
    router.push('/(tabs)/journey');
  };

  useEffect(() => {
    fetchCountryVisits();
  }, []);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCountryVisits();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalPoints = visits.reduce((sum, v) => sum + (v.points_earned || 0), 0);

  if (loading) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="My Country Visits" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your visits...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniversalHeader title="My Country Visits" />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Summary */}
        {visits.length > 0 && (
          <Surface style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="flag" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>{visits.length}</Text>
                <Text style={styles.statLabel}>Visits</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="images" size={24} color="#FF6B6B" />
                <Text style={styles.statValue}>
                  {visits.reduce((sum, v) => sum + (v.photos?.length || 0), 0)}
                </Text>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="star" size={24} color="#FFD700" />
                <Text style={styles.statValue}>{totalPoints}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Visits Grid */}
        {visits.length > 0 ? (
          <View style={styles.grid}>
            {visits.map((visit) => (
              <TouchableOpacity
                key={visit.country_visit_id}
                style={styles.visitCard}
                onPress={() => router.push(`/country-visit-detail/${visit.country_visit_id}`)}
                activeOpacity={0.8}
              >
                {/* Photo Preview */}
                <View style={styles.photoContainer}>
                  {visit.photos && visit.photos.length > 0 ? (
                    <Image
                      source={{ uri: visit.photos[0] }}
                      style={styles.cardPhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.noPhoto}>
                      <Text style={styles.flagEmoji}>{getCountryFlag(visit.country_name)}</Text>
                    </View>
                  )}
                  
                  {/* Photo count badge */}
                  {visit.photos && visit.photos.length > 1 && (
                    <View style={styles.photoBadge}>
                      <Ionicons name="images" size={12} color="#fff" />
                      <Text style={styles.photoBadgeText}>{visit.photos.length}</Text>
                    </View>
                  )}
                  
                  {/* Privacy badge */}
                  <View style={styles.privacyBadge}>
                    <Text style={styles.privacyText}>
                      {getVisibilityIcon(visit.visibility).label}
                    </Text>
                  </View>
                </View>

                {/* Card Info */}
                <View style={styles.cardInfo}>
                  <View style={styles.countryRow}>
                    <Text style={styles.flagSmall}>{getCountryFlag(visit.country_name)}</Text>
                    <Text style={styles.countryName} numberOfLines={1}>
                      {visit.country_name}
                    </Text>
                  </View>
                  <Text style={styles.visitDate}>{formatDate(visit.visited_at || visit.created_at)}</Text>
                  <View style={styles.pointsRow}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.pointsText}>+{visit.points_earned} pts</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="camera-outline" size={48} color={theme.colors.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No Country Visits Yet</Text>
            <Text style={styles.emptyDescription}>
              Start documenting your travels! Visit a country page and tap the camera icon to create a visit with photos and diary entries.
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#2AA8B3']}
                style={styles.exploreGradient}
              >
                <Ionicons name="earth" size={20} color="#fff" />
                <Text style={styles.exploreText}>Explore Countries</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  // Stats Card
  statsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  visitCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  photoContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.8,
    position: 'relative',
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
  },
  noPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceTinted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagEmoji: {
    fontSize: 48,
  },
  photoBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  privacyBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  privacyText: {
    fontSize: 12,
  },
  cardInfo: {
    padding: theme.spacing.sm,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  flagSmall: {
    fontSize: 16,
  },
  countryName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  visitDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C9A961',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surfaceTinted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
    maxWidth: '90%',
  },
  exploreButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  exploreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  exploreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
