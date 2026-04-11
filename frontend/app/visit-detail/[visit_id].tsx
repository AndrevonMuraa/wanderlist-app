import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, Platform, TouchableOpacity, Alert, TextInput, ActivityIndicator, Modal as RNModal, KeyboardAvoidingView, Keyboard } from 'react-native';
import { Text, Surface, Portal, Dialog, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import { lightHaptic } from '../../utils/haptics';
import { invalidateCacheGroup } from '../../utils/apiCache';
import { shareVisit } from '../../utils/shareUtils';
import ReportButton from '../../components/ReportButton';
import CommentsSection from '../../components/CommentsSection';
import { useAuth } from '../../contexts/AuthContext';
import ProFeatureLock from '../../components/ProFeatureLock';
import PhotoViewer from '../../components/PhotoViewer';
import ShareVisitCard from '../../components/ShareVisitCard';

import { KeyboardDoneBar } from '../../components/KeyboardDoneBar';
import UniversalHeader from '../../components/UniversalHeader';
import { getToken } from '../utils/token';

const { width } = Dimensions.get('window');

const VISIBILITY_META: Record<string, { icon: string; label: string; color: string }> = {
  public: { icon: 'globe-outline', label: 'Public', color: '#27ae60' },
  friends: { icon: 'people-outline', label: 'Friends Only', color: '#3498db' },
  private: { icon: 'lock-closed-outline', label: 'Private', color: '#e74c3c' },
};


interface VisitDetail {
  visit_id: string;
  user_id?: string;
  landmark_id: string;
  landmark_name?: string;
  country_name?: string;
  photo_base64?: string;
  photos?: string[];
  diary_notes?: string;
  diary?: string;
  comments?: string;
  points_earned: number;
  visited_at: string;
  verified: boolean;
  visibility?: string;
  share_diary?: boolean;
  activity_id?: string;
  comments_count?: number;
}

export default function VisitDetailScreen() {
  const { visit_id } = useLocalSearchParams();
  const { user } = useAuth();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [currentVisibility, setCurrentVisibility] = useState<string>('public');
  const [commentsCount, setCommentsCount] = useState(0);
  const [showEditDiaryDialog, setShowEditDiaryDialog] = useState(false);
  const [editDiary, setEditDiary] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showProLock, setShowProLock] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [showShareCard, setShowShareCard] = useState(false);
  const router = useRouter();
  const isOwner = user?.user_id === visit?.user_id;
  const isPro = user?.subscription_tier === 'pro' || user?.subscription_tier === 'basic_plus';
  const photoLimit = isPro ? 10 : 1;

  useEffect(() => {
    fetchVisitDetails();
  }, []);

  const fetchVisitDetails = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/visits/${visit_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setVisit(data);
        setCurrentVisibility(data.visibility || 'public');
        setCommentsCount(data.comments_count || 0);
      }
    } catch {
      // Visit fetch failed
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    setShowShareCard(true);
  };

  const handleChangeVisibility = async (newVisibility: string) => {
    if (newVisibility === currentVisibility) return;
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/visits/${visit_id}/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ visibility: newVisibility }),
      });
      if (response.ok) {
        setCurrentVisibility(newVisibility);
        await lightHaptic();
      }
    } catch {
      // Visibility update failed
    }
  };

  const handleSaveDiary = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/visits/${visit_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ diary_notes: editDiary }),
      });
      if (res.ok) {
        setVisit(prev => prev ? { ...prev, diary_notes: editDiary, diary: editDiary } : prev);
        setShowEditDiaryDialog(false);
        invalidateCacheGroup('visit');
      } else {
        const err = await res.json();
        Alert.alert('Diary limit', err.detail || 'Could not save diary');
      }
    } catch {
      Alert.alert('Error', 'Could not update diary');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleShareDiary = async () => {
    const newVal = !(visit?.share_diary ?? true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/visits/${visit_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ share_diary: newVal }),
      });
      if (res.ok) {
        setVisit(prev => prev ? { ...prev, share_diary: newVal } : prev);
      }
    } catch {
      Alert.alert('Error', 'Could not update diary sharing');
    }
  };

  const handleAddPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo library access.');
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
          .filter(a => a.base64)
          .map(a => `data:image/jpeg;base64,${a.base64}`);
        const existing = visit?.photos || [];
        const all = [...existing, ...newPhotos].slice(0, 10);
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/visits/${visit_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ photos: all }),
        });
        if (res.ok) {
          setVisit(prev => prev ? { ...prev, photos: all } : prev);
          invalidateCacheGroup('visit');
        }
      }
    } catch {
      Alert.alert('Error', 'Could not add photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
      if (!result.canceled && result.assets?.[0]?.base64) {
        setUploadingPhotos(true);
        const newPhoto = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const existing = visit?.photos || [];
        const all = [...existing, newPhoto].slice(0, 10);
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/visits/${visit_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ photos: all }),
        });
        if (res.ok) {
          setVisit(prev => prev ? { ...prev, photos: all } : prev);
          invalidateCacheGroup('visit');
        }
      }
    } catch {
      Alert.alert('Error', 'Could not take photo');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/visits/${visit_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        invalidateCacheGroup('visit');
        Alert.alert('Deleted', 'Visit has been removed.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/journey') },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Could not delete visit');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading visit details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textLight} />
          <Text style={styles.errorText}>Visit not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const photos = visit.photos || (visit.photo_base64 ? [visit.photo_base64] : []);

  return (
    <View style={styles.container}>
      <UniversalHeader 
        title={visit.landmark_name || 'Visit Details'}
      />
      <ScrollView style={styles.scrollView}>

        {/* Photo Gallery or Add Photo CTA */}
        {photos.length > 0 ? (
          <View style={styles.photoSection}>
            <TouchableOpacity
              onPress={async () => {
                await lightHaptic();
                setFullscreenIndex(selectedPhoto);
                setShowFullscreen(true);
              }}
              activeOpacity={0.9}
              style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden', position: 'relative' }}
            >
              <Image
                source={{ uri: photos[selectedPhoto] }}
                style={styles.mainPhoto}
                resizeMode="cover"
              />
              {/* Tap to zoom hint */}
              <View style={styles.zoomHint}>
                <Ionicons name="expand-outline" size={16} color="#fff" />
                <Text style={styles.zoomHintText}>Tap to zoom</Text>
              </View>
              {photos.length > 1 && (
                <View style={styles.photoCountBadge}>
                  <Ionicons name="images" size={16} color="#fff" />
                  <Text style={styles.photoCountText}>{photos.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoThumbnails}
            >
              {photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={async () => {
                    await lightHaptic();
                    setSelectedPhoto(index);
                  }}
                  onLongPress={() => {
                    if (!isOwner) return;
                    const isLastPhoto = photos.length === 1;
                    Alert.alert(
                      isLastPhoto ? 'Remove Last Photo?' : 'Remove Photo?',
                      isLastPhoto
                        ? 'This will change your visit status to unverified and remove verified points.'
                        : 'This photo will be removed from your visit.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: async () => {
                            const updated = photos.filter((_, i) => i !== index);
                            const token = await getToken();
                            const res = await fetch(`${BACKEND_URL}/api/visits/${visit_id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ photos: updated }),
                            });
                            if (res.ok) {
                              setVisit(prev => prev ? { ...prev, photos: updated, verified: updated.length > 0 } : prev);
                              setSelectedPhoto(0);
                              invalidateCacheGroup('visit');
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Image
                    source={{ uri: photo }}
                    style={[
                      styles.thumbnail,
                      selectedPhoto === index && styles.thumbnailActive
                    ]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            {isOwner && photos.length > 0 && (
              <Text style={{ fontSize: 11, color: theme.colors.textLight, textAlign: 'center', marginTop: 4 }}>
                Long-press a photo to remove it
              </Text>
            )}
            {/* Photo Action Button - matching country-visit-detail pattern */}
            {isOwner && (
              <View style={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 8 }}>
                {photos.length < photoLimit ? (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      backgroundColor: theme.colors.primary + '15',
                      paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
                    }}
                    onPress={() => {
                      Alert.alert('Add Photo', 'Choose a source', [
                        { text: 'Take Photo', onPress: handleTakePhoto },
                        { text: 'Choose from Library', onPress: handleAddPhotos },
                        { text: 'Cancel', style: 'cancel' },
                      ]);
                    }}
                    disabled={uploadingPhotos}
                    data-testid="add-photo-action-btn"
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
                    data-testid="add-more-photos-pro-btn"
                  >
                    <Ionicons name="camera" size={18} color={theme.colors.accentTeal} />
                    <Text style={{ color: theme.colors.accentTeal, fontWeight: '600', fontSize: 14 }}>Add More Photos</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.accentTeal + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                      <Ionicons name="diamond" size={12} color={theme.colors.accentTeal} />
                      <Text style={{ color: theme.colors.accentTeal, fontSize: 11, fontWeight: '700' }}>PRO</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        ) : isOwner ? (
          <View style={{
            marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden',
            backgroundColor: '#E3F6FC', padding: 28, alignItems: 'center', gap: 10,
            borderWidth: 2, borderColor: theme.colors.primary, borderStyle: 'dashed',
          }}>
            {uploadingPhotos ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={40} color={theme.colors.primary} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.primary }}>Add Photo to Verify</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 18 }}>
                  Add a personal photo to earn verified points for the global leaderboard
                </Text>
              </>
            )}
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Add Photo', 'Choose a source', [
                  { text: 'Take Photo', onPress: handleTakePhoto },
                  { text: 'Choose from Library', onPress: handleAddPhotos },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
              disabled={uploadingPhotos}
              activeOpacity={0.7}
              style={{
                marginTop: 8,
                backgroundColor: theme.colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 10,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
              data-testid="add-photo-empty-btn"
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Add Photo</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Visit Info */}
        <View style={styles.infoCard}>
          {visit.country_name && (
            <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 12, textAlign: 'center' }}>
              {visit.country_name}
            </Text>
          )}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="star" size={20} color={theme.colors.accentYellow} />
              <Text style={styles.infoLabel}>Points</Text>
              <Text style={styles.infoValue}>+{visit.points_earned}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons 
                name={visit.verified ? "shield-checkmark" : "shield-outline"} 
                size={20} 
                color={visit.verified ? '#4CAF50' : '#FFA726'} 
              />
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, { color: visit.verified ? '#4CAF50' : '#FFA726' }]}>
                {visit.verified ? 'Verified' : 'Unverified'}
              </Text>
            </View>
          </View>
          {!visit.verified && isOwner && photos.length === 0 && (
            <Text style={{ fontSize: 11, color: '#FFA726', textAlign: 'center', marginTop: 8 }}>
              Add a photo to earn verified points
            </Text>
          )}
        </View>

        {/* Travel Diary */}
        {(visit.diary_notes || visit.diary || isOwner) && (
          <View style={styles.diaryCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={styles.sectionHeader}>
                <Ionicons name="journal" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Travel Diary</Text>
              </View>
              {isOwner && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={handleToggleShareDiary} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons
                      name={(visit.share_diary !== false) ? 'eye' : 'eye-off'}
                      size={18}
                      color={(visit.share_diary !== false) ? theme.colors.primary : theme.colors.textLight}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '500', color: (visit.share_diary !== false) ? theme.colors.primary : theme.colors.textLight }}>
                      {(visit.share_diary !== false) ? 'Shared' : 'Hidden'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setEditDiary(visit.diary_notes || visit.diary || ''); setShowEditDiaryDialog(true); }}>
                    <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {(visit.diary_notes || visit.diary) ? (
              <Text style={styles.diaryText}>{visit.diary_notes || visit.diary}</Text>
            ) : isOwner ? (
              <TouchableOpacity onPress={() => setShowEditDiaryDialog(true)}>
                <Text style={{ fontSize: 14, color: theme.colors.textLight, fontStyle: 'italic', paddingVertical: 8 }}>Tap to add diary notes...</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Visibility Control */}
        <View style={styles.visibilityCard} data-testid="visit-visibility-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Visibility</Text>
          </View>
          <View style={styles.visibilityRow}>
            {Object.entries(VISIBILITY_META).map(([key, meta]) => {
              const isActive = currentVisibility === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.visChip, isActive && { borderColor: meta.color, backgroundColor: meta.color + '15' }]}
                  onPress={() => handleChangeVisibility(key)}
                  activeOpacity={0.7}
                  data-testid={`visit-visibility-${key}`}
                >
                  <Ionicons name={meta.icon as any} size={16} color={isActive ? meta.color : theme.colors.textLight} />
                  <Text style={[styles.visChipText, isActive && { color: meta.color, fontWeight: '700' }]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Comments */}
        {visit.comments && (
          <View style={styles.commentsCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Quick Notes</Text>
            </View>
            <Text style={styles.commentsText}>{visit.comments}</Text>
          </View>
        )}

        {/* Social Comments Section */}
        {visit.activity_id && user && (
          <View style={styles.socialCommentsCard} data-testid="comments-section">
            <CommentsSection
              activityId={visit.activity_id}
              commentsCount={commentsCount}
              currentUserId={user.user_id}
              onCommentsChange={setCommentsCount}
            />
          </View>
        )}

        {/* Share Visit */}
        <TouchableOpacity
          style={styles.shareVisitButton}
          onPress={handleShare}
          activeOpacity={0.7}
          data-testid="share-visit-button"
        >
          <Ionicons name="share-social-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.shareVisitText}>Share This Visit</Text>
        </TouchableOpacity>

        {/* Delete Visit */}
        {isOwner && (
          <TouchableOpacity
            onPress={() => setShowDeleteDialog(true)}
            style={styles.deleteVisitButton}
            activeOpacity={0.7}
            data-testid="delete-visit-button"
          >
            <Ionicons name="trash-outline" size={16} color="#E53935" />
            <Text style={styles.deleteVisitText}>Delete Visit</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <KeyboardDoneBar />
      
      {/* Edit Diary Modal */}
      <RNModal
        visible={showEditDiaryDialog}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditDiaryDialog(false)}
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
                  <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowEditDiaryDialog(false); }}>
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
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </RNModal>

      {/* Delete Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Visit</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure? This will remove the landmark as visited and permanently delete all associated photos, diary entries, comments, likes, and points. This cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onPress={handleDelete} loading={deleting} textColor="#E53935">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <PhotoViewer
        visible={showFullscreen}
        photos={photos}
        initialIndex={fullscreenIndex}
        onClose={() => setShowFullscreen(false)}
        onPhotosUpdate={(newPhotos) => {
          setVisit(prev => prev ? { ...prev, photos: newPhotos } : null);
        }}
        editable={isOwner}
      />

      <ProFeatureLock
        visible={showProLock}
        onClose={() => setShowProLock(false)}
        feature="unlimited_photos"
      />

      {visit && (
        <ShareVisitCard
          visible={showShareCard}
          onDismiss={() => setShowShareCard(false)}
          visitName={visit.landmark_name || 'Landmark'}
          locationName={visit.country_name || ''}
          points={visit.points_earned}
          photoUrl={photos.length > 0 ? photos[0] : undefined}
          diary={(visit.share_diary !== false) ? (visit.diary_notes || visit.diary || undefined) : undefined}
          visitType="landmark"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  photoSection: {
    backgroundColor: '#000',
  },
  mainPhoto: {
    width: width - 32,
    height: (width - 32) * 0.65,
    borderRadius: 16,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 12,
    left: 12,
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
  photoThumbnails: {
    padding: theme.spacing.sm,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    opacity: 0.6,
  },
  thumbnailActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  infoCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  diaryCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  visibilityCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  visChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textLight,
  },
  commentsCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  socialCommentsCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  diaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.text,
  },
  commentsText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: theme.spacing.xl * 2,
  },
  shareVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  shareVisitText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  deleteVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: theme.spacing.xl * 2,
    marginTop: theme.spacing.md,
  },
  deleteVisitText: {
    fontSize: 13,
    color: '#E53935',
  },
  addPhotoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  actionsCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    elevation: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  actionBtn: {
    alignItems: 'center',
    padding: 12,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: 4,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  uploadingText: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
});
