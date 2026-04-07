import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { VisitModalShell, PhotoSection, DiarySection, VisitSubmitButton } from './visit-shared';
import { PrivacySelector } from './PrivacySelector';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { invalidateCacheGroup } from '../utils/apiCache';
import { successHaptic } from '../utils/haptics';

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
  const [shareDiary, setShareDiary] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleAddPhotoFromAlert = async () => {
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
    if (!result.canceled && result.assets?.[0]?.base64) {
      setPhotos(prev => [...prev, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      Alert.alert(
        'Record Without Photo?',
        'Without a photo, this visit will count as unverified. Unverified points count towards the friends leaderboard, but not the global leaderboard.\n\nAdd a photo to earn verified points.',
        [
          { text: 'Add Photo', style: 'cancel', onPress: handleAddPhotoFromAlert },
          { text: 'Record Anyway', onPress: () => submitVisit() },
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
          share_diary: shareDiary,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        invalidateCacheGroup('visit');
        await successHaptic();
        if (photos.length > 0) {
          Alert.alert('Success!', `${countryName} visit recorded! +${result.points_earned} points added to leaderboard!`);
        } else {
          Alert.alert('Visit Recorded!', `${countryName} marked as visited! +${result.points_earned} personal points. Add photos anytime to earn leaderboard points!`);
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
    <VisitModalShell
      visible={visible}
      onClose={onClose}
      title={`Visit ${countryName}`}
      subtitle="Share your experience"
    >
      <PhotoSection
        photos={photos}
        onPhotosChange={setPhotos}
        onClose={onClose}
      />

      <DiarySection
        diary={diary}
        onDiaryChange={setDiary}
        shareDiary={shareDiary}
        onShareDiaryChange={setShareDiary}
        placeholder={`Share your experience in ${countryName}...`}
      />

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
            Add photos to earn verified points for the leaderboard.
          </Text>
        </View>
      )}

      <VisitSubmitButton
        onPress={handleSubmit}
        loading={submitting}
        label="Record Visit"
        active={photos.length > 0}
      />
    </VisitModalShell>
  );
};
export default AddCountryVisitModal;

const styles = StyleSheet.create({
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
});
