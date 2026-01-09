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
