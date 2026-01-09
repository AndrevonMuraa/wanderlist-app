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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import theme from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Surface } from 'react-native-paper';

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

export default function AddVisitModal({
  visible,
  onClose,
  landmarkName,
  onSubmit,
  isPremium,
}: AddVisitModalProps) {
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick');
  const [photos, setPhotos] = useState<string[]>([]);
  const [quickNote, setQuickNote] = useState(''); // New: for quick mode
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

  const takePhoto = async () => {
    if (photos.length >= 10) {
      Alert.alert('Limit Reached', 'You can add up to 10 photos per visit');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const newPhoto = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setPhotos([...photos, newPhoto]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
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
      .slice(0, 5);
  };

  const handleQuickSubmit = async () => {
    // Quick mode: Just need at least one photo or a quick note
    if (photos.length === 0 && !quickNote.trim()) {
      Alert.alert('Add Content', 'Please add a photo or a quick note about your visit');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        photos,
        diary_notes: quickNote,
        travel_tips: [],
      });
      // Reset form
      setPhotos([]);
      setQuickNote('');
      setDiaryText('');
      setTipsText('');
      setMode('quick');
    } catch (error) {
      console.error('Error submitting visit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedSubmit = async () => {
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
      // Reset form
      setPhotos([]);
      setQuickNote('');
      setDiaryText('');
      setTipsText('');
      setMode('quick');
    } catch (error) {
      console.error('Error submitting visit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModeSwitch = () => {
    if (mode === 'quick') {
      // Copy quick note to diary when switching to detailed
      if (quickNote && !diaryText) {
        setDiaryText(quickNote);
      }
      setMode('detailed');
    } else {
      setMode('quick');
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Record Visit</Text>
            <Text style={styles.headerSubtitle}>{landmarkName}</Text>
          </View>
          <TouchableOpacity
            onPress={mode === 'quick' ? handleQuickSubmit : handleDetailedSubmit}
            style={styles.submitButton}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'quick' && styles.modeButtonActive]}
            onPress={() => setMode('quick')}
          >
            <Ionicons 
              name="flash" 
              size={18} 
              color={mode === 'quick' ? '#fff' : theme.colors.primary} 
            />
            <Text style={[styles.modeButtonText, mode === 'quick' && styles.modeButtonTextActive]}>
              Quick
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'detailed' && styles.modeButtonActive]}
            onPress={handleModeSwitch}
          >
            <Ionicons 
              name="create" 
              size={18} 
              color={mode === 'detailed' ? '#fff' : theme.colors.primary} 
            />
            <Text style={[styles.modeButtonText, mode === 'detailed' && styles.modeButtonTextActive]}>
              Detailed
            </Text>
          </TouchableOpacity>
        </View>

        {/* QUICK MODE */}
        {mode === 'quick' && (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Quick Photo Action */}
            <Surface style={styles.quickPhotoSection} elevation={2}>
              <View style={styles.quickPhotoHeader}>
                <Ionicons name="camera" size={24} color={theme.colors.primary} />
                <Text style={styles.quickPhotoTitle}>Add Photo</Text>
              </View>
              
              {photos.length === 0 ? (
                <View style={styles.quickPhotoActions}>
                  <TouchableOpacity style={styles.quickActionButton} onPress={takePhoto}>
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.quickActionGradient}
                    >
                      <Ionicons name="camera" size={32} color="#fff" />
                      <Text style={styles.quickActionText}>Take Photo</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.quickActionButton} onPress={pickImages}>
                    <LinearGradient
                      colors={['#13b6b3', '#1a7cae']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.quickActionGradient}
                    >
                      <Ionicons name="images" size={32} color="#fff" />
                      <Text style={styles.quickActionText}>Choose Photo</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.quickPhotoPreview}>
                  <Image source={{ uri: photos[0] }} style={styles.quickPhoto} />
                  <TouchableOpacity 
                    style={styles.quickPhotoRemove}
                    onPress={() => removePhoto(0)}
                  >
                    <Ionicons name="close-circle" size={28} color="#ff4444" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickPhotoChange}
                    onPress={pickImages}
                  >
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text style={styles.quickPhotoChangeText}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Surface>

            {/* Quick Note */}
            <Surface style={styles.quickNoteSection} elevation={1}>
              <View style={styles.quickNoteHeader}>
                <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.quickNoteTitle}>Quick Note (Optional)</Text>
              </View>
              <TextInput
                style={styles.quickNoteInput}
                placeholder="How was it? Any quick thoughts..."
                placeholderTextColor="#999"
                value={quickNote}
                onChangeText={setQuickNote}
                multiline
                maxLength={200}
                numberOfLines={3}
              />
              <Text style={styles.quickNoteCounter}>{quickNote.length}/200</Text>
            </Surface>

            {/* Quick Submit CTA */}
            <View style={styles.quickSubmitSection}>
              <TouchableOpacity
                style={styles.quickSubmitButton}
                onPress={handleQuickSubmit}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.quickSubmitGradient}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.quickSubmitText}>
                    {isSubmitting ? 'Saving...' : 'Record Visit'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.switchToDetailedButton} onPress={handleModeSwitch}>
                <Text style={styles.switchToDetailedText}>Want to add more details?</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* DETAILED MODE */}
        {mode === 'detailed' && (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Photos Section */}
            <Surface style={styles.section} elevation={1}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Photo Collage</Text>
                  {photos.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{photos.length}/10</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sectionSubtitle}>Share your favorite moments</Text>
              </View>

              <TouchableOpacity style={styles.addPhotoButton} onPress={pickImages}>
                <LinearGradient
                  colors={['#13b6b3', '#1a7cae']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addPhotoGradient}
                >
                  <Ionicons name="camera" size={32} color="#fff" />
                  <Text style={styles.addPhotoText}>
                    {photos.length === 0 ? 'Add Photos' : 'Add More Photos'}
                  </Text>
                  <Text style={styles.addPhotoSubtext}>Up to 10 photos</Text>
                </LinearGradient>
              </TouchableOpacity>

              {photos.length > 0 && (
                <ScrollView horizontal style={styles.photosPreview} showsHorizontalScrollIndicator={false}>
                  {photos.map((photo, index) => (
                    <View key={index} style={styles.photoWrapper}>
                      <Image source={{ uri: photo }} style={styles.photo} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => removePhoto(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </Surface>

            {/* Diary Section */}
            <Surface style={styles.section} elevation={1}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Travel Diary</Text>
                  {diaryText && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{diaryText.length}/2000</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sectionSubtitle}>Document your experience</Text>
              </View>

              <View style={styles.inputContainer}>
                <LinearGradient
                  colors={['#f8f9fa', '#ffffff']}
                  style={styles.inputGradient}
                >
                  <TextInput
                    style={styles.diaryInput}
                    placeholder="Tell your story... What did you see? How did you feel? What made this place special?"
                    placeholderTextColor="#999"
                    value={diaryText}
                    onChangeText={setDiaryText}
                    multiline
                    maxLength={2000}
                    numberOfLines={8}
                  />
                </LinearGradient>
              </View>
            </Surface>

            {/* Travel Tips Section */}
            <Surface style={styles.section} elevation={1}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Travel Tips</Text>
                  {isPremium && parseTips().length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{parseTips().length}/5</Text>
                    </View>
                  )}
                  {!isPremium && (
                    <View style={[styles.countBadge, styles.premiumBadge]}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.premiumBadgeText}>Premium</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sectionSubtitle}>
                  {isPremium ? 'Help others plan their visit' : 'Upgrade to share travel tips'}
                </Text>
              </View>

              {isPremium ? (
                <View style={styles.inputContainer}>
                  <LinearGradient
                    colors={['#f8f9fa', '#ffffff']}
                    style={styles.inputGradient}
                  >
                    <TextInput
                      style={styles.tipsInput}
                      placeholder="• Best time to visit&#10;• Must-try local food&#10;• Hidden gems nearby&#10;• Money-saving tips&#10;• Getting around"
                      placeholderTextColor="#999"
                      value={tipsText}
                      onChangeText={setTipsText}
                      multiline
                      numberOfLines={6}
                    />
                  </LinearGradient>
                </View>
              ) : (
                <View style={styles.premiumLockContainer}>
                  <Ionicons name="lock-closed" size={32} color="#ccc" />
                  <Text style={styles.premiumLockText}>Upgrade to Premium</Text>
                  <Text style={styles.premiumLockSubtext}>
                    Share your travel wisdom and help the community
                  </Text>
                </View>
              )}
            </Surface>

            {/* Detailed Submit Button */}
            <View style={styles.detailedSubmitSection}>
              <TouchableOpacity
                style={styles.detailedSubmitButton}
                onPress={handleDetailedSubmit}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.detailedSubmitGradient}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.detailedSubmitText}>
                    {isSubmitting ? 'Saving Your Story...' : 'Save Visit'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
} 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Photos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="images" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Photo Collage</Text>
                {photos.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{photos.length}/10</Text>
                  </View>
                )}
              </View>
            </View>

            <Surface style={styles.card}>
              <Text style={styles.sectionDescription}>
                Capture your adventure with up to 10 photos
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

              {photos.length > 0 ? (
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
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="images-outline" size={48} color={theme.colors.textLight} />
                  <Text style={styles.emptyText}>No photos yet</Text>
                  <Text style={styles.emptySubtext}>
                    Add photos to create your collage
                  </Text>
                </View>
              )}
            </Surface>
          </View>

          {/* Diary Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="journal" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Travel Diary</Text>
                {diaryText.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{diaryText.length}/2000</Text>
                  </View>
                )}
              </View>
            </View>

            <Surface style={styles.card}>
              <Text style={styles.sectionDescription}>
                Share your experience and memories
              </Text>

              <TextInput
                style={styles.diaryInput}
                placeholder="Write about your experience at this landmark...&#10;&#10;What did you see? How did it make you feel? Any interesting stories?"
                placeholderTextColor={theme.colors.textLight}
                multiline
                numberOfLines={8}
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

              {diaryText.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="journal-outline" size={48} color={theme.colors.textLight} />
                  <Text style={styles.emptyText}>No diary entry yet</Text>
                  <Text style={styles.emptySubtext}>
                    Share your thoughts and experiences
                  </Text>
                </View>
              )}
            </Surface>
          </View>

          {/* Travel Tips Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="bulb" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Travel Tips</Text>
                {!isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="diamond" size={12} color="#B8860B" />
                    <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                  </View>
                )}
                {isPremium && parseTips().length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{parseTips().length}/5</Text>
                  </View>
                )}
              </View>
            </View>

            <Surface style={styles.card}>
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
                  <Text style={styles.sectionDescription}>
                    Share helpful tips for future travelers (up to 5 tips)
                  </Text>

                  <TextInput
                    style={styles.tipsInput}
                    placeholder="• Best time to visit is early morning&#10;• Bring water and sunscreen&#10;• Book tickets online to skip the line&#10;• Local guide highly recommended&#10;• Great for photography at sunset"
                    placeholderTextColor={theme.colors.textLight}
                    multiline
                    numberOfLines={6}
                    value={tipsText}
                    onChangeText={setTipsText}
                    textAlignVertical="top"
                  />

                  <Text style={styles.tipsHint}>
                    💡 Start each line with • or - for bullet points
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

                  {parseTips().length === 0 && tipsText.length === 0 && (
                    <View style={styles.emptyState}>
                      <Ionicons name="bulb-outline" size={48} color={theme.colors.textLight} />
                      <Text style={styles.emptyText}>No tips yet</Text>
                      <Text style={styles.emptySubtext}>
                        Help future travelers with your insights
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Surface>
          </View>

          <View style={{ height: theme.spacing.xxl }} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  countBadgeText: {
    ...theme.typography.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
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
    ...theme.typography.caption,
    color: '#B8860B',
    fontWeight: '700',
    fontSize: 9,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  // Photos
  addPhotoButton: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
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
    width: (width - theme.spacing.lg * 2 - theme.spacing.lg * 2 - theme.spacing.sm * 2) / 3,
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
  // Diary
  diaryInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    minHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  characterWarning: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    marginTop: theme.spacing.sm,
    textAlign: 'right',
  },
  // Tips
  tipsInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    minHeight: 150,
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
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
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
    paddingVertical: theme.spacing.xl,
  },
  premiumTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: theme.spacing.md,
  },
  premiumSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  // Empty States
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptySubtext: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs / 2,
    textAlign: 'center',
  },
});
