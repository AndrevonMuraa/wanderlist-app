import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

interface Comment {
  comment_id: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  content: string;
  parent_comment_id?: string;
  reply_to_user?: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  isReply?: boolean;
  onLike: (commentId: string) => void;
  onReply: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function CommentItem({
  comment,
  currentUserId,
  isReply = false,
  onLike,
  onReply,
  onDelete,
}: CommentItemProps) {
  const [showActions, setShowActions] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(comment.comment_id),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      <Avatar.Image
        size={isReply ? 28 : 32}
        source={{ uri: comment.user_picture || 'https://via.placeholder.com/100' }}
        style={styles.avatar}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.userName}>{comment.user_name}</Text>
          <Text style={styles.timestamp}>{formatTimeAgo(comment.created_at)}</Text>
        </View>

        {comment.reply_to_user && (
          <Text style={styles.replyTo}>
            Replying to <Text style={styles.replyToName}>@{comment.reply_to_user}</Text>
          </Text>
        )}

        <Text style={styles.commentText}>{comment.content}</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLike(comment.comment_id)}
          >
            <Ionicons
              name={comment.is_liked ? 'heart' : 'heart-outline'}
              size={16}
              color={comment.is_liked ? '#FF6B6B' : theme.colors.textLight}
            />
            {comment.likes_count > 0 && (
              <Text style={styles.actionText}>{comment.likes_count}</Text>
            )}
          </TouchableOpacity>

          {!isReply && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onReply(comment)}
            >
              <Ionicons name="arrow-undo" size={16} color={theme.colors.textLight} />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={16} color={theme.colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  replyContainer: {
    marginLeft: theme.spacing.xl,
    paddingLeft: theme.spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
  },
  avatar: {
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  userName: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  timestamp: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  replyTo: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  replyToName: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  commentText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
});
