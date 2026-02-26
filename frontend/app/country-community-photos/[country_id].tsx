import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Image, TouchableOpacity, Platform, Dimensions, Alert, Modal } from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';
import { useSubscription } from '../../hooks/useSubscription';
import { BACKEND_URL } from '../../utils/config';
import UniversalHeader from '../../components/UniversalHeader';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - theme.spacing.lg * 3) / 2;

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface CommunityPhoto {
  photo_id: string;
  photo_url: string;
  landmark_name: string;
  landmark_id?: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  username?: string;
  visited_at?: string;
  diary_notes?: string;
  has_diary?: boolean;
  upvotes: number;
  user_upvoted: boolean;
}

interface DiaryEntry {
  visit_id: string;
  diary_notes: string;
  photo_url?: string;
  landmark_name: string;
  landmark_id?: string;
  user_name: string;
  user_picture?: string;
  username?: string;
  visited_at?: string;
}

export default function CountryCommunityPhotosScreen() {
  const { country_id, name } = useLocalSearchParams();
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [diaryTotalCount, setDiaryTotalCount] = useState(0);
  const [isPreview, setIsPreview] = useState(true);
  const [isDiaryPreview, setIsDiaryPreview] = useState(true);
  const [countryName, setCountryName] = useState(name || '');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'photos' | 'diaries'>('photos');
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular');
  const [diaryModal, setDiaryModal] = useState<{ visible: boolean; text: string; userName: string }>({ visible: false, text: '', userName: '' });
  const router = useRouter();
  const { subscription_tier } = useSubscription();
  const isPremium = subscription_tier === 'pro';

  useEffect(() => {
    fetchPhotos();
    fetchDiaries();
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [sortBy]);

  const fetchPhotos = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/countries/${country_id}/community-photos?sort=${sortBy}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos);
        setTotalCount(data.total_count);
        setIsPreview(data.is_preview);
        if (data.country_name) setCountryName(data.country_name);
      }
    } catch (error) {
      console.error('Error fetching country community photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiaries = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/countries/${country_id}/travel-diaries`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setDiaries(data.diaries);
        setDiaryTotalCount(data.total_count);
        setIsDiaryPreview(data.is_preview);
        if (data.country_name) setCountryName(data.country_name);
      }
    } catch (error) {
      console.error('Error fetching travel diaries:', error);
    }
  };

  const handleUpvote = async (photoId: string) => {
    if (!isPremium) {
      Alert.alert('Premium Feature', 'Upgrade to WanderMark Pro to upvote community photos!');
      return;
    }
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/community-photos/${encodeURIComponent(photoId)}/upvote`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const result = await response.json();
        setPhotos(prev =>
          prev.map(p =>
            p.photo_id === photoId
              ? { ...p, upvotes: result.upvotes, user_upvoted: result.upvoted }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  const renderPhoto = useCallback(({ item }: { item: CommunityPhoto }) => (
    <Surface style={styles.photoCard} data-testid={`country-photo-${item.photo_id}`}>
      <Image source={{ uri: item.photo_url }} style={styles.photoImage} resizeMode="cover" />
      <View style={styles.photoInfo}>
        <View style={styles.userRow}>
          {item.user_picture ? (
            <Image source={{ uri: item.user_picture }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
              <Ionicons name="person" size={12} color={theme.colors.textSecondary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>{item.user_name}</Text>
            {item.username && (
              <Text style={styles.userHandle} numberOfLines={1}>@{item.username}</Text>
            )}
          </View>
        </View>
        <View style={styles.landmarkTag}>
          <Ionicons name="location" size={10} color={theme.colors.primary} />
          <Text style={styles.landmarkTagText} numberOfLines={1}>{item.landmark_name}</Text>
        </View>
        <View style={styles.actionRow}>
          <View style={styles.actionLeft}>
            <TouchableOpacity
              onPress={() => handleUpvote(item.photo_id)}
              style={styles.upvoteButton}
              data-testid={`upvote-btn-${item.photo_id}`}
            >
              <Ionicons
                name={item.user_upvoted ? 'heart' : 'heart-outline'}
                size={18}
                color={item.user_upvoted ? '#FF6B6B' : theme.colors.textSecondary}
              />
              <Text style={[styles.upvoteCount, item.user_upvoted && { color: '#FF6B6B' }]}>
                {item.upvotes}
              </Text>
            </TouchableOpacity>
            {item.has_diary && (
              <TouchableOpacity
                onPress={() => setDiaryModal({ visible: true, text: item.diary_notes || '', userName: item.user_name })}
                style={styles.diaryButton}
                data-testid={`diary-btn-${item.photo_id}`}
              >
                <Ionicons name="book-outline" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          {item.visited_at && (
            <Text style={styles.dateText}>
              {new Date(item.visited_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    </Surface>
  ), [isPremium]);

  const renderUpgradePrompt = () => (
    <Surface style={styles.upgradeCard} data-testid="upgrade-prompt">
      <LinearGradient
        colors={[theme.colors.accent, '#D4A574']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.upgradeGradient}
      >
        <Ionicons name="diamond" size={32} color="#fff" />
        <Text style={styles.upgradeTitle}>
          {totalCount > 3
            ? `+${totalCount - 3} more photos from ${countryName}`
            : `Unlock Full ${countryName} Gallery`}
        </Text>
        <Text style={styles.upgradeSubtitle}>
          Upgrade to Premium to see all community photos and upvote your favorites
        </Text>
        <TouchableOpacity style={styles.upgradeButton} data-testid="upgrade-button">
          <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Surface>
  );

  const renderDiaryCard = ({ item }: { item: DiaryEntry }) => (
    <Surface style={styles.diaryCard} data-testid={`diary-card-${item.visit_id}`}>
      <View style={styles.diaryCardHeader}>
        {item.photo_url && (
          <Image source={{ uri: item.photo_url }} style={styles.diaryThumb} resizeMode="cover" />
        )}
        <View style={styles.diaryCardMeta}>
          <Text style={styles.diaryCardUser} numberOfLines={1}>{item.user_name}</Text>
          {item.username && <Text style={styles.diaryCardHandle}>@{item.username}</Text>}
          <View style={styles.diaryCardLandmark}>
            <Ionicons name="location" size={11} color={theme.colors.primary} />
            <Text style={styles.diaryCardLandmarkText} numberOfLines={1}>{item.landmark_name}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.diaryCardText}>{item.diary_notes}</Text>
      {item.visited_at && (
        <Text style={styles.diaryCardDate}>{new Date(item.visited_at).toLocaleDateString()}</Text>
      )}
    </Surface>
  );

  const renderDiaryUpgradePrompt = () => (
    <Surface style={styles.upgradeCard} data-testid="diary-upgrade-prompt">
      <LinearGradient
        colors={[theme.colors.accent, '#D4A574']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.upgradeGradient}
      >
        <Ionicons name="book" size={32} color="#fff" />
        <Text style={styles.upgradeTitle}>
          {diaryTotalCount > 2
            ? `+${diaryTotalCount - 2} more travel diaries`
            : 'Unlock All Diaries'}
        </Text>
        <Text style={styles.upgradeSubtitle}>
          Upgrade to Premium for the full community travel guide
        </Text>
        <TouchableOpacity style={styles.upgradeButton} data-testid="diary-upgrade-button">
          <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Surface>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="Country Photos" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniversalHeader title={countryName as string} />

      {/* Tab Bar */}
      <View style={styles.tabBar} data-testid="country-tabs">
        <TouchableOpacity
          style={[styles.tab, activeTab === 'photos' && styles.tabActive]}
          onPress={() => setActiveTab('photos')}
          data-testid="tab-photos"
        >
          <Ionicons name="images" size={16} color={activeTab === 'photos' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'photos' && styles.tabTextActive]}>Photos</Text>
          {totalCount > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{totalCount}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'diaries' && styles.tabActive]}
          onPress={() => setActiveTab('diaries')}
          data-testid="tab-diaries"
        >
          <Ionicons name="book" size={16} color={activeTab === 'diaries' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'diaries' && styles.tabTextActive]}>Travel Diaries</Text>
          {diaryTotalCount > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{diaryTotalCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {activeTab === 'photos' && (
        <ScrollView style={{flex: 1}} contentContainerStyle={styles.listContent}>
          <View style={styles.headerSection}>
            <Text style={styles.photoCount}>
              {totalCount} {totalCount === 1 ? 'photo' : 'photos'} from the community
            </Text>
            <View style={styles.sortRow} data-testid="sort-toggle">
              <TouchableOpacity
                style={[styles.sortBtn, sortBy === 'popular' && styles.sortBtnActive]}
                onPress={() => setSortBy('popular')}
                data-testid="sort-popular"
              >
                <Ionicons name="flame" size={14} color={sortBy === 'popular' ? '#fff' : theme.colors.textSecondary} />
                <Text style={[styles.sortBtnText, sortBy === 'popular' && styles.sortBtnTextActive]}>Most liked</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortBtn, sortBy === 'newest' && styles.sortBtnActive]}
                onPress={() => setSortBy('newest')}
                data-testid="sort-newest"
              >
                <Ionicons name="time" size={14} color={sortBy === 'newest' ? '#fff' : theme.colors.textSecondary} />
                <Text style={[styles.sortBtnText, sortBy === 'newest' && styles.sortBtnTextActive]}>Newest</Text>
              </TouchableOpacity>
            </View>
          </View>
          {photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {photos.map(item => (
                <View key={item.photo_id} style={{width: PHOTO_SIZE}}>
                  {renderPhoto({ item })}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer} data-testid="empty-state">
              <Ionicons name="camera-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No community photos yet</Text>
              <Text style={styles.emptySubtitle}>
                Visit landmarks in {countryName} and share your photos!
              </Text>
            </View>
          )}
          {isPreview && totalCount > 3 ? renderUpgradePrompt() : null}
        </ScrollView>
      )}
      {activeTab === 'diaries' && (
        <ScrollView style={{flex: 1}} contentContainerStyle={styles.diaryListContent}>
          <Text style={styles.diaryHeaderText}>
            {diaryTotalCount} {diaryTotalCount === 1 ? 'diary' : 'diaries'} shared by the community
          </Text>
          {diaries.length > 0 ? (
            diaries.map(item => (
              <View key={item.visit_id}>{renderDiaryCard({ item })}</View>
            ))
          ) : (
            <View style={styles.emptyContainer} data-testid="diary-empty-state">
              <Ionicons name="book-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No travel diaries yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to share your travel experiences from {countryName}!
              </Text>
            </View>
          )}
          {isDiaryPreview && diaryTotalCount > 2 ? renderDiaryUpgradePrompt() : null}
        </ScrollView>
      )}

      {/* Diary Modal */}
      <Modal
        visible={diaryModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setDiaryModal({ visible: false, text: '', userName: '' })}
      >
        <TouchableOpacity
          style={styles.diaryModalOverlay}
          activeOpacity={1}
          onPress={() => setDiaryModal({ visible: false, text: '', userName: '' })}
        >
          <View style={styles.diaryModalContent} data-testid="diary-modal">
            <View style={styles.diaryModalHeader}>
              <Ionicons name="book" size={20} color={theme.colors.primary} />
              <Text style={styles.diaryModalTitle}>Travel Diary</Text>
              <TouchableOpacity onPress={() => setDiaryModal({ visible: false, text: '', userName: '' })}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.diaryModalAuthor}>by {diaryModal.userName}</Text>
            <Text style={styles.diaryModalText}>{diaryModal.text}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  row: {
    gap: theme.spacing.md,
  },
  headerSection: {
    marginBottom: theme.spacing.lg,
  },
  countryTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
  },
  photoCount: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  tabBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  // Sort
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: theme.spacing.md,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  sortBtnTextActive: {
    color: '#fff',
  },
  // Diary tab
  diaryListContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  diaryHeaderText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.lg,
  },
  diaryCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  diaryCardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  diaryThumb: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  diaryCardMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  diaryCardUser: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  diaryCardHandle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  diaryCardLandmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  diaryCardLandmarkText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  diaryCardText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
  },
  diaryCardDate: {
    fontSize: 11,
    color: theme.colors.textLight,
    marginTop: 8,
    textAlign: 'right',
  },
  photoCard: {
    flex: 1,
    maxWidth: PHOTO_SIZE,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  photoImage: {
    width: '100%',
    height: PHOTO_SIZE,
    backgroundColor: theme.colors.background,
  },
  photoInfo: {
    padding: theme.spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  userAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  userAvatarPlaceholder: {
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  userHandle: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  landmarkTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(77, 184, 216, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  landmarkTagText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  upvoteCount: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  diaryButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(77, 184, 216, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 10,
    color: theme.colors.textLight,
  },
  diaryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  diaryModalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  diaryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  diaryModalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  diaryModalAuthor: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  diaryModalText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
  },
  upgradeCard: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
    ...theme.shadows.md,
  },
  upgradeGradient: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  upgradeTitle: {
    ...theme.typography.h3,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  upgradeSubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    fontSize: 13,
  },
  upgradeButton: {
    backgroundColor: '#fff',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.sm,
  },
  upgradeButtonText: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '600',
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
});
