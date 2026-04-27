import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Dimensions, Alert, Modal } from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';
import { useSubscription } from '../../hooks/useSubscription';
import { BACKEND_URL } from '../../utils/config';
import UniversalHeader from '../../components/UniversalHeader';
import ContentMenu from '../../components/ContentMenu';
import { getToken } from '../../utils/token';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - theme.spacing.lg * 3) / 2;


interface CommunityPhoto {
  photo_id: string;
  photo_url: string;
  visit_id: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  username?: string;
  visited_at?: string;
  comments?: string;
  diary_notes?: string;
  has_diary?: boolean;
  upvotes: number;
  user_upvoted: boolean;
}

export default function LandmarkCommunityPhotosScreen() {
  const { landmark_id, name, country } = useLocalSearchParams();
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [diaryLocked, setDiaryLocked] = useState(false);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular');
  const [diaryModal, setDiaryModal] = useState<{ visible: boolean; text: string; userName: string }>({ visible: false, text: '', userName: '' });
  const router = useRouter();
  const { subscription_tier } = useSubscription();
  const isPremium = subscription_tier === 'pro';

  useEffect(() => {
    fetchPhotos();
  }, [sortBy]);

  const fetchPhotos = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/landmarks/${landmark_id}/community-photos?sort=${sortBy}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos);
        setTotalCount(data.total_count);
        setDiaryLocked(data.diary_locked || false);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (photoId: string) => {
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
    }
  };

  const renderPhoto = useCallback(({ item }: { item: CommunityPhoto }) => (
    <Surface style={styles.photoCard} data-testid={`community-photo-${item.photo_id}`}>
      <Image source={{ uri: item.photo_url }} style={styles.photoImage} resizeMode="cover" />
      <View style={styles.photoInfo}>
        <TouchableOpacity style={styles.userRow} onPress={() => router.push(`/user-profile/${item.user_id}`)} activeOpacity={0.7}>
          {item.user_picture ? (
            <Image source={{ uri: item.user_picture }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
              <Ionicons name="person" size={12} color={theme.colors.textSecondary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.user_name}
            </Text>
            {item.username && (
              <Text style={styles.userHandle} numberOfLines={1}>@{item.username}</Text>
            )}
          </View>
        </TouchableOpacity>
        {item.comments && (
          <Text style={styles.comment} numberOfLines={2}>{item.comments}</Text>
        )}
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
            {item.has_diary && !diaryLocked && (
              <TouchableOpacity
                onPress={() => setDiaryModal({ visible: true, text: item.diary_notes || '', userName: item.user_name })}
                style={styles.diaryButton}
                data-testid={`diary-btn-${item.photo_id}`}
              >
                <Ionicons name="book-outline" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
            {item.has_diary && diaryLocked && (
              <View style={[styles.diaryButton, { opacity: 0.5 }]}>
                <Ionicons name="lock-closed" size={14} color={theme.colors.textLight} />
              </View>
            )}
            <ContentMenu
              contentType="photo"
              contentId={item.visit_id}
              contentName="Community photo"
              ownerId={item.user_id}
              ownerName={item.user_name}
              isOwnContent={user?.user_id === item.user_id}
              variant="subtle"
              testID={`content-menu-${item.photo_id}`}
            />
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
            ? `+${totalCount - 3} more photos`
            : 'Unlock Full Gallery'}
        </Text>
        <Text style={styles.upgradeSubtitle}>
          Upgrade to Premium to see all community photos
        </Text>
        <TouchableOpacity style={styles.upgradeButton} data-testid="upgrade-button">
          <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Surface>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="Community photos" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniversalHeader title="Community photos" />

      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={item => item.photo_id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text style={styles.landmarkName} data-testid="landmark-name">
              {name || 'Landmark'}
            </Text>
            <Text style={styles.countryName}>{country || ''}</Text>
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
        }
        ListFooterComponent={null}
        ListEmptyComponent={
          <View style={styles.emptyContainer} data-testid="empty-state">
            <Ionicons name="camera-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No community photos yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to share a photo from this landmark!
            </Text>
          </View>
        }
      />

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
  landmarkName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
  },
  countryName: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  photoCount: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
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
  photoCard: {
    width: '100%',
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  photoImage: {
    width: '100%',
    aspectRatio: 1,
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
  comment: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 15,
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
