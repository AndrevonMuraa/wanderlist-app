import React, { useState } from 'react';
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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import theme from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface AddVisitModalProps {
  visible: boolean;
  onClose: () => void;
  landmarkName: string;
  landmarkId: string;
  onSubmit: (data: {
    photos: string[];
    diary_notes: string;
    travel_tips: string[];
  }) => void;
  isPremium: boolean;
}

type TabType = 'photos' | 'diary' | 'tips';

export default function AddVisitModal({
  visible,
  onClose,
  landmarkName,
  onSubmit,
  isPremium,
}: AddVisitModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('photos');
  const [photos, setPhotos] = useState<string[]>([]);
  const [diaryText, setDiaryText] = useState('');
  const [tipsText, setTipsText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImages = async () => {
    if (photos.length >= 10) {
      Alert.alert('Limit Reached', 'You can add up to 10 photos per visit');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled) {
        const newPhotos = result.assets
          .slice(0, 10 - photos.length)
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

  const parseTips = (): string[] => {
    return tipsText
      .split('\n')
      .map((tip) => tip.trim().replace(/^[•\-\*]\s*/, ''))
      .filter((tip) => tip.length > 0)
      .slice(0, 5); // Max 5 tips
  };

  const handleSubmit = async () => {
    // Validation
    if (photos.length === 0 && !diaryText && !tipsText) {
      Alert.alert('Add Content', 'Please add at least one photo, diary entry, or travel tip');
      return;
    }

    if (diaryText.length > 2000) {
      Alert.alert('Diary Too Long', 'Please keep your diary under 2000 characters');
      return;
    }

    const tips = parseTips();
    if (tips.length > 5) {
      Alert.alert('Too Many Tips', 'Please provide up to 5 travel tips');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        photos,
        diary_notes: diaryText,
        travel_tips: tips,
      });
      // Reset state
      setPhotos([]);
      setDiaryText('');
      setTipsText('');
      setActiveTab('photos');
    } catch (error) {
      console.error('Error submitting visit:', error);
      Alert.alert('Error', 'Failed to save your visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'photos' && styles.tabActive]}
        onPress={() => setActiveTab('photos')}
      >
        <Ionicons
          name="images"
          size={20}
          color={activeTab === 'photos' ? theme.colors.primary : theme.colors.textLight}
        />
        <Text style={[styles.tabText, activeTab === 'photos' && styles.tabTextActive]}>
          Photos {photos.length > 0 && `(${photos.length})`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'diary' && styles.tabActive]}
        onPress={() => setActiveTab('diary')}
      >
        <Ionicons
          name="journal"
          size={20}
          color={activeTab === 'diary' ? theme.colors.primary : theme.colors.textLight}
        />
        <Text style={[styles.tabText, activeTab === 'diary' && styles.tabTextActive]}>
          Diary
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'tips' && styles.tabActive]}
        onPress={() => setActiveTab('tips')}
        disabled={!isPremium}
      >
        <Ionicons
          name="bulb"
          size={20}
          color={
            !isPremium
              ? theme.colors.textLight
              : activeTab === 'tips'
              ? theme.colors.primary
              : theme.colors.textLight
          }
        />
        <Text style={[styles.tabText, activeTab === 'tips' && styles.tabTextActive]}>
          Tips {!isPremium && '🔒'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPhotosTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Photo Collage (Up to 10)</Text>
      <Text style={styles.sectionSubtitle}>
        Capture your adventure with multiple photos
      </Text>

      <TouchableOpacity style={styles.addPhotoButton} onPress={pickImages}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addPhotoGradient}
        >
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.addPhotoText}>
            {photos.length === 0 ? 'Add Photos' : 'Add More Photos'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {photos.length > 0 && (
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri: photo }} style={styles.photoImage} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => removePhoto(index)}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {photos.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={48} color={theme.colors.textLight} />
          <Text style={styles.emptyStateText}>No photos yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Add up to 10 photos to create your collage
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderDiaryTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Travel Diary</Text>
      <Text style={styles.sectionSubtitle}>
        Share your experience and memories ({diaryText.length}/2000)
      </Text>

      <TextInput
        style={styles.diaryInput}
        placeholder="Write about your experience at this landmark...&#10;&#10;What did you see? How did it make you feel? Any interesting stories?"
        placeholderTextColor={theme.colors.textLight}
        multiline
        numberOfLines={12}
        value={diaryText}
        onChangeText={setDiaryText}
        maxLength={2000}
        textAlignVertical="top"
      />

      {diaryText.length > 1800 && (
        <Text style={styles.characterWarning}>
          {2000 - diaryText.length} characters remaining
        </Text>
      )}
    </ScrollView>
  );

  const renderTipsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {!isPremium ? (
        <View style={styles.premiumRequired}>
          <Ionicons name="diamond" size={48} color={theme.colors.accent} />
          <Text style={styles.premiumTitle}>Premium Feature</Text>
          <Text style={styles.premiumSubtitle}>
            Upgrade to Premium to share travel tips with the community
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Travel Tips (Up to 5)</Text>
          <Text style={styles.sectionSubtitle}>
            Share helpful tips for future travelers • One tip per line
          </Text>

          <TextInput
            style={styles.tipsInput}
            placeholder="• Best time to visit is early morning&#10;• Bring water and sunscreen&#10;• Book tickets online to skip the line&#10;• Local guide highly recommended&#10;• Great for photography at sunset"
            placeholderTextColor={theme.colors.textLight}
            multiline
            numberOfLines={8}
            value={tipsText}
            onChangeText={setTipsText}
            textAlignVertical="top"
          />

          <Text style={styles.tipsHint}>
            💡 Tip: Start each line with • or - for bullet points
          </Text>

          {parseTips().length > 0 && (
            <View style={styles.tipsPreview}>
              <Text style={styles.tipsPreviewTitle}>Preview ({parseTips().length}/5)</Text>
              {parseTips().map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Share Your Visit</Text>
            <Text style={styles.headerSubtitle}>{landmarkName}</Text>
          </View>
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.submitButton}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving...' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        {renderTabBar()}

        {/* Tab Content */}
        {activeTab === 'photos' && renderPhotosTab()}
        {activeTab === 'diary' && renderDiaryTab()}
        {activeTab === 'tips' && renderTipsTab()}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  submitButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  // Photos Tab
  addPhotoButton: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  addPhotoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  addPhotoText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  photoItem: {
    width: (width - theme.spacing.lg * 2 - theme.spacing.sm * 2) / 3,
    aspectRatio: 1,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyStateText: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyStateSubtext: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
  },
  // Diary Tab
  diaryInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    minHeight: 300,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  characterWarning: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    marginTop: theme.spacing.sm,
    textAlign: 'right',
  },
  // Tips Tab
  tipsInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    minHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tipsHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  tipsPreview: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tipsPreviewTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  tipText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  // Premium Required
  premiumRequired: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  premiumTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: theme.spacing.md,
  },
  premiumSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
});
