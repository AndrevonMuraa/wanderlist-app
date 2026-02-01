import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Image, Alert, Platform, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { successHaptic } from '../utils/haptics';
import { PrivacySelector } from './PrivacySelector';

interface AddUserCreatedVisitModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LandmarkEntry {
  name: string;
  photo: string | null;
}

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

export const AddUserCreatedVisitModal: React.FC<AddUserCreatedVisitModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [countryName, setCountryName] = useState('');
  const [landmarks, setLandmarks] = useState<LandmarkEntry[]>([{ name: '', photo: null }]); // Start with one empty input
  const [photos, setPhotos] = useState<string[]>([]); // General country photos
  const [diary, setDiary] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Calculate safe area padding
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  // Calculate total photos
  const landmarkPhotosCount = landmarks.filter(lm => lm.photo).length;
  const totalPhotos = photos.length + landmarkPhotosCount;

  const pickImages = async () => {
    if (photos.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 country photos allowed');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets
        .slice(0, 10 - photos.length)
        .map(asset => `data:image/jpeg;base64,${asset.base64}`);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Landmark management functions
  const updateLandmarkName = (index: number, value: string) => {
    const newLandmarks = [...landmarks];
    newLandmarks[index] = { ...newLandmarks[index], name: value };
    setLandmarks(newLandmarks);
  };

  const pickLandmarkPhoto = async (index: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const newLandmarks = [...landmarks];
      newLandmarks[index] = { 
        ...newLandmarks[index], 
        photo: `data:image/jpeg;base64,${result.assets[0].base64}` 
      };
      setLandmarks(newLandmarks);
    }
  };

  const removeLandmarkPhoto = (index: number) => {
    const newLandmarks = [...landmarks];
    newLandmarks[index] = { ...newLandmarks[index], photo: null };
    setLandmarks(newLandmarks);
  };

  const addLandmark = () => {
    if (landmarks.length < 10) {
      setLandmarks([...landmarks, { name: '', photo: null }]);
    }
  };

  const removeLandmark = (index: number) => {
    if (landmarks.length > 1) {
      setLandmarks(landmarks.filter((_, i) => i !== index));
    } else {
      // If only one, just clear it
      setLandmarks([{ name: '', photo: null }]);
    }
  };

  const resetForm = () => {
    setCountryName('');
    setLandmarks([{ name: '', photo: null }]);
    setPhotos([]);
    setDiary('');
    setPrivacy('public');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    // Validate country name
    if (!countryName || countryName.trim().length < 2) {
      Alert.alert('Country Required', 'Please enter a country name (at least 2 characters)');
      return;
    }

    // Filter out empty landmarks but keep the photo if name is present
    const validLandmarks = landmarks
      .filter(lm => lm.name.trim().length > 0)
      .map(lm => ({
        name: lm.name.trim(),
        photo: lm.photo
      }));

    setSubmitting(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/user-created-visits`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country_name: countryName.trim(),
          landmarks: validLandmarks,
          photos,
          diary_notes: diary || undefined,
          visibility: privacy,
        }),
      });

      if (response.ok) {
        await successHaptic();
        
        // Build success message
        let message = countryName;
        if (validLandmarks.length === 1) {
          message = `${validLandmarks[0].name}, ${countryName}`;
        } else if (validLandmarks.length > 1) {
          message = `${validLandmarks.length} places in ${countryName}`;
        }
        
        Alert.alert('Success!', `Your visit to ${message} has been recorded!`);
        resetForm();
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

  // Count non-empty landmarks for display
  const filledLandmarksCount = landmarks.filter(lm => lm.name.trim().length > 0).length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header with Ocean to Sand gradient - matching other modals */}
        <LinearGradient
          colors={gradients.oceanToSand}
          start={gradients.horizontal.start}
          end={gradients.horizontal.end}
          style={[styles.header, { paddingTop: topPadding }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Record Custom Visit</Text>
                <Text style={styles.headerSubtitle}>Add places not in our database</Text>
              </View>
            </View>
            <View style={styles.brandingContainer}>
              <Ionicons name="earth" size={16} color="#2A2A2A" />
              <Text style={styles.brandingText}>WanderMark</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {/* Country Name Input */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Country Name</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Monaco, Liechtenstein, Vatican City..."
              placeholderTextColor={theme.colors.textLight}
              value={countryName}
              onChangeText={setCountryName}
              autoCapitalize="words"
            />
          </View>

          {/* Landmarks Section - Dynamic inputs with per-landmark photos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Landmarks {filledLandmarksCount > 0 ? `(${filledLandmarksCount})` : ''}
              </Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>Optional • Max 10</Text>
              </View>
            </View>
            <Text style={styles.landmarkHint}>
              Add a photo for each landmark to make your memories more vivid! 📸
            </Text>
            
            {landmarks.map((landmark, index) => (
              <View key={index} style={styles.landmarkCard}>
                <View style={styles.landmarkInputRow}>
                  <View style={styles.landmarkNumber}>
                    <Text style={styles.landmarkNumberText}>{index + 1}</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.landmarkInput]}
                    placeholder={index === 0 ? "e.g., Prince's Palace, Monte Carlo Casino..." : "Add another landmark..."}
                    placeholderTextColor={theme.colors.textLight}
                    value={landmark.name}
                    onChangeText={(value) => updateLandmarkName(index, value)}
                    autoCapitalize="words"
                  />
                  {(landmarks.length > 1 || landmark.name.trim().length > 0 || landmark.photo) && (
                    <TouchableOpacity 
                      style={styles.removeLandmarkButton}
                      onPress={() => removeLandmark(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={theme.colors.textLight} />
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Per-landmark photo section */}
                <View style={styles.landmarkPhotoRow}>
                  {landmark.photo ? (
                    <View style={styles.landmarkPhotoPreview}>
                      <Image source={{ uri: landmark.photo }} style={styles.landmarkPhoto} />
                      <TouchableOpacity 
                        style={styles.removeLandmarkPhotoButton}
                        onPress={() => removeLandmarkPhoto(index)}
                      >
                        <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.addLandmarkPhotoButton}
                      onPress={() => pickLandmarkPhoto(index)}
                    >
                      <Ionicons name="camera-outline" size={18} color={theme.colors.primary} />
                      <Text style={styles.addLandmarkPhotoText}>Add photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            
            {/* Add Landmark Button */}
            {landmarks.length < 10 && (
              <TouchableOpacity style={styles.addLandmarkButton} onPress={addLandmark}>
                <Ionicons name="add-circle" size={22} color={theme.colors.primary} />
                <Text style={styles.addLandmarkText}>Add another landmark</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* General Country Photos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Country Photos ({photos.length}/10)</Text>
            </View>
            <Text style={styles.photoHint}>
              General photos of your trip (landscapes, food, moments...)
            </Text>
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
              {photos.length < 10 && (
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickImages}>
                  <Ionicons name="add-circle" size={40} color={theme.colors.primary} />
                  <Text style={styles.addPhotoText}>Add Photos</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Photo Summary */}
          {totalPhotos > 0 && (
            <View style={styles.photoSummary}>
              <Ionicons name="images-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.photoSummaryText}>
                Total: {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''} ({landmarkPhotosCount} landmark, {photos.length} country)
              </Text>
            </View>
          )}

          {/* Diary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travel Diary (Optional)</Text>
            <TextInput
              style={styles.diaryInput}
              placeholder="Share your experience..."
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

          {/* Info Box - No Points */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#5C6BC0" />
            <Text style={styles.infoText}>
              Custom visits don't earn points or count towards leaderboards. Perfect for recording places outside our database!
            </Text>
          </View>

          {/* Submit Button - matching other modals */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || countryName.trim().length < 2}
            activeOpacity={0.9}
            style={styles.submitContainer}
          >
            <LinearGradient
              colors={countryName.trim().length >= 2 ? [theme.colors.primary, theme.colors.secondary] : ['#78909C', '#546E7A']}
              style={styles.submitButton}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.submitText}>
                {submitting ? 'Saving...' : 'Record Visit'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Export as default as well for compatibility
export default AddUserCreatedVisitModal;

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
    paddingTop: theme.spacing.md,
  },
  section: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  requiredBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  optionalBadge: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  optionalText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textLight,
  },
  textInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  landmarkHint: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.md,
    fontStyle: 'italic',
  },
  landmarkCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  landmarkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  landmarkNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  landmarkNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  landmarkInput: {
    flex: 1,
    marginBottom: 0,
    backgroundColor: theme.colors.surface,
  },
  removeLandmarkButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  landmarkPhotoRow: {
    marginTop: theme.spacing.sm,
    marginLeft: 32, // Align with input after the number badge
  },
  landmarkPhotoPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  landmarkPhoto: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
  },
  removeLandmarkPhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  addLandmarkPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight + '20',
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
    gap: 6,
  },
  addLandmarkPhotoText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  addLandmarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  addLandmarkText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  photoHint: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
  },
  photoScroll: {
    marginTop: theme.spacing.xs,
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
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  photoSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.accentLight + '15',
    borderRadius: theme.borderRadius.md,
  },
  photoSummaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.accent,
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
    backgroundColor: '#E8EAF6',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#3949AB',
    lineHeight: 18,
  },
  submitContainer: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
