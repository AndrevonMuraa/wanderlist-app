import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import UniversalHeader from '../components/UniversalHeader';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - theme.spacing.md * 4) / 3;

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface Photo {
  photo_url: string;
  visit_type: 'landmark' | 'country' | 'custom';
  visit_id: string;
  landmark_id?: string;
  landmark_name?: string;
  country_name: string;
  country_id?: string;
  visited_at: string;
  created_at: string;
  photo_index: number;
}

interface PhotoCollection {
  photos: Photo[];
  total_count: number;
  countries_count: number;
  countries: string[];
  years: string[];
  by_type: {
    landmark: number;
    country: number;
    custom: number;
  };
}

type FilterTab = 'all' | 'country' | 'year' | 'type';

// Country flag mapping
const countryFlags: Record<string, string> = {
  france: '🇫🇷', spain: '🇪🇸', italy: '🇮🇹', germany: '🇩🇪',
  'united kingdom': '🇬🇧', japan: '🇯🇵', australia: '🇦🇺', brazil: '🇧🇷',
  canada: '🇨🇦', china: '🇨🇳', india: '🇮🇳', mexico: '🇲🇽',
  usa: '🇺🇸', 'united states': '🇺🇸', egypt: '🇪🇬', 'south africa': '🇿🇦',
  thailand: '🇹🇭', greece: '🇬🇷', portugal: '🇵🇹', netherlands: '🇳🇱',
  switzerland: '🇨🇭', austria: '🇦🇹', belgium: '🇧🇪', sweden: '🇸🇪',
  norway: '🇳🇴', monaco: '🇲🇨', liechtenstein: '🇱🇮',
  denmark: '🇩🇰', iceland: '🇮🇸', croatia: '🇭🇷',
  cambodia: '🇰🇭', nepal: '🇳🇵', 'sri lanka': '🇱🇰',
  philippines: '🇵🇭', taiwan: '🇹🇼',
  jamaica: '🇯🇲', cuba: '🇨🇺', 'dominican republic': '🇩🇴',
  bahamas: '🇧🇸', barbados: '🇧🇧',
};

const getCountryFlag = (countryName: string): string => {
  const key = countryName.toLowerCase();
  return countryFlags[key] || '🏳️';
};

const getVisitTypeIcon = (type: string) => {
  switch (type) {
    case 'landmark': return { icon: 'location', color: theme.colors.primary };
    case 'country': return { icon: 'flag', color: theme.colors.accent };
    case 'custom': return { icon: 'star', color: '#FFD700' };
    default: return { icon: 'image', color: theme.colors.textLight };
  }
};

export default function PhotoCollectionScreen() {
  const router = useRouter();
  const [collection, setCollection] = useState<PhotoCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  // Navigate back to journey tab explicitly
  const handleBack = () => {
    router.push('/(tabs)/journey');
  };

  useEffect(() => {
    fetchPhotoCollection();
  }, []);

  const fetchPhotoCollection = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/photos/collection`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCollection(data);
      }
    } catch (error) {
      console.error('Error fetching photo collection:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPhotoCollection();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const getYear = (dateString: string) => {
    try {
      return new Date(dateString).getFullYear().toString();
    } catch {
      return '';
    }
  };

  const handlePhotoPress = (photo: Photo) => {
    setSelectedPhoto(photo);
    setFullscreenVisible(true);
  };

  const navigateToVisit = (photo: Photo) => {
    setFullscreenVisible(false);
    switch (photo.visit_type) {
      case 'landmark':
        router.push(`/visit-detail/${photo.visit_id}`);
        break;
      case 'country':
        router.push(`/country-visit-detail/${photo.visit_id}`);
        break;
      case 'custom':
        // Custom visits don't have a detail page yet
        break;
    }
  };

  // Group photos based on active tab
  const getGroupedPhotos = () => {
    if (!collection) return [];

    switch (activeTab) {
      case 'country':
        const byCountry: { [key: string]: Photo[] } = {};
        collection.photos.forEach(photo => {
          const country = photo.country_name || 'Unknown';
          if (!byCountry[country]) byCountry[country] = [];
          byCountry[country].push(photo);
        });
        return Object.entries(byCountry).map(([country, photos]) => ({
          title: country,
          subtitle: `${photos.length} photo${photos.length > 1 ? 's' : ''}`,
          icon: getCountryFlag(country),
          photos,
        }));

      case 'year':
        const byYear: { [key: string]: Photo[] } = {};
        collection.photos.forEach(photo => {
          const year = getYear(photo.visited_at || photo.created_at) || 'Unknown';
          if (!byYear[year]) byYear[year] = [];
          byYear[year].push(photo);
        });
        return Object.entries(byYear)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([year, photos]) => ({
            title: year,
            subtitle: `${photos.length} photo${photos.length > 1 ? 's' : ''}`,
            icon: '📅',
            photos,
          }));

      case 'type':
        return [
          {
            title: 'Landmark Visits',
            subtitle: `${collection.by_type.landmark} photos`,
            icon: '🏛️',
            photos: collection.photos.filter(p => p.visit_type === 'landmark'),
          },
          {
            title: 'Country Visits',
            subtitle: `${collection.by_type.country} photos`,
            icon: '🌍',
            photos: collection.photos.filter(p => p.visit_type === 'country'),
          },
          {
            title: 'Custom Visits',
            subtitle: `${collection.by_type.custom} photos`,
            icon: '✨',
            photos: collection.photos.filter(p => p.visit_type === 'custom'),
          },
        ].filter(group => group.photos.length > 0);

      default:
        return [{ title: '', subtitle: '', icon: '', photos: collection.photos }];
    }
  };

  const renderPhotoItem = ({ item: photo }: { item: Photo }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => handlePhotoPress(photo)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: photo.photo_url }} style={styles.photo} />
      <View style={styles.photoOverlay}>
        <View style={[styles.typeIndicator, { backgroundColor: getVisitTypeIcon(photo.visit_type).color }]}>
          <Ionicons 
            name={getVisitTypeIcon(photo.visit_type).icon as any} 
            size={10} 
            color="#fff" 
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGroupSection = ({ item: group }: { item: { title: string; subtitle: string; icon: string; photos: Photo[] } }) => {
    if (activeTab === 'all') {
      return (
        <FlatList
          data={group.photos}
          renderItem={renderPhotoItem}
          keyExtractor={(photo, index) => `${photo.visit_id}-${photo.photo_index}-${index}`}
          numColumns={3}
          scrollEnabled={false}
          contentContainerStyle={styles.photoGrid}
        />
      );
    }

    return (
      <View style={styles.groupSection}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupIcon}>{group.icon}</Text>
          <View style={styles.groupInfo}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Text style={styles.groupSubtitle}>{group.subtitle}</Text>
          </View>
        </View>
        <FlatList
          data={group.photos}
          renderItem={renderPhotoItem}
          keyExtractor={(photo, index) => `${photo.visit_id}-${photo.photo_index}-${index}`}
          numColumns={3}
          scrollEnabled={false}
          contentContainerStyle={styles.photoGrid}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="My Photos" onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your photos...</Text>
        </View>
      </View>
    );
  }

  const groupedPhotos = getGroupedPhotos();

  return (
    <View style={styles.container}>
      <UniversalHeader title="My Photos" onBack={handleBack} />

      <FlatList
        data={groupedPhotos}
        renderItem={renderGroupSection}
        keyExtractor={(item, index) => `group-${item.title}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={() => (
          <>
            {/* Stats Summary */}
            {collection && collection.total_count > 0 && (
              <View style={styles.statsCard}>
                <LinearGradient
                  colors={gradients.oceanToSand}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.statsGradient}
                >
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{collection.total_count}</Text>
                      <Text style={styles.statLabel}>Photos</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{collection.countries_count}</Text>
                      <Text style={styles.statLabel}>Countries</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{collection.years.length}</Text>
                      <Text style={styles.statLabel}>Years</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Filter Tabs */}
            <View style={styles.tabsContainer}>
              {(['all', 'country', 'year', 'type'] as FilterTab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab === 'all' ? 'All' : tab === 'country' ? 'By Country' : tab === 'year' ? 'By Year' : 'By Type'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No Photos Yet</Text>
            <Text style={styles.emptyText}>
              Your travel photos will appear here. Start by visiting landmarks and countries!
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                style={styles.exploreGradient}
              >
                <Ionicons name="compass" size={20} color="#fff" />
                <Text style={styles.exploreText}>Start Exploring</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Fullscreen Photo Modal */}
      <Modal
        visible={fullscreenVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenVisible(false)}
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenVisible(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {selectedPhoto && (
            <>
              <Image
                source={{ uri: selectedPhoto.photo_url }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
              
              <View style={styles.photoInfoOverlay}>
                <View style={styles.photoInfoContent}>
                  <View style={styles.photoInfoRow}>
                    <Text style={styles.photoInfoEmoji}>
                      {getCountryFlag(selectedPhoto.country_name)}
                    </Text>
                    <View>
                      <Text style={styles.photoInfoLocation}>
                        {selectedPhoto.landmark_name || selectedPhoto.country_name}
                      </Text>
                      {selectedPhoto.landmark_name && (
                        <Text style={styles.photoInfoCountry}>
                          {selectedPhoto.country_name}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.photoInfoDate}>
                    {formatDate(selectedPhoto.visited_at || selectedPhoto.created_at)}
                  </Text>
                </View>

                {selectedPhoto.visit_type !== 'custom' && (
                  <TouchableOpacity
                    style={styles.viewVisitButton}
                    onPress={() => navigateToVisit(selectedPhoto)}
                  >
                    <Text style={styles.viewVisitText}>View Visit</Text>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>
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
    fontSize: 16,
    color: theme.colors.textLight,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  statsCard: {
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  statsGradient: {
    padding: theme.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  tabActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textLight,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  groupSection: {
    marginBottom: theme.spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  groupIcon: {
    fontSize: 24,
  },
  groupInfo: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  groupSubtitle: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
  photoGrid: {
    paddingHorizontal: theme.spacing.md,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    margin: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  typeIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  exploreButton: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: theme.spacing.sm,
  },
  fullscreenImage: {
    width: width,
    height: width,
  },
  photoInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  photoInfoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  photoInfoEmoji: {
    fontSize: 32,
  },
  photoInfoLocation: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  photoInfoCountry: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
  photoInfoDate: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
  viewVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight + '20',
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  viewVisitText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
