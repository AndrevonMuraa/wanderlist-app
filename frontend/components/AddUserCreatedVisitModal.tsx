import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { theme, gradients } from '../constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface AddUserCreatedVisitModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PrivacyOption = 'public' | 'friends' | 'private';

const PrivacySelector = ({ 
  selected, 
  onChange 
}: { 
  selected: PrivacyOption; 
  onChange: (value: PrivacyOption) => void;
}) => {
  const options: { value: PrivacyOption; label: string; icon: string }[] = [
    { value: 'public', label: 'Public', icon: 'globe-outline' },
    { value: 'friends', label: 'Friends Only', icon: 'people-outline' },
    { value: 'private', label: 'Private', icon: 'lock-closed-outline' },
  ];

  return (
    <View style={styles.privacyContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.privacyOption,
            selected === option.value && styles.privacyOptionSelected,
          ]}
          onPress={() => onChange(option.value)}
        >
          <Ionicons
            name={option.icon as any}
            size={18}
            color={selected === option.value ? '#fff' : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.privacyOptionText,
              selected === option.value && styles.privacyOptionTextSelected,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default function AddUserCreatedVisitModal({
  visible,
  onClose,
  onSuccess,
}: AddUserCreatedVisitModalProps) {
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [countryName, setCountryName] = useState('');
  const [landmarkName, setLandmarkName] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [diary, setDiary] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyOption>('public');
  const [submitting, setSubmitting] = useState(false);

  const successHaptic = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const pickImage = async () => {
    if (photos.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 photos allowed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhotos([...photos, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
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
        const result = await response.json();
        
        // Build success message
        let message = `${countryName}`;
        if (landmarkName) {
          message = `${landmarkName}, ${countryName}`;
        }
        
        Alert.alert('Success!', `Your visit to ${message} has been recorded!`);
        
        // Reset form
        setCountryName('');
        setLandmarkName('');
        setPhotos([]);
        setDiary('');
        setPrivacy('public');
        
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

  const handleClose = () => {
    // Reset form on close
    setCountryName('');
    setLandmarkName('');
    setPhotos([]);
    setDiary('');
    setPrivacy('public');
    onClose();
  };

  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  const headerPaddingTop = Platform.OS === 'ios' ? insets.top : Math.max(statusBarHeight, insets.top);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Ocean to Sand Gradient Header */}
        <LinearGradient
          colors={gradients.oceanToSand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: headerPaddingTop + theme.spacing.md }]}
        >
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Record Custom Visit</Text>
            <Text style={styles.headerSubtitle}>Add places not in our database</Text>
          </View>
          
          <View style={styles.headerBrand}>
            <Text style={styles.brandText}>WanderList</Text>
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Country Name Input (Required) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Country Name</Text>
              <Text style={styles.requiredBadge}>Required</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Monaco, Liechtenstein, Vatican City..."
              placeholderTextColor={theme.colors.textSecondary}
              value={countryName}
              onChangeText={setCountryName}
              autoCapitalize="words"
            />
          </View>

          {/* Landmark Name Input (Optional) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Landmark Name</Text>
              <Text style={styles.optionalBadge}>Optional</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Prince's Palace, Monte Carlo Casino..."
              placeholderTextColor={theme.colors.textSecondary}
              value={landmarkName}
              onChangeText={setLandmarkName}
              autoCapitalize="words"
            />
          </View>

          {/* Photos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Photos</Text>
              <Text style={styles.photoCount}>{photos.length}/10</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {photos.length < 10 && (
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                  <Ionicons name="add-circle-outline" size={40} color={theme.colors.primary} />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Travel Diary Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="book" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Travel Diary</Text>
              <Text style={styles.optionalBadge}>Optional</Text>
            </View>
            <TextInput
              style={styles.diaryInput}
              placeholder="Write about your experience..."
              placeholderTextColor={theme.colors.textSecondary}
              value={diary}
              onChangeText={setDiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Privacy Setting */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="eye" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Who can see this?</Text>
            </View>
            <PrivacySelector selected={privacy} onChange={setPrivacy} />
          </View>

          {/* Info Box - No Points */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#5C6BC0" />
            <Text style={styles.infoText}>
              Custom visits don't earn points or count towards leaderboards. They're perfect for recording places outside our database!
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || countryName.trim().length < 2}
            activeOpacity={0.9}
            style={styles.submitContainer}
          >
            <LinearGradient
              colors={countryName.trim().length >= 2 ? [theme.colors.primary, theme.colors.secondary] : ['#9E9E9E', '#757575']}
              style={styles.submitButton}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.submitText}>Record Visit</Text>
                </>
              )}
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
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
    left: theme.spacing.md,
    zIndex: 10,
    padding: theme.spacing.xs,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  headerBrand: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 20,
    right: theme.spacing.lg,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingTop: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  requiredBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  optionalBadge: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  photoCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
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
    flexDirection: 'row',
  },
  photoContainer: {
    marginRight: theme.spacing.sm,
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
  },
  removePhotoButton: {
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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  addPhotoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
  privacyContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  privacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    gap: 6,
  },
  privacyOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  privacyOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  privacyOptionTextSelected: {
    color: '#fff',
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
