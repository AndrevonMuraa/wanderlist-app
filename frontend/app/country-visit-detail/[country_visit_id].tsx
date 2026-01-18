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
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Surface, Portal, Dialog, Button } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import PhotoViewer from '../../components/PhotoViewer';
import UniversalHeader from '../../components/UniversalHeader';

const { width, height } = Dimensions.get('window');

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [editDiary, setEditDiary] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
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
        setEditDiary(data.diary || '');
      }
    } catch (error) {
      console.error('Error fetching country visit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/country-visits/${country_visit_id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setShowDeleteDialog(false);
        // Navigate back with success message
        if (Platform.OS === 'web') {
          alert('Visit deleted successfully');
        } else {
          Alert.alert('Success', 'Visit deleted successfully');
        }
        router.back();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting visit:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete visit');
      } else {
        Alert.alert('Error', 'Failed to delete visit');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveDiary = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/country-visits/${country_visit_id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ diary: editDiary }),
        }
      );

      if (response.ok) {
        setVisit(prev => prev ? { ...prev, diary: editDiary } : null);
        setShowEditDialog(false);
        if (Platform.OS === 'web') {
          alert('Diary updated!');
        } else {
          Alert.alert('Success', 'Diary updated!');
        }
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error updating diary:', error);
      if (Platform.OS === 'web') {
        alert('Failed to update diary');
      } else {
        Alert.alert('Error', 'Failed to update diary');
      }
    } finally {
      setSaving(false);
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

  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setShowFullscreen(true);
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
      <View style={styles.container}>
        <UniversalHeader title="Loading..." />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading visit...</Text>
        </View>
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="Visit Not Found" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.colors.textLight} />
          <Text style={styles.errorText}>This visit could not be found</Text>
        </View>
      </View>
    );
  }

  const visibilityInfo = getVisibilityInfo(visit.visibility);

  return (
    <View style={styles.container}>
      <UniversalHeader 
        title={visit.country_name}
        rightElement={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowOptionsMenu(true)} style={styles.headerIconBtn}>
              <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery with Swipe */}
        {visit.photos && visit.photos.length > 0 && (
          <View style={styles.gallerySection}>
            {/* Swipeable Photo Gallery */}
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => openFullscreen(selectedPhotoIndex)}
              style={styles.mainPhotoContainer}
            >
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

              {/* Tap to zoom hint */}
              <View style={styles.zoomHint}>
                <Ionicons name="expand-outline" size={16} color="#fff" />
                <Text style={styles.zoomHintText}>Tap to zoom</Text>
              </View>

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
            </TouchableOpacity>

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
        <Surface style={styles.diaryCard}>
          <View style={styles.diaryHeader}>
            <View style={styles.diaryTitleRow}>
              <Ionicons name="book" size={22} color={theme.colors.primary} />
              <Text style={styles.diaryTitle}>Travel Diary</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setEditDiary(visit.diary || '');
                setShowEditDialog(true);
              }}
              style={styles.editDiaryBtn}
            >
              <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          {visit.diary ? (
            <Text style={styles.diaryText}>{visit.diary}</Text>
          ) : (
            <View style={styles.emptyDiary}>
              <Ionicons name="book-outline" size={32} color={theme.colors.textLight} />
              <Text style={styles.emptyDiaryText}>No diary entry yet</Text>
              <TouchableOpacity 
                style={styles.addDiaryBtn}
                onPress={() => {
                  setEditDiary('');
                  setShowEditDialog(true);
                }}
              >
                <Text style={styles.addDiaryText}>+ Add Entry</Text>
              </TouchableOpacity>
            </View>
          )}
        </Surface>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.shareCard} onPress={handleShare} activeOpacity={0.8}>
            <LinearGradient
              colors={[theme.colors.primary, '#2AA8B3']}
              style={styles.shareGradient}
            >
              <Ionicons name="share-social" size={22} color="#fff" />
              <Text style={styles.shareText}>Share This Memory</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => setShowDeleteDialog(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            <Text style={styles.deleteText}>Delete Visit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsMenu}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                handleShare();
              }}
            >
              <Ionicons name="share-social-outline" size={22} color={theme.colors.text} />
              <Text style={styles.optionText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setEditDiary(visit.diary || '');
                setShowEditDialog(true);
              }}
            >
              <Ionicons name="create-outline" size={22} color={theme.colors.text} />
              <Text style={styles.optionText}>Edit Diary</Text>
            </TouchableOpacity>
            
            <View style={styles.optionDivider} />
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowDeleteDialog(true);
              }}
            >
              <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
              <Text style={[styles.optionText, { color: theme.colors.error }]}>Delete Visit</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Photo Viewer with Pinch-to-Zoom and Rotate */}
      <PhotoViewer
        visible={showFullscreen}
        photos={visit.photos}
        initialIndex={fullscreenIndex}
        onClose={() => setShowFullscreen(false)}
        onPhotosUpdate={(newPhotos) => {
          setVisit(prev => prev ? { ...prev, photos: newPhotos } : null);
        }}
        editable={true}
      />

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Visit?</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this country visit? This action cannot be undone and you will lose {visit.points_earned} points.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)} disabled={deleting}>Cancel</Button>
            <Button 
              onPress={handleDelete} 
              textColor={theme.colors.error}
              loading={deleting}
              disabled={deleting}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit Diary Dialog */}
      <Portal>
        <Dialog visible={showEditDialog} onDismiss={() => setShowEditDialog(false)}>
          <Dialog.Title>Edit Travel Diary</Dialog.Title>
          <Dialog.Content>
            <TextInput
              style={styles.diaryInput}
              value={editDiary}
              onChangeText={setEditDiary}
              placeholder="Write about your experience..."
              placeholderTextColor={theme.colors.textLight}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowEditDialog(false)} disabled={saving}>Cancel</Button>
            <Button 
              onPress={handleSaveDiary}
              loading={saving}
              disabled={saving}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
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
  zoomHint: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoomHintText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
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
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  diaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  diaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  editDiaryBtn: {
    padding: theme.spacing.xs,
  },
  diaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  emptyDiary: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  emptyDiaryText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.textLight,
  },
  addDiaryBtn: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceTinted,
    borderRadius: theme.borderRadius.md,
  },
  addDiaryText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  diaryInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 15,
    color: theme.colors.text,
    minHeight: 120,
    backgroundColor: theme.colors.background,
  },
  // Action Buttons
  actionButtons: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  shareCard: {
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'transparent',
  },
  deleteText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
  // Options Menu
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: theme.spacing.md,
  },
  optionsMenu: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.sm,
    minWidth: 180,
    ...theme.shadows.md,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  optionDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  // Fullscreen
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeFullscreen: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCounter: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  fullscreenCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fullscreenImageContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: width,
    height: height * 0.7,
  },
  fullscreenArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullscreenArrowLeft: {
    left: 10,
  },
  fullscreenArrowRight: {
    right: 10,
  },
  fullscreenThumbnails: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  fullscreenThumbnailContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    justifyContent: 'center',
  },
  fullscreenThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.6,
  },
  fullscreenThumbActive: {
    borderColor: '#fff',
    opacity: 1,
  },
  fullscreenThumbImage: {
    width: '100%',
    height: '100%',
  },
});
