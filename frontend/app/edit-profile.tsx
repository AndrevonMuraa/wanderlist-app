import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import UniversalHeader from '../components/UniversalHeader';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface UserProfile {
  name: string;
  picture?: string;
  bio?: string;
  location?: string;
  banner_image?: string;
  featured_badges?: string[];
}

interface Achievement {
  achievement_id: string;
  badge_name: string;
  badge_icon: string;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [picture, setPicture] = useState<string | undefined>();
  const [bannerImage, setBannerImage] = useState<string | undefined>();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [featuredBadges, setFeaturedBadges] = useState<string[]>([]);

  // Navigate back to profile tab explicitly
  const handleBack = () => {
    router.push('/(tabs)/profile');
  };

  useEffect(() => {
    loadProfile();
    loadAchievements();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setName(data.name || '');
        setBio(data.bio || '');
        setLocation(data.location || '');
        setPicture(data.picture);
        setBannerImage(data.banner_image);
        setFeaturedBadges(data.featured_badges || []);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAchievements = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/achievements`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAchievements(data);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setPicture(base64Image);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handlePickBanner = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1], // Banner aspect ratio
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setBannerImage(base64Image);
      }
    } catch (error) {
      console.error('Error picking banner:', error);
      Alert.alert('Error', 'Failed to pick banner image');
    }
  };

  const toggleFeaturedBadge = (achievementId: string) => {
    setFeaturedBadges(prev => {
      if (prev.includes(achievementId)) {
        return prev.filter(id => id !== achievementId);
      } else if (prev.length < 3) {
        return [...prev, achievementId];
      } else {
        Alert.alert('Maximum Reached', 'You can only feature up to 3 badges');
        return prev;
      }
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || null,
          location: location.trim() || null,
          picture: picture || null,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => router.push('/(tabs)/profile') },
        ]);
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <UniversalHeader 
          title="Edit Profile" 
          onBack={handleBack}
          rightElement={
            <TouchableOpacity style={styles.saveButton} disabled>
              <Text style={[styles.saveText, styles.saveTextDisabled]}>Save</Text>
            </TouchableOpacity>
          }
        />
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const bioLength = bio.length;
  const bioRemaining = 200 - bioLength;

  return (
    <View style={styles.container}>
      <UniversalHeader 
        title="Edit Profile" 
        onBack={handleBack}
        rightElement={
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={saving}
          >
            <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        }
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Picture */}
          <Surface style={styles.pictureSection}>
            <Text style={styles.sectionTitle}>Profile Picture</Text>
            <View style={styles.pictureContainer}>
              <Image
                source={{
                  uri: picture || 'https://via.placeholder.com/150',
                }}
                style={styles.profilePicture}
              />
              <TouchableOpacity
                style={styles.changePictureButton}
                onPress={handlePickImage}
              >
                <Ionicons name="camera" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.pictureHint}>Tap the camera icon to change</Text>
          </Surface>

          {/* Name */}
          <Surface style={styles.inputSection}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={theme.colors.textLight}
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
          </Surface>

          {/* Bio */}
          <Surface style={styles.inputSection}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Bio</Text>
              <Text
                style={[
                  styles.charCount,
                  bioRemaining < 0 && styles.charCountError,
                ]}
              >
                {bioRemaining} characters left
              </Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.colors.textLight}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              maxLength={200}
            />
          </Surface>

          {/* Location */}
          <Surface style={styles.inputSection}>
            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., New York, USA"
              placeholderTextColor={theme.colors.textLight}
              value={location}
              onChangeText={setLocation}
              maxLength={50}
            />
          </Surface>

          <View style={{ height: theme.spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    padding: theme.spacing.xs,
  },
  saveText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  pictureSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
    alignSelf: 'flex-start',
  },
  pictureContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.border,
  },
  changePictureButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  pictureHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  inputSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  inputLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  charCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  charCountError: {
    color: theme.colors.error,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
