import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

interface FeedCardActionsProps {
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  onLike: () => void;
  onComment: () => void;
  likeDisabled?: boolean;
  commentDisabled?: boolean;
  likeTestId?: string;
  commentTestId?: string;
  /** Optional right-aligned extra (e.g. upvotes pill for community cards). */
  rightExtra?: React.ReactNode;
}

/**
 * Shared actions row used by Friends- and Community-feed cards.
 * Always renders Like + Comment buttons side-by-side.
 */
export default function FeedCardActions({
  isLiked,
  likesCount,
  commentsCount,
  onLike,
  onComment,
  likeDisabled = false,
  commentDisabled = false,
  likeTestId,
  commentTestId,
  rightExtra,
}: FeedCardActionsProps) {
  return (
    <View style={styles.actions}>
      <TouchableOpacity
        style={styles.btn}
        onPress={onLike}
        disabled={likeDisabled}
        data-testid={likeTestId}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={20}
          color={isLiked ? '#FF4B6E' : theme.colors.textSecondary}
        />
        {likesCount > 0 && (
          <Text style={[styles.count, isLiked && styles.countActive]}>
            {likesCount}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={onComment}
        disabled={commentDisabled}
        data-testid={commentTestId}
      >
        <Ionicons name="chatbubble-outline" size={19} color={theme.colors.textSecondary} />
        {commentsCount > 0 && (
          <Text style={styles.count}>{commentsCount}</Text>
        )}
      </TouchableOpacity>

      {!!rightExtra && <View style={styles.rightExtra}>{rightExtra}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  count: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  countActive: {
    color: '#FF4B6E',
  },
  rightExtra: {
    marginLeft: 'auto',
  },
});
