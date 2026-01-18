import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Image, Alert, Platform, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { successHaptic, lightHaptic } from '../utils/haptics';
import { PrivacySelector } from './PrivacySelector';
import { useSubscription } from '../hooks/useSubscription';

interface AddCountryVisitModalProps {
  visible: boolean;
  countryId: string;
  countryName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

export const AddCountryVisitModal: React.FC<AddCountryVisitModalProps> = ({
  visible,
  countryId,
  countryName,
  onClose,
  onSuccess,
}) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [diary, setDiary] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Get subscription limits
  const subscriptionData = useSubscription();
  const maxPhotos = subscriptionData.maxPhotosPerVisit;
  const isProUser = subscriptionData.isPro;
  
  // Calculate safe area padding
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  const pickImages = async () => {
    if (photos.length >= maxPhotos) {
      if (!isProUser) {
        Alert.alert(
          'Photo Limit Reached',
          `Free users can add up to ${maxPhotos} photo per visit. Upgrade to Pro for up to 10 photos!`,
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade to Pro', onPress: () => {
              onClose();
              router.push('/subscription');
            }}
          ]
        );
      } else {
        Alert.alert('Limit Reached', `You can add up to ${maxPhotos} photos per visit`);
      }
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: isProUser, // Only Pro users can select multiple
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets
        .slice(0, maxPhotos - photos.length)
        .map(asset => `data:image/jpeg;base64,${asset.base64}`);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Photos are now optional - but show confirmation if no photos
    if (photos.length === 0) {
      Alert.alert(
        'No Photos',
        'Without photos, this visit will only count towards your personal stats, not the public leaderboard. Continue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => submitVisit() }
        ]
      );
      return;
    }
    submitVisit();
  };

  const submitVisit = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/country-visits`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country_id: countryId,
          photos,
          diary_notes: diary || undefined,
          visibility: privacy,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        await successHaptic();
        
        // Show appropriate message based on whether photos were included
        if (photos.length > 0) {
          Alert.alert('Success!', `${countryName} visit recorded! +${result.points_earned} points added to leaderboard! 🏆`);
        } else {
          Alert.alert('Visit Recorded!', `${countryName} marked as visited! +${result.points_earned} personal points. Add photos anytime to earn leaderboard points! 📸`);
        }
        
        setPhotos([]);
        setDiary('');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to save visit');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save visit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Updated Header with Ocean to Sand gradient */}
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
                <Text style={styles.headerTitle}>Visit {countryName}</Text>
                <Text style={styles.headerSubtitle}>Share your experience</Text>
              </View>
            </View>
            <View style={styles.brandingContainer}>
              <Ionicons name="earth" size={16} color="#2A2A2A" />
              <Text style={styles.brandingText}>WanderList</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scrollView}>
          {/* Photo Collage */}
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
                  <Ionicons name="diamond" size={12} color="#764ba2" />
                  <Text style={styles.upgradePhotoHintText}>Get 10 photos</Text>
                </TouchableOpacity>
              )}
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
              {photos.length < maxPhotos ? (
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickImages}>
                  <Ionicons name="add-circle" size={40} color={theme.colors.primary} />
                  <Text style={styles.addPhotoText}>Add Photos</Text>
                </TouchableOpacity>
              ) : !isProUser ? (
                <TouchableOpacity 
                  style={styles.addPhotoButtonLocked}
                  onPress={() => {
                    onClose();
                    router.push('/subscription');
                  }}
                >
                  <Ionicons name="lock-closed" size={24} color="#764ba2" />
                  <Text style={styles.addPhotoTextLocked}>Upgrade</Text>
                  <Text style={styles.addPhotoSubtext}>for more</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>

          {/* Diary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travel Diary (Optional)</Text>
            <TextInput
              style={styles.diaryInput}
              placeholder={`Share your experience in ${countryName}...`}
              placeholderTextColor={theme.colors.textLight}
              value={diary}
              onChangeText={setDiary}
              multiline
              numberOfLines={6}
              maxLength={500}
            />
          </View>

          {/* Privacy Setting */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who can see this?</Text>
            <PrivacySelector selected={privacy} onChange={setPrivacy} />
          </View>

          {/* Info about leaderboard points */}
          {photos.length === 0 && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#FFA726" />
              <Text style={styles.infoText}>
                Add photos to earn leaderboard points! Without photos, points count for personal stats only.
              </Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.9}
            style={styles.submitContainer}
          >
            <LinearGradient
              colors={photos.length > 0 ? [theme.colors.primary, theme.colors.secondary] : ['#78909C', '#546E7A']}
              style={styles.submitButton}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.submitText}>
                {submitting ? 'Saving...' : photos.length > 0 ? 'Record Visit (+50 points)' : 'Mark as Visited (personal only)'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

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
    fontSize: 22,
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
    color: '#764ba2',
    fontWeight: '600',
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
    color: '#764ba2',
    marginTop: 4,
    fontWeight: '600',
  },
  addPhotoSubtext: {
    fontSize: 9,
    color: '#764ba2',
    opacity: 0.7,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
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
