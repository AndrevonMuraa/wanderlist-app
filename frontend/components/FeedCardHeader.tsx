import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';
import { formatTimeAgo } from '../utils/formatTime';

const PRIVACY_META: Record<string, { icon: string; color: string }> = {
  public: { icon: 'globe-outline', color: '#4CAF50' },
  friends: { icon: 'people-outline', color: '#2196F3' },
  private: { icon: 'lock-closed-outline', color: '#FF9800' },
};

interface FeedCardHeaderProps {
  userId?: string;
  userName: string;
  userPicture?: string;
  timestamp?: string;
  visibility?: 'public' | 'friends' | 'private';
  onPress?: () => void;
}

/**
 * Shared header used by Friends- and Community-feed cards.
 * Renders avatar, name, privacy dot and "time ago".
 */
export default function FeedCardHeader({
  userId,
  userName,
  userPicture,
  timestamp,
  visibility = 'public',
  onPress,
}: FeedCardHeaderProps) {
  const privacy = PRIVACY_META[visibility] || PRIVACY_META.public;

  return (
    <TouchableOpacity
      style={styles.header}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      data-testid={userId ? `feed-card-header-${userId}` : 'feed-card-header'}
    >
      {userPicture ? (
        <Avatar.Image size={44} source={{ uri: userPicture }} />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons name="person" size={22} color={theme.colors.textLight} />
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{userName}</Text>
          <Ionicons
            name={privacy.icon as any}
            size={12}
            color={privacy.color}
            style={styles.privacyIcon}
          />
        </View>
        {!!timestamp && (
          <Text style={styles.time}>{formatTimeAgo(timestamp)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    flexShrink: 1,
  },
  privacyIcon: {
    marginLeft: 6,
  },
  time: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
});
