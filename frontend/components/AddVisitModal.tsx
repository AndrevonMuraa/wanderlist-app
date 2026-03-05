import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme, { gradients } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../hooks/useSubscription';
import { useRouter } from 'expo-router';

interface AddVisitModalProps {
  visible: boolean;
  onClose: () => void;
  landmarkName: string;
  landmarkId: string;
  onSubmit: (data: {
    photos: string[];
    diary_notes: string;
    share_diary: boolean;
    visibility?: string;
  }) => void;
  isPremium: boolean;
  defaultPrivacy?: 'public' | 'friends' | 'private';
}

const VISIBILITY_OPTIONS = [
  { value: 'public' as const, icon: 'globe-outline' as const, label: 'Public' },
  { value: 'friends' as const, icon: 'people-outline' as const, label: 'Friends Only' },
  { value: 'private' as const, icon: 'lock-closed-outline' as const, label: 'Private' },
];

export default function AddVisitModal({
  visible,
  onClose,
  landmarkName,
  onSubmit,
  isPremium,
  defaultPrivacy = 'public',
}: AddVisitModalProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [diaryText, setDiaryText] = useState('');
  const [shareDiary, setShareDiary] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>(defaultPrivacy);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Get subscription limits
  const subscriptionData = useSubscription();
  const maxPhotos = subscriptionData.maxPhotosPerVisit;
  const isProUser = subscriptionData.isPro;
  
  // Calculate safe area padding
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  const canAddMore = photos.length < maxPhotos;

  const showPhotoLimitAlert = () => {
    if (!isProUser) {
      Alert.alert(
        'Photo Limit Reached',
        `Free users can add up to ${maxPhotos} photo per visit. Upgrade to Pro for up to 10 photos!`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => { onClose(); router.push('/subscription'); }}
        ]
      );
    } else {
      Alert.alert('Limit Reached', `You can add up to ${maxPhotos} photos per visit`);
    }
  };

  const takePhoto = async () => {
    if (!canAddMore) { showPhotoLimitAlert(); return; }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Access', 'Please allow camera access in your device settings to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setPhotos([...photos, `data:image/jpeg;base64,${result.assets[0].base64}`]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImages = async () => {
    if (!canAddMore) { showPhotoLimitAlert(); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: isProUser,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled) {
        const newPhotos = result.assets
          .slice(0, maxPhotos - photos.length)
          .map((asset) => `data:image/jpeg;base64,${asset.base64}`);
        setPhotos([...photos, ...newPhotos]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      Alert.alert(
        'Record Without Photo?',
        'Visits without a personal photo will not earn verified points for the global leaderboard.\n\nTo earn verified points, add a photo of yourself at the landmark.',
        [
          { text: 'Add Photo', style: 'cancel' },
          { text: 'Record Anyway', onPress: async () => { await submitVisit(); } },
        ]
      );
      return;
    }

    await submitVisit();
  };

  const submitVisit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        photos,
        diary_notes: diaryText,
        share_diary: shareDiary,
        visibility,
      });
      // Reset form
      setPhotos([]);
      setDiaryText('');
      setShareDiary(true);
      setVisibility(defaultPrivacy);
    } catch (error) {
      console.error('Error submitting visit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header with Ocean to Sand gradient */}
        <LinearGradient
          colors={gradients.oceanToSand}
          start={gradients.horizontal.start}
          end={gradients.horizontal.end}
          style={[styles.header, { paddingTop: topPadding }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle} numberOfLines={1}>Visit {landmarkName}</Text>
                <Text style={styles.headerSubtitle}>Share your experience</Text>
              </View>
            </View>
            <View style={styles.brandingContainer}>
              <Ionicons name="earth" size={16} color="#2A2A2A" />
              <Text style={styles.brandingText}>WanderMark</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Photos Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Photos ({photos.length}/{maxPhotos})</Text>
              {!isProUser && (
                <TouchableOpacity 
                  style={styles.upgradePhotoHint}
                  onPress={() => {
                    onClose();
                    router.push('/subscription');
                  }}
                >
                  <Ionicons name="diamond" size={12} color="#1E8A8A" />
                  <Text style={styles.upgradePhotoHintText}>Get 10 photos</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Photo verification guidelines */}
            <View style={styles.photoGuidelines} data-testid="photo-guidelines">
              <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
              <Text style={styles.photoGuidelinesText}>
                Take a personal photo of yourself at the landmark to earn verified points. Photos without you in them may result in verified points being removed.
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
              {canAddMore && (
                <View style={styles.photoButtonsColumn}>
                  <TouchableOpacity style={styles.cameraButton} onPress={takePhoto} data-testid="take-photo-btn">
                    <Ionicons name="camera" size={28} color="#fff" />
                    <Text style={styles.cameraButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.libraryButton} onPress={pickImages} data-testid="pick-photo-btn">
                    <Ionicons name="images-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.libraryButtonText}>Choose from Library</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!canAddMore && !isProUser && (
                <TouchableOpacity 
                  style={styles.addPhotoButtonLocked}
                  onPress={() => {
                    onClose();
                    router.push('/subscription');
                  }}
                >
                  <Ionicons name="lock-closed" size={24} color="#1E8A8A" />
                  <Text style={styles.addPhotoTextLocked}>Upgrade</Text>
                  <Text style={styles.addPhotoSubtext}>for more</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Library disclaimer */}
            {photos.length > 0 && (
              <View style={styles.photoDisclaimer} data-testid="photo-disclaimer">
                <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.photoDisclaimerText}>
                  Only personal photos where you are visible count toward verified points. Using photos from the internet or without yourself in them may lead to removal of verified points.
                </Text>
              </View>
            )}
          </View>

          {/* Travel Diary Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travel Diary (Optional)</Text>
            <TextInput
              style={styles.diaryInput}
              placeholder={`Share your experience at ${landmarkName}...`}
              placeholderTextColor={theme.colors.textLight}
              value={diaryText}
              onChangeText={setDiaryText}
              multiline
              numberOfLines={6}
              maxLength={2000}
            />
            <Text style={styles.charCounter}>{diaryText.length}/2000</Text>
            {diaryText.trim().length > 0 && (
              <TouchableOpacity
                style={styles.shareDiaryToggle}
                onPress={() => setShareDiary(!shareDiary)}
                data-testid="share-diary-toggle"
                activeOpacity={0.7}
              >
                <Ionicons
                  name={shareDiary ? 'eye' : 'eye-off'}
                  size={18}
                  color={shareDiary ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={[styles.shareDiaryText, shareDiary && { color: theme.colors.primary }]}>
                  {shareDiary ? 'Diary visible in community gallery' : 'Diary hidden from community gallery'}
                </Text>
                <View style={[styles.toggleTrack, shareDiary && styles.toggleTrackActive]}>
                  <View style={[styles.toggleThumb, shareDiary && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Visibility Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who Can See This Visit?</Text>
            <View style={styles.visibilityRow} data-testid="visibility-selector">
              {VISIBILITY_OPTIONS.map((opt) => {
                const isActive = visibility === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.visibilityChip, isActive && styles.visibilityChipActive]}
                    onPress={() => setVisibility(opt.value)}
                    activeOpacity={0.7}
                    data-testid={`visibility-option-${opt.value}`}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={isActive ? '#fff' : theme.colors.textSecondary}
                    />
                    <Text style={[styles.visibilityChipText, isActive && styles.visibilityChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.9}
            style={styles.submitContainer}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              style={styles.submitButton}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.submitText}>
                {isSubmitting ? 'Saving...' : 'Record Visit'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  closeButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: theme.spacing.lg,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  photoScroll: {
    marginTop: theme.spacing.sm,
  },
  photoItem: {
    marginRight: theme.spacing.sm,
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
  },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: 4,
  },
  photoButtonsColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cameraButton: {
    width: 100,
    height: 72,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  cameraButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  libraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  libraryButtonText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  photoGuidelines: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(77, 184, 216, 0.08)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  photoGuidelinesText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  photoDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: theme.spacing.sm,
    paddingHorizontal: 2,
  },
  photoDisclaimerText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
  addPhotoButtonLocked: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: 'rgba(118, 75, 162, 0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 75, 162, 0.05)',
  },
  addPhotoTextLocked: {
    fontSize: 11,
    color: '#1E8A8A',
    marginTop: 4,
    fontWeight: '600',
  },
  addPhotoSubtext: {
    fontSize: 9,
    color: '#1E8A8A',
    opacity: 0.7,
  },
  upgradePhotoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  upgradePhotoHintText: {
    fontSize: 11,
    color: '#1E8A8A',
    fontWeight: '600',
  },
  diaryInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: 15,
    color: theme.colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  charCounter: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  shareDiaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(77, 184, 216, 0.06)',
    borderRadius: theme.borderRadius.md,
  },
  shareDiaryText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  toggleTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  tipsHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  visibilityChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  visibilityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  visibilityChipTextActive: {
    color: '#fff',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B8860B',
  },
  submitContainer: {
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
