import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';
import CommentsSection from './CommentsSection';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  activityId: string | null;
  commentsCount: number;
  currentUserId: string;
  onCommentsChange?: (newCount: number) => void;
}

/**
 * Bottom-sheet modal that wraps CommentsSection so it can be opened
 * from either the Community or Friends feed card.
 */
export default function CommentsModal({
  visible,
  onClose,
  activityId,
  commentsCount,
  currentUserId,
  onCommentsChange,
}: CommentsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} data-testid="comments-modal-title">Comments</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              data-testid="comments-modal-close"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.body}
          >
            {activityId ? (
              <ScrollView
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <CommentsSection
                  activityId={activityId}
                  commentsCount={commentsCount}
                  currentUserId={currentUserId}
                  onCommentsChange={onCommentsChange}
                  forceExpanded
                />
              </ScrollView>
            ) : (
              <Text style={styles.noneText}>Comments unavailable</Text>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '55%',
    paddingTop: 6,
    paddingHorizontal: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
    paddingTop: 4,
  },
  noneText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 24,
  },
});
