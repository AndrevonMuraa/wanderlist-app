import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import { useSubscription } from '../../hooks/useSubscription';
import { compressToBase64 } from '../../utils/image';

interface PhotoSectionProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  onClose: () => void;
  maxOverride?: number;
  showGuidelines?: boolean;
  showDisclaimer?: boolean;
}

export default function PhotoSection({
  photos,
  onPhotosChange,
  onClose,
  maxOverride,
  showGuidelines = false,
  showDisclaimer = false,
}: PhotoSectionProps) {
  const router = useRouter();
  const { maxPhotosPerVisit, isPro } = useSubscription();
  const maxPhotos = maxOverride ?? maxPhotosPerVisit;
  const canAddMore = photos.length < maxPhotos;

  const showPhotoLimitAlert = () => {
    if (!isPro && !maxOverride) {
      Alert.alert(
        'Photo Limit Reached',
        `Basic travelers can add up to ${maxPhotos} photo per visit. Upgrade to Pro for up to 10 photos!`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => { onClose(); router.push('/subscription'); } },
        ]
      );
    } else {
      Alert.alert('Limit Reached', `You can add up to ${maxPhotos} photos per visit`);
    }
  };

  const takePhoto = async () => {
    if (!canAddMore) { showPhotoLimitAlert(); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Access', 'Please allow camera access in your device settings to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const base64Image = await compressToBase64(result.assets[0].uri);
      onPhotosChange([...photos, base64Image]);
    }
  };

  const pickImages = async () => {
    if (!canAddMore) { showPhotoLimitAlert(); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: isPro || !!maxOverride,
      quality: 1,
    });
    if (!result.canceled && result.assets) {
      const assets = result.assets.slice(0, maxPhotos - photos.length);
      const newPhotos = await Promise.all(
        assets.map(a => compressToBase64(a.uri))
      );
      onPhotosChange([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Photos ({photos.length}/{maxPhotos})</Text>
        {!isPro && !maxOverride && (
          <TouchableOpacity
            style={styles.upgradeHint}
            onPress={() => { onClose(); router.push('/subscription'); }}
          >
            <Ionicons name="diamond" size={12} color="#1E8A8A" />
            <Text style={styles.upgradeHintText}>Get 10 photos</Text>
          </TouchableOpacity>
        )}
      </View>

      {showGuidelines && (
        <View style={styles.guidelines} testID="photo-guidelines">
          <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
          <Text style={styles.guidelinesText}>
            Take a personal photo of yourself at the landmark to earn verified points. Photos without you in them may result in verified points being removed.
          </Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoItem}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(index)}>
              <Ionicons name="close-circle" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ))}
        {canAddMore && (
          <View style={styles.photoButtonsColumn}>
            <TouchableOpacity style={styles.libraryButtonPrimary} onPress={pickImages} testID="pick-photo-btn">
              <Ionicons name="images" size={28} color="#fff" />
              <Text style={styles.libraryButtonPrimaryText}>Add Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraButtonSecondary} onPress={takePhoto} testID="take-photo-btn">
              <Ionicons name="camera-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.cameraButtonSecondaryText}>Take Photo Instead</Text>
            </TouchableOpacity>
          </View>
        )}
        {!canAddMore && !isPro && !maxOverride && (
          <TouchableOpacity
            style={styles.lockedButton}
            onPress={() => { onClose(); router.push('/subscription'); }}
          >
            <Ionicons name="lock-closed" size={24} color="#1E8A8A" />
            <Text style={styles.lockedText}>Upgrade</Text>
            <Text style={styles.lockedSubtext}>for more</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {showDisclaimer && photos.length > 0 && (
        <View style={styles.disclaimer} testID="photo-disclaimer">
          <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.disclaimerText}>
            Only personal photos where you are visible count toward verified points. Using photos from the internet or without yourself in them may lead to removal of verified points.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: theme.spacing.lg,
    paddingBottom: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  upgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  upgradeHintText: {
    fontSize: 11,
    color: '#1E8A8A',
    fontWeight: '600',
  },
  guidelines: {
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
  guidelinesText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
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
  libraryButtonPrimary: {
    width: 100,
    height: 72,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  libraryButtonPrimaryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  cameraButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  cameraButtonSecondaryText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  lockedButton: {
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
  lockedText: {
    fontSize: 11,
    color: '#1E8A8A',
    marginTop: 4,
    fontWeight: '600',
  },
  lockedSubtext: {
    fontSize: 9,
    color: '#1E8A8A',
    opacity: 0.7,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: theme.spacing.sm,
    paddingHorizontal: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
});
