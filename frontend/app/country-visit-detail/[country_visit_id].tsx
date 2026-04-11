import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  FlatList,
  Animated,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Modal as RNModal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { safeGoBack } from '../../utils/navigation';
import { Surface, Portal, Dialog, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import { invalidateCacheGroup } from '../../utils/apiCache';
import { useAuth } from '../../contexts/AuthContext';
import ProFeatureLock from '../../components/ProFeatureLock';
import PhotoViewer from '../../components/PhotoViewer';
import { KeyboardDoneBar } from '../../components/KeyboardDoneBar';
import UniversalHeader from '../../components/UniversalHeader';
import { getToken } from '../utils/token';
import { getCountryFlag } from '../utils/countryFlags';
import ShareVisitCard from '../../components/ShareVisitCard';

const { width, height } = Dimensions.get('window');


interface DestinationVisit {
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
export default function DestinationVisitDetailScreen() {
  const router = useRouter();
  const { country_visit_id } = useLocalSearchParams();
  const [visit, setVisit] = useState<DestinationVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProLock, setShowProLock] = useState(false);
  const { user } = useAuth();
  const isPro = user?.subscription_tier === 'pro' || user?.subscription_tier === 'basic_plus';
  const photoLimit = isPro ? 10 : 1;
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [editDiary, setEditDiary] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visitedLandmarks, setVisitedLandmarks] = useState<any[]>([]);
  const [customLandmarks, setCustomLandmarks] = useState<any[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchVisitDetails();
  }, [country_visit_id]);

  useEffect(() => {
    if (visit?.country_visit_id) {
      fetchVisitedLandmarks();
      fetchCustomLandmarks();
    }
  }, [visit?.country_visit_id]);

  const fetchCustomLandmarks = async () => {
    if (!visit?.country_id) return;
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/user-created-visits/by-country/${visit.country_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setCustomLandmarks(data.custom_landmarks || []);
      }
    } catch {}
  };

  const fetchVisitedLandmarks = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/country-visits/${country_visit_id}/landmarks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setVisitedLandmarks(data.landmarks || []);
      }
    } catch {
      // Failed to fetch visited landmarks
    }
  };

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
    } catch {
      // Failed to fetch visit details
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo library access to add photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        setUploadingPhotos(true);
        const newPhotos = result.assets
          .filter(asset => asset.base64)
          .map(asset => `data:image/jpeg;base64,${asset.base64}`);
        
        const existingPhotos = visit?.photos || [];
        const allPhotos = [...existingPhotos, ...newPhotos];
        
        const token = await getToken();
        const response = await fetch(
          `${BACKEND_URL}/api/country-visits/${country_visit_id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ photos: allPhotos }),
          }
        );

        if (response.ok) {
          const updated = await response.json();
          setVisit(updated);
          invalidateCacheGroup('visit');
          Alert.alert('Success', 'Photos added successfully!');
        } else {
          const err = await response.json().catch(() => null);
          Alert.alert('Error', err?.detail || 'Failed to add photos');
        }
        setUploadingPhotos(false);
      }
    } catch {
      setUploadingPhotos(false);
      Alert.alert('Error', 'Failed to add photos');
    }
  };

  const handleRemovePhoto = (photoIndex: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentPhotos = [...(visit?.photos || [])];
              currentPhotos.splice(photoIndex, 1);
              
              const token = await getToken();
              const response = await fetch(
                `${BACKEND_URL}/api/country-visits/${country_visit_id}`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ photos: currentPhotos }),
                }
              );

              if (response.ok) {
                const updated = await response.json();
                setVisit(updated);
                invalidateCacheGroup('visit');
                if (selectedPhotoIndex >= currentPhotos.length && currentPhotos.length > 0) {
                  setSelectedPhotoIndex(currentPhotos.length - 1);
                }
              } else {
                Alert.alert('Error', 'Failed to remove photo');
              }
            } catch {
              Alert.alert('Error', 'Failed to remove photo');
            }
          },
        },
      ]
    );
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
        invalidateCacheGroup('visit');
        setShowDeleteDialog(false);
        if (Platform.OS === 'web') {
          alert('Visit deleted successfully');
        } else {
          Alert.alert('Success', 'Visit deleted successfully');
        }
        router.replace('/(tabs)/journey');
      } else {
        const err = await response.json().catch(() => ({}));
        const msg = err.detail || 'Failed to delete visit';
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Cannot Delete', msg);
        }
      }
    } catch {
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
        const err = await response.json().catch(() => null);
        Alert.alert('Diary limit', err?.detail || 'Failed to update diary');
      }
    } catch {
      Alert.alert('Error', 'Failed to update diary');
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
        return { icon: 'globe-outline', label: 'Public' };
      case 'friends':
        return { icon: 'people-outline', label: 'Friends Only' };
      case 'private':
        return { icon: 'lock-closed-outline', label: 'Private' };
      default:
        return { icon: 'globe-outline', label: 'Public' };
    }
  };

  const [showShareCard, setShowShareCard] = useState(false);

  const handleShare = () => {
    setShowShareCard(true);
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
        <UniversalHeader title="Visit not found" />
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
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery with Swipe */}
        {visit.photos && visit.photos.length > 0 ? (
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

            {/* Photo Action Button */}
            <View style={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 8 }}>
              {(visit.photos?.length || 0) < photoLimit ? (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: theme.colors.primary + '15',
                    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
                  }}
                  onPress={() => {
                    Alert.alert('Add Photo', 'Choose a source', [
                      { text: 'Take Photo', onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') { Alert.alert('Permission Required', 'Please allow camera access.'); return; }
                        const result = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
                        if (!result.canceled && result.assets?.[0]?.base64) {
                          setUploadingPhotos(true);
                          try {
                            const newPhoto = `data:image/jpeg;base64,${result.assets[0].base64}`;
                            const all = [...(visit.photos || []), newPhoto];
                            const token = await getToken();
                            await fetch(`${BACKEND_URL}/api/country-visits/${country_visit_id}`, {
                              method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ photos: all }),
                            });
                            setVisit((prev: any) => prev ? { ...prev, photos: all } : prev);
                            invalidateCacheGroup('visit');
                          } catch { Alert.alert('Error', 'Could not take photo'); }
                          finally { setUploadingPhotos(false); }
                        }
                      }},
                      { text: 'Choose from Library', onPress: handleAddPhotos },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}
                  disabled={uploadingPhotos}
                >
                  {uploadingPhotos ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Ionicons name="camera" size={18} color={theme.colors.primary} />
                  )}
                  <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14 }}>
                    {uploadingPhotos ? 'Uploading...' : 'Add Photo'}
                  </Text>
                </TouchableOpacity>
              ) : !isPro ? (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: theme.colors.accentTeal + '15',
                    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
                  }}
                  onPress={() => setShowProLock(true)}
                >
                  <Ionicons name="camera" size={18} color={theme.colors.accentTeal} />
                  <Text style={{ color: theme.colors.accentTeal, fontWeight: '600', fontSize: 14 }}>Add More Photos</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.accentTeal + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Ionicons name="diamond" size={12} color={theme.colors.accentTeal} />
                    <Text style={{ color: theme.colors.accentTeal, fontSize: 11, fontWeight: '700' }}>PRO</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
              {(visit.photos?.length || 0) > 0 && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
                  onPress={() => handleRemovePhoto(selectedPhotoIndex)}
                >
                  <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                  <Text style={{ color: theme.colors.error, fontWeight: '500', fontSize: 12 }}>Remove Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <Surface style={[styles.infoCard, { alignItems: 'center', paddingVertical: 32 }]}>
            <Ionicons name="camera-outline" size={48} color={theme.colors.textLight} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 15, marginTop: 12, fontWeight: '600' }}>No photos added yet</Text>
            <Text style={{ color: theme.colors.textLight, fontSize: 13, marginTop: 4 }}>Add photos to this country visit</Text>
            <TouchableOpacity 
              style={{ 
                marginTop: 16, 
                backgroundColor: theme.colors.primary, 
                paddingHorizontal: 24, 
                paddingVertical: 10, 
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
              onPress={handleAddPhotos}
              disabled={uploadingPhotos}
            >
              {uploadingPhotos ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="add-circle" size={18} color="#fff" />
              )}
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                {uploadingPhotos ? 'Uploading...' : 'Add Photos'}
              </Text>
            </TouchableOpacity>
          </Surface>
        )}

        {/* Visit Info Card */}
        <Surface style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.infoLabel}>Points Earned</Text>
              <Text style={styles.infoValue}>{visit.points_earned}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name={visibilityInfo.icon as any} size={24} color={theme.colors.primary} />
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={async () => {
                  const newVal = !(visit.share_diary ?? true);
                  try {
                    const token = await getToken();
                    await fetch(`${BACKEND_URL}/api/country-visits/${country_visit_id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ share_diary: newVal }),
                    });
                    setVisit((prev: any) => prev ? { ...prev, share_diary: newVal } : prev);
                  } catch {
                    Alert.alert('Error', 'Could not update diary sharing');
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons
                  name={(visit.share_diary !== false) ? 'eye' : 'eye-off'}
                  size={18}
                  color={(visit.share_diary !== false) ? theme.colors.primary : theme.colors.textLight}
                />
                <Text style={{ fontSize: 12, fontWeight: '500', color: (visit.share_diary !== false) ? theme.colors.primary : theme.colors.textLight }}>
                  {(visit.share_diary !== false) ? 'Shared' : 'Hidden'}
                </Text>
              </TouchableOpacity>
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

        {/* Visited Landmarks in This Country */}
        <Surface style={[styles.diaryCard, { marginTop: theme.spacing.md }]}>
          <View style={styles.diaryHeader}>
            <View style={styles.diaryTitleRow}>
              <Ionicons name="location" size={22} color={theme.colors.accent} />
              <Text style={styles.diaryTitle}>Visited Landmarks</Text>
            </View>
          </View>
          {visitedLandmarks.length > 0 ? (
            <View>
              {visitedLandmarks.map((lm, index) => (
                <TouchableOpacity
                  key={lm.visit_id || index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: index < visitedLandmarks.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.border,
                  }}
                  onPress={() => router.push(`/visit-detail/${lm.visit_id}`)}
                  activeOpacity={0.7}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: theme.colors.primary + '15',
                    justifyContent: 'center', alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Ionicons name="location" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.text }}>{lm.landmark_name}</Text>
                    {lm.visited_at && (
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                        {new Date(lm.visited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>{lm.points_earned}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textLight} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Ionicons name="location-outline" size={32} color={theme.colors.textLight} />
              <Text style={{ color: theme.colors.textSecondary, marginTop: 8, fontSize: 14 }}>No landmarks visited yet</Text>
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

        {/* Custom Landmarks (from Custom Visits — PRO) */}
        {customLandmarks.length > 0 && (
          <Surface style={styles.diaryCard}>
            <View style={styles.diaryHeader}>
              <View style={styles.diaryTitleRow}>
                <Ionicons name="diamond" size={20} color="#1E8A8A" />
                <Text style={styles.diaryTitle}>Your Custom Landmarks</Text>
              </View>
              <View style={{ backgroundColor: '#E3F6FC', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#1E8A8A' }}>PRO</Text>
              </View>
            </View>
            <View>
              {customLandmarks.map((lm, index) => (
                <TouchableOpacity
                  key={`custom-${index}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: index < customLandmarks.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.border,
                  }}
                  onPress={() => lm.user_created_visit_id && router.push(`/custom-visit-detail/${lm.user_created_visit_id}`)}
                  activeOpacity={0.7}
                  data-testid={`custom-landmark-${index}`}
                >
                  {lm.photo ? (
                    <Image
                      source={{ uri: lm.photo }}
                      style={{ width: 40, height: 40, borderRadius: 10, marginRight: 12 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{
                      width: 40, height: 40, borderRadius: 10,
                      backgroundColor: '#1E8A8A' + '15',
                      justifyContent: 'center', alignItems: 'center',
                      marginRight: 12,
                    }}>
                      <Ionicons name="diamond" size={18} color="#1E8A8A" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.text }}>{lm.name}</Text>
                    {lm.visited_at && (
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                        {new Date(lm.visited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textLight} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              ))}
            </View>
          </Surface>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

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
            <Text>Are you sure? This will remove the country as visited and delete all associated photos, diary entries and points. This cannot be undone.</Text>
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

      <ProFeatureLock
        visible={showProLock}
        onClose={() => setShowProLock(false)}
        feature="unlimited_photos"
      />

      {visit && (
        <ShareVisitCard
          visible={showShareCard}
          onDismiss={() => setShowShareCard(false)}
          visitName={visit.country_name}
          locationName={visit.country_name}
          points={visit.points_earned}
          photoUrl={visit.photos?.length > 0 ? visit.photos[0] : undefined}
          diary={(visit.share_diary !== false) ? (visit.diary || undefined) : undefined}
          visitType="destination"
        />
      )}

      {/* Edit Diary Modal */}
      <RNModal
        visible={showEditDialog}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditDialog(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowEditDialog(false); }}>
                    <Text style={{ fontSize: 15, color: theme.colors.textSecondary }}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text }}>Edit Diary</Text>
                  <TouchableOpacity 
                    onPress={() => { Keyboard.dismiss(); handleSaveDiary(); }}
                    disabled={saving}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.primary }}>{saving ? 'Saving...' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 15,
                    minHeight: 150,
                    maxHeight: 250,
                    color: theme.colors.text,
                    textAlignVertical: 'top',
                    backgroundColor: theme.colors.background,
                  }}
                  value={editDiary}
                  onChangeText={setEditDiary}
                  placeholder="Write about your experience..."
                  placeholderTextColor={theme.colors.textLight}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </RNModal>
      <KeyboardDoneBar />
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
