import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import CommentItem from './CommentItem';
import { BACKEND_URL } from '../utils/config';

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

interface CommentsSectionProps {
  activityId: string;
  commentsCount: number;
  currentUserId: string;
  onCommentsChange?: (newCount: number) => void;
}

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

export default function CommentsSection({
  activityId,
  commentsCount,
  currentUserId,
  onCommentsChange,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (expanded && comments.length === 0) {
      loadComments();
    }
  }, [expanded]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/activities/${activityId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/activities/${activityId}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: commentText.trim(),
          parent_comment_id: replyingTo?.comment_id || null,
        }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setComments([...comments, newComment]);
        setCommentText('');
        setReplyingTo(null);
        
        // Update parent component
        if (onCommentsChange) {
          onCommentsChange(comments.length + 1);
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    const comment = comments.find(c => c.comment_id === commentId);
    if (!comment) return;

    const method = comment.is_liked ? 'DELETE' : 'POST';
    
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/comments/${commentId}/like`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setComments(comments.map(c =>
          c.comment_id === commentId
            ? {
                ...c,
                is_liked: !c.is_liked,
                likes_count: c.is_liked ? c.likes_count - 1 : c.likes_count + 1,
              }
            : c
        ));
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setComments(comments.filter(c => c.comment_id !== commentId));
        
        // Update parent component
        if (onCommentsChange) {
          onCommentsChange(comments.length - 1);
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    setExpanded(true);
  };

  // Organize comments into parent and replies
  const parentComments = comments.filter(c => !c.parent_comment_id);
  const getReplies = (commentId: string) =>
    comments.filter(c => c.parent_comment_id === commentId);

  return (
    <View style={styles.container}>
      {/* Comments Toggle */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Ionicons
          name="chatbubble-outline"
          size={16}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.toggleText}>
          {commentsCount === 0
            ? 'Be the first to comment'
            : commentsCount === 1
            ? '1 comment'
            : `${commentsCount} comments`}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Comments List */}
      {expanded && (
        <View style={styles.commentsContainer}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet</Text>
          ) : (
            <View>
              {parentComments.map(comment => (
                <View key={comment.comment_id}>
                  <CommentItem
                    comment={comment}
                    currentUserId={currentUserId}
                    onLike={handleLikeComment}
                    onReply={handleReply}
                    onDelete={handleDeleteComment}
                  />
                  {/* Render replies */}
                  {getReplies(comment.comment_id).map(reply => (
                    <CommentItem
                      key={reply.comment_id}
                      comment={reply}
                      currentUserId={currentUserId}
                      isReply
                      onLike={handleLikeComment}
                      onReply={handleReply}
                      onDelete={handleDeleteComment}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Comment Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inputContainer}
          >
            {replyingTo && (
              <View style={styles.replyingBanner}>
                <Text style={styles.replyingText}>
                  Replying to <Text style={styles.replyingName}>@{replyingTo.user_name}</Text>
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Add a comment..."
                placeholderTextColor={theme.colors.textLight}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  toggleText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  commentsContainer: {
    marginTop: theme.spacing.sm,
  },
  noComments: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
    fontStyle: 'italic',
  },
  inputContainer: {
    marginTop: theme.spacing.md,
  },
  replyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceTinted,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  replyingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  replyingName: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surfaceTinted,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
