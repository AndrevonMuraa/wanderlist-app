import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';
import { formatTimeAgo } from '../utils/formatTime';
import { TrustBadge } from './TrustBadge';

const PRIVACY_META: Record<string, { icon: string; color: string }> = {
  public: { icon: 'globe-outline', color: '#4CAF50' },
  friends: { icon: 'people-outline', color: '#2196F3' },
  private: { icon: 'lock-closed-outline', color: '#FF9800' },
};

interface FeedCardHeaderProps {
  userId?: string;
  userName: string;
  userPicture?: string;
  userTrusted?: boolean;
  timestamp?: string;
  visibility?: 'public' | 'friends' | 'private';
  onPress?: () => void;
}

/**
 * Shared header used by Friends- and Community-feed cards.
 * Renders avatar, name, trust badge, privacy dot and "time ago".
 */
export default function FeedCardHeader({
  userId,
  userName,
  userPicture,
  userTrusted,
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
      testID={userId ? `feed-card-header-${userId}` : 'feed-card-header'}
    >
      {userPicture ? (
        <View style={styles.avatarGlow}>
          <Avatar.Image size={44} source={{ uri: userPicture }} />
        </View>
      ) : (
        <View style={styles.avatarGlow}>
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={22} color={theme.colors.textLight} />
          </View>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{userName}</Text>
          <TrustBadge trusted={!!userTrusted} size={12} />
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
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232, 220, 200, 0.35)',
  },
  avatarGlow: {
    shadowColor: theme.colors.accentSand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 3,
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
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    flexShrink: 1,
  },
  privacyIcon: {
    marginLeft: 0,
  },
  time: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
});
