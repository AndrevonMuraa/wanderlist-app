import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
 * Window Card DNA: warm sand divider, spring-physics heart, haptic bump.
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
  const likeScale = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.3, useNativeDriver: true, speed: 40, bounciness: 14 }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
    ]).start();
    onLike();
  };

  const handleComment = () => {
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    onComment();
  };

  return (
    <View style={styles.actions}>
      <TouchableOpacity
        style={styles.btn}
        onPress={handleLike}
        disabled={likeDisabled}
        activeOpacity={0.7}
        data-testid={likeTestId}
      >
        <Animated.View style={{ transform: [{ scale: likeScale }] }}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? '#FF4B6E' : theme.colors.textSecondary}
          />
        </Animated.View>
        {likesCount > 0 && (
          <Text style={[styles.count, isLiked && styles.countActive]}>
            {likesCount}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={handleComment}
        disabled={commentDisabled}
        activeOpacity={0.7}
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
    gap: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSand,
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
