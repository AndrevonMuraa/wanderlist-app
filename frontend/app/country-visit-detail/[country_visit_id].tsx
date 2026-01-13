import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Share,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Surface } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';

const { width } = Dimensions.get('window');

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface CountryVisit {
  country_visit_id: string;
  user_id: string;
  user_name?: string;
  country_id: string;
  country_name: string;
  continent?: string;
  photos: string[];
  diary: string;
  visibility: string;
  points_earned: number;
  visited_at?: string;
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

export default function CountryVisitDetailScreen() {
  const router = useRouter();
  const { country_visit_id } = useLocalSearchParams();
  const [visit, setVisit] = useState<CountryVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchVisitDetails();
  }, [country_visit_id]);

  const fetchVisitDetails = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/country-visits/${country_visit_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setVisit(data);
      }
    } catch (error) {
      console.error('Error fetching country visit:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getVisibilityInfo = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return { icon: 'globe-outline', label: 'Public', emoji: '🌐' };
      case 'friends':
        return { icon: 'people-outline', label: 'Friends Only', emoji: '👥' };
      case 'private':
        return { icon: 'lock-closed-outline', label: 'Private', emoji: '🔒' };
      default:
        return { icon: 'globe-outline', label: 'Public', emoji: '🌐' };
    }
  };

  const handleShare = async () => {
    if (!visit) return;
    
    try {
      const message = `🌍 My trip to ${visit.country_name}!\n\n${visit.diary ? `"${visit.diary.substring(0, 100)}${visit.diary.length > 100 ? '...' : ''}"` : 'Amazing memories!'}\n\n📸 ${visit.photos.length} photo${visit.photos.length !== 1 ? 's' : ''} | ⭐ ${visit.points_earned} points\n\n#WanderList #Travel #${visit.country_name.replace(/\s/g, '')}`;
      
      await Share.share({
        message,
        title: `My ${visit.country_name} Adventure`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setSelectedPhotoIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const scrollToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setSelectedPhotoIndex(index);
  };

  const goToPrevPhoto = () => {
    if (selectedPhotoIndex > 0) {
      scrollToIndex(selectedPhotoIndex - 1);
    }
  };

  const goToNextPhoto = () => {
    if (visit && selectedPhotoIndex < visit.photos.length - 1) {
      scrollToIndex(selectedPhotoIndex + 1);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading visit...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={['#3BB8C3', '#2AA8B3']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visit Not Found</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.colors.textLight} />
          <Text style={styles.errorText}>This visit could not be found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const visibilityInfo = getVisibilityInfo(visit.visibility);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Universal Turquoise Header */}
      <LinearGradient colors={['#3BB8C3', '#2AA8B3']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerFlag}>{getCountryFlag(visit.country_name)}</Text>
            <Text style={styles.headerTitle}>{visit.country_name}</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {visit.continent || 'Country Visit'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Ionicons name="share-social-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery with Swipe */}
        {visit.photos && visit.photos.length > 0 && (
          <View style={styles.gallerySection}>
            {/* Swipeable Photo Gallery */}
            <View style={styles.mainPhotoContainer}>
              <FlatList
                ref={flatListRef}
                data={visit.photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                keyExtractor={(_, index) => index.toString()}
                getItemLayout={(_, index) => ({
                  length: width,
                  offset: width * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={styles.mainPhoto}
                    resizeMode="cover"
                  />
                )}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: false }
                )}
              />

              {/* Navigation Arrows */}
              {visit.photos.length > 1 && (
                <>
                  {selectedPhotoIndex > 0 && (
                    <TouchableOpacity
                      style={[styles.navArrow, styles.navArrowLeft]}
                      onPress={goToPrevPhoto}
                    >
                      <Ionicons name="chevron-back" size={28} color="#fff" />
                    </TouchableOpacity>
                  )}
                  {selectedPhotoIndex < visit.photos.length - 1 && (
                    <TouchableOpacity
                      style={[styles.navArrow, styles.navArrowRight]}
                      onPress={goToNextPhoto}
                    >
                      <Ionicons name="chevron-forward" size={28} color="#fff" />
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Photo Counter */}
              {visit.photos.length > 1 && (
                <View style={styles.photoCounter}>
                  <Text style={styles.photoCounterText}>
                    {selectedPhotoIndex + 1} / {visit.photos.length}
                  </Text>
                </View>
              )}
            </View>

            {/* Dot Indicators */}
            {visit.photos.length > 1 && (
              <View style={styles.dotContainer}>
                {visit.photos.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => scrollToIndex(index)}
                  >
                    <View
                      style={[
                        styles.dot,
                        selectedPhotoIndex === index && styles.dotActive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Thumbnail Strip */}
            {visit.photos.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailStrip}
                contentContainerStyle={styles.thumbnailContent}
              >
                {visit.photos.map((photo, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => scrollToIndex(index)}
                    style={[
                      styles.thumbnailContainer,
                      selectedPhotoIndex === index && styles.thumbnailSelected,
                    ]}
                  >
                    <Image source={{ uri: photo }} style={styles.thumbnail} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Visit Info Card */}
        <Surface style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              <Text style={styles.infoLabel}>Visited</Text>
              <Text style={styles.infoValue}>{formatDate(visit.visited_at || visit.created_at)}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.infoLabel}>Points Earned</Text>
              <Text style={styles.infoValue}>{visit.points_earned}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.privacyEmoji}>{visibilityInfo.emoji}</Text>
              <Text style={styles.infoLabel}>Visibility</Text>
              <Text style={styles.infoValue}>{visibilityInfo.label}</Text>
            </View>
          </View>
        </Surface>

        {/* Diary Entry */}
        {visit.diary && (
          <Surface style={styles.diaryCard}>
            <View style={styles.diaryHeader}>
              <Ionicons name="book" size={22} color={theme.colors.primary} />
              <Text style={styles.diaryTitle}>Travel Diary</Text>
            </View>
            <Text style={styles.diaryText}>{visit.diary}</Text>
          </Surface>
        )}

        {/* Empty Diary State */}
        {!visit.diary && (
          <Surface style={styles.diaryCard}>
            <View style={styles.emptyDiary}>
              <Ionicons name="book-outline" size={32} color={theme.colors.textLight} />
              <Text style={styles.emptyDiaryText}>No diary entry for this visit</Text>
            </View>
          </Surface>
        )}

        {/* Share Button */}
        <TouchableOpacity style={styles.shareCard} onPress={handleShare} activeOpacity={0.8}>
          <LinearGradient
            colors={[theme.colors.primary, '#2AA8B3']}
            style={styles.shareGradient}
          >
            <Ionicons name="share-social" size={22} color="#fff" />
            <Text style={styles.shareText}>Share This Memory</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerFlag: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  shareButton: {
    padding: theme.spacing.xs,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  // Gallery
  gallerySection: {
    marginBottom: theme.spacing.md,
  },
  mainPhotoContainer: {
    width: width,
    height: width * 0.75,
    position: 'relative',
  },
  mainPhoto: {
    width: width,
    height: width * 0.75,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowLeft: {
    left: theme.spacing.sm,
  },
  navArrowRight: {
    right: theme.spacing.sm,
  },
  photoCounter: {
    position: 'absolute',
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  photoCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
    width: 12,
  },
  thumbnailStrip: {
    marginTop: theme.spacing.sm,
  },
  thumbnailContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: theme.colors.primary,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  // Info Card
  infoCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
    textAlign: 'center',
  },
  privacyEmoji: {
    fontSize: 20,
  },
  // Diary
  diaryCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  diaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  diaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  diaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  emptyDiary: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  emptyDiaryText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.textLight,
  },
  // Share Card
  shareCard: {
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  shareText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
