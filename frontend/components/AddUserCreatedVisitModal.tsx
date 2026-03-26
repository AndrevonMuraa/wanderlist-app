import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Image, Alert, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { VisitModalShell, PhotoSection, DiarySection, VisitSubmitButton } from './visit-shared';
import { PrivacySelector } from './PrivacySelector';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { invalidateCacheGroup } from '../utils/apiCache';
import { successHaptic } from '../utils/haptics';

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
  const [landmarks, setLandmarks] = useState<LandmarkEntry[]>([{ name: '', photo: null }]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [diary, setDiary] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [shareDiary, setShareDiary] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dbCountries, setDbCountries] = useState<{country_id: string; name: string; continent: string}[]>([]);
  const [suggestions, setSuggestions] = useState<{country_id: string; name: string; continent: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDbCountry, setSelectedDbCountry] = useState<string | null>(null);

  const landmarkPhotosCount = landmarks.filter(lm => lm.photo).length;
  const totalPhotos = photos.length + landmarkPhotosCount;

  const resetForm = () => {
    setCountryName('');
    setLandmarks([{ name: '', photo: null }]);
    setPhotos([]);
    setDiary('');
    setPrivacy('public');
    setSelectedDbCountry(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Fetch DB country names for autocomplete
  React.useEffect(() => {
    if (visible && dbCountries.length === 0) {
      (async () => {
        try {
          const token = await getToken();
          const res = await fetch(`${BACKEND_URL}/api/countries/names`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) setDbCountries(await res.json());
        } catch {}
      })();
    }
  }, [visible]);

  const handleCountryInput = (text: string) => {
    setCountryName(text);
    setSelectedDbCountry(null);
    if (text.length >= 2 && dbCountries.length > 0) {
      const filtered = dbCountries.filter(c =>
        c.name.toLowerCase().startsWith(text.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectCountry = (country: { country_id: string; name: string; continent: string }) => {
    setCountryName(country.name);
    setSelectedDbCountry(country.country_id);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleClose = () => { resetForm(); onClose(); };

  // Landmark management
  const updateLandmarkName = (index: number, value: string) => {
    const updated = [...landmarks];
    updated[index] = { ...updated[index], name: value };
    setLandmarks(updated);
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
    if (!result.canceled && result.assets?.[0]) {
      const updated = [...landmarks];
      updated[index] = { ...updated[index], photo: `data:image/jpeg;base64,${result.assets[0].base64}` };
      setLandmarks(updated);
    }
  };

  const removeLandmarkPhoto = (index: number) => {
    const updated = [...landmarks];
    updated[index] = { ...updated[index], photo: null };
    setLandmarks(updated);
  };

  const addLandmark = () => {
    if (landmarks.length < 10) setLandmarks([...landmarks, { name: '', photo: null }]);
  };

  const removeLandmark = (index: number) => {
    if (landmarks.length > 1) {
      setLandmarks(landmarks.filter((_, i) => i !== index));
    } else {
      setLandmarks([{ name: '', photo: null }]);
    }
  };

  const handleSubmit = async () => {
    if (!countryName || countryName.trim().length < 2) {
      Alert.alert('Country Required', 'Please enter a country name (at least 2 characters)');
      return;
    }

    const validLandmarks = landmarks
      .filter(lm => lm.name.trim().length > 0)
      .map(lm => ({ name: lm.name.trim(), photo: lm.photo }));

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
          share_diary: shareDiary,
        }),
      });

      if (response.ok) {
        invalidateCacheGroup('visit');
        await successHaptic();
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

  const filledLandmarksCount = landmarks.filter(lm => lm.name.trim().length > 0).length;

  return (
    <VisitModalShell
      visible={visible}
      onClose={handleClose}
      title="Record Custom Visit"
      subtitle="Add places not in our database"
      keyboardPersist
    >
      {/* Country Name Input with Autocomplete */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Destination</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>Required</Text>
          </View>
        </View>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Spain, Monaco, Vatican City..."
          placeholderTextColor={theme.colors.textLight}
          value={countryName}
          onChangeText={handleCountryInput}
          autoCapitalize="words"
        />
        {selectedDbCountry && (
          <View style={styles.matchBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            <Text style={styles.matchBadgeText}>Linked to {countryName}</Text>
          </View>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s.country_id}
                style={styles.suggestionItem}
                onPress={() => selectCountry(s)}
              >
                <Ionicons name="flag-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.suggestionName}>{s.name}</Text>
                <Text style={styles.suggestionContinent}>{s.continent}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Landmarks Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Landmarks {filledLandmarksCount > 0 ? `(${filledLandmarksCount})` : ''}
          </Text>
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalText}>Optional</Text>
          </View>
        </View>
        <Text style={styles.hint}>Add a photo for each landmark to make your memories more vivid!</Text>

        {landmarks.map((landmark, index) => (
          <View key={index} style={styles.landmarkCard}>
            <View style={styles.landmarkInputRow}>
              <View style={styles.landmarkNumber}>
                <Text style={styles.landmarkNumberText}>{index + 1}</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.landmarkInput]}
                placeholder={index === 0 ? "e.g., Prince's Palace, Monte Carlo Casino..." : 'Add another landmark...'}
                placeholderTextColor={theme.colors.textLight}
                value={landmark.name}
                onChangeText={(v) => updateLandmarkName(index, v)}
                autoCapitalize="words"
              />
              {(landmarks.length > 1 || landmark.name.trim().length > 0 || landmark.photo) && (
                <TouchableOpacity style={styles.removeLandmarkButton} onPress={() => removeLandmark(index)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.textLight} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.landmarkPhotoRow}>
              {landmark.photo ? (
                <View style={styles.landmarkPhotoPreview}>
                  <Image source={{ uri: landmark.photo }} style={styles.landmarkPhoto} />
                  <TouchableOpacity style={styles.removeLandmarkPhotoButton} onPress={() => removeLandmarkPhoto(index)}>
                    <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addLandmarkPhotoButton} onPress={() => pickLandmarkPhoto(index)}>
                  <Ionicons name="camera-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.addLandmarkPhotoText}>Add photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        {landmarks.length < 10 && (
          <TouchableOpacity style={styles.addLandmarkButton} onPress={addLandmark}>
            <Ionicons name="add-circle" size={22} color={theme.colors.primary} />
            <Text style={styles.addLandmarkText}>Add another landmark</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* General Country Photos (reuses shared PhotoSection with maxOverride=10) */}
      <PhotoSection
        photos={photos}
        onPhotosChange={setPhotos}
        onClose={handleClose}
        maxOverride={10}
      />

      {totalPhotos > 0 && (
        <View style={styles.photoSummary}>
          <Ionicons name="images-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.photoSummaryText}>
            Total: {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''} ({landmarkPhotosCount} landmark, {photos.length} country)
          </Text>
        </View>
      )}

      <DiarySection
        diary={diary}
        onDiaryChange={setDiary}
        shareDiary={shareDiary}
        onShareDiaryChange={setShareDiary}
      />

      {/* Privacy Setting */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Who can see this?</Text>
        <PrivacySelector selected={privacy} onChange={setPrivacy} />
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#5C6BC0" />
        <Text style={styles.infoText}>
          Custom visits don't earn points or count towards leaderboards. Perfect for recording places outside our database!
        </Text>
      </View>

      <VisitSubmitButton
        onPress={handleSubmit}
        loading={submitting}
        disabled={countryName.trim().length < 2}
        label="Record Visit"
        active={countryName.trim().length >= 2}
      />
    </VisitModalShell>
  );
};

export default AddUserCreatedVisitModal;

const styles = StyleSheet.create({
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
  hint: {
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
    marginLeft: 32,
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
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginLeft: 4,
  },
  matchBadgeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  suggestionContinent: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
