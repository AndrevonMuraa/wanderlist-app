import React from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

interface DiarySectionProps {
  diary: string;
  onDiaryChange: (text: string) => void;
  shareDiary: boolean;
  onShareDiaryChange: (value: boolean) => void;
  placeholder?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

export default function DiarySection({
  diary,
  onDiaryChange,
  shareDiary,
  onShareDiaryChange,
  placeholder = 'Share your experience...',
  maxLength = 500,
  showCharCount = false,
}: DiarySectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.diaryHeader}>
        <Text style={styles.sectionTitle}>Travel Diary (Optional)</Text>
        <TouchableOpacity
          style={styles.shareDiaryToggle}
          onPress={() => onShareDiaryChange(!shareDiary)}
          data-testid="share-diary-toggle"
        >
          <Ionicons
            name={shareDiary ? 'eye' : 'eye-off'}
            size={18}
            color={shareDiary ? theme.colors.primary : theme.colors.textLight}
          />
          <Text style={[styles.shareDiaryLabel, shareDiary && { color: theme.colors.primary }]}>
            {shareDiary ? 'Shared' : 'Hidden'}
          </Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.diaryInput}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textLight}
        value={diary}
        onChangeText={onDiaryChange}
        multiline
        numberOfLines={6}
        inputAccessoryViewID="keyboard-done-bar"
        maxLength={maxLength}
      />
      {showCharCount && (
        <Text style={styles.charCounter}>{diary.length}/{maxLength}</Text>
      )}
    </View>
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
  },
  diaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  shareDiaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shareDiaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textLight,
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
  charCounter: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
});
