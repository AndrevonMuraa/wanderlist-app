import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { VisitModalShell, PhotoSection, DiarySection, VisitSubmitButton } from './visit-shared';
import theme from '../styles/theme';

interface AddVisitModalProps {
  visible: boolean;
  onClose: () => void;
  landmarkName: string;
  landmarkId: string;
  onSubmit: (data: {
    photos: string[];
    diary_notes: string;
    share_diary: boolean;
    visibility?: string;
  }) => void;
  isPremium: boolean;
  defaultPrivacy?: 'public' | 'friends' | 'private';
}

const VISIBILITY_OPTIONS = [
  { value: 'public' as const, icon: 'globe-outline' as const, label: 'Public' },
  { value: 'friends' as const, icon: 'people-outline' as const, label: 'Friends Only' },
  { value: 'private' as const, icon: 'lock-closed-outline' as const, label: 'Private' },
];

import { TouchableOpacity } from 'react-native';

export default function AddVisitModal({
  visible,
  onClose,
  landmarkName,
  onSubmit,
  defaultPrivacy = 'public',
}: AddVisitModalProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [diaryText, setDiaryText] = useState('');
  const [shareDiary, setShareDiary] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>(defaultPrivacy);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (photos.length === 0) {
      Alert.alert(
        'Record Without Photo?',
        'Visits without a personal photo will not earn verified points for the global leaderboard.\n\nTo earn verified points, add a photo of yourself at the landmark.',
        [
          { text: 'Add Photo', style: 'cancel' },
          { text: 'Record Anyway', onPress: () => submitVisit() },
        ]
      );
      return;
    }
    await submitVisit();
  };

  const submitVisit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        photos,
        diary_notes: diaryText,
        share_diary: shareDiary,
        visibility,
      });
      setPhotos([]);
      setDiaryText('');
      setShareDiary(true);
      setVisibility(defaultPrivacy);
    } catch (error) {
      // handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VisitModalShell
      visible={visible}
      onClose={onClose}
      title={`Visit ${landmarkName}`}
      subtitle="Share your experience"
    >
      <PhotoSection
        photos={photos}
        onPhotosChange={setPhotos}
        onClose={onClose}
        showGuidelines
        showDisclaimer
      />

      <DiarySection
        diary={diaryText}
        onDiaryChange={setDiaryText}
        shareDiary={shareDiary}
        onShareDiaryChange={setShareDiary}
        placeholder={`Share your experience at ${landmarkName}...`}
        maxLength={2000}
        showCharCount
      />

      {/* Visibility Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Who Can See This Visit?</Text>
        <View style={styles.visibilityRow} data-testid="visibility-selector">
          {VISIBILITY_OPTIONS.map((opt) => {
            const isActive = visibility === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.visibilityChip, isActive && styles.visibilityChipActive]}
                onPress={() => setVisibility(opt.value)}
                activeOpacity={0.7}
                data-testid={`visibility-option-${opt.value}`}
              >
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={isActive ? '#fff' : theme.colors.textSecondary}
                />
                <Text style={[styles.visibilityChipText, isActive && styles.visibilityChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <VisitSubmitButton
        onPress={handleSubmit}
        loading={isSubmitting}
        label="Record Visit"
      />
    </VisitModalShell>
  );
}

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
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  visibilityChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  visibilityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  visibilityChipTextActive: {
    color: '#fff',
  },
});
