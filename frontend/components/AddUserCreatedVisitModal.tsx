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
  const [landmarkName, setLandmarkName] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [diary, setDiary] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Calculate safe area padding
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  const pickImages = async () => {
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

  const resetForm = () => {
    setCountryName('');
    setLandmarkName('');
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
          landmark_name: landmarkName.trim() || undefined,
          photos,
          diary_notes: diary || undefined,
          visibility: privacy,
        }),
      });

      if (response.ok) {
        await successHaptic();
        
        // Build success message
        let message = countryName;
        if (landmarkName) {
          message = `${landmarkName}, ${countryName}`;
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
              <Text style={styles.brandingText}>WanderList</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scrollView}>
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

          {/* Landmark Name Input */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Landmark Name</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>Optional</Text>
              </View>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Prince's Palace, Monte Carlo Casino..."
              placeholderTextColor={theme.colors.textLight}
              value={landmarkName}
              onChangeText={setLandmarkName}
              autoCapitalize="words"
            />
          </View>

          {/* Photo Collage */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({photos.length}/10)</Text>
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
