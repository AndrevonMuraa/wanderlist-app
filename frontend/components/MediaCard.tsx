import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

export interface MediaCardProps {
  photoUrl?: string;
  title: string;
  subtitle?: string;
  userName?: string;
  userPicture?: string;
  isCustom?: boolean;
  likesCount?: number;
  commentsCount?: number;
  rankBadge?: number;
  onPress?: () => void;
  width?: number;
  aspect?: number; // height / width. default 1.25 = 4:5
  testID?: string;
}

/**
 * Unified MediaCard used by carousels on Community page and Top 10 grid.
 * Follows Card DNA from /app/design_guidelines.json.
 */
export default function MediaCard({
  photoUrl,
  title,
  subtitle,
  userName,
  userPicture,
  isCustom,
  likesCount = 0,
  commentsCount = 0,
  rankBadge,
  onPress,
  width = 170,
  aspect = 1.25,
  testID,
}: MediaCardProps) {
  const height = width * aspect;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, { width, height }]}
      data-testid={testID}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.border }]} />
      )}

      {/* Top badges */}
      <View style={styles.topRow}>
        {rankBadge !== undefined && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>#{rankBadge}</Text>
          </View>
        )}
        {isCustom && (
          <View style={styles.customPill}>
            <Ionicons name="compass" size={9} color="#FFF" />
            <Text style={styles.customPillText}>Custom</Text>
          </View>
        )}
      </View>

      {/* Bottom content + gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        locations={[0, 1]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          <View style={styles.metaRow}>
            {userName ? (
              <View style={styles.userBlock}>
                {userPicture ? (
                  <Image source={{ uri: userPicture }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={8} color="#FFF" />
                  </View>
                )}
                <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
              </View>
            ) : <View style={{ flex: 1 }} />}
            <View style={styles.stats}>
              {likesCount > 0 && (
                <View style={styles.stat}>
                  <Ionicons name="heart" size={10} color="#FF4B6E" />
                  <Text style={styles.statText}>{likesCount}</Text>
                </View>
              )}
              {commentsCount > 0 && (
                <View style={styles.stat}>
                  <Ionicons name="chatbubble" size={9} color="#FFF" />
                  <Text style={styles.statText}>{commentsCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  topRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  rankBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    minWidth: 30,
    alignItems: 'center',
  },
  rankBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  customPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(201, 169, 97, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 100,
  },
  customPillText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 40,
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 6,
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 10,
    fontWeight: '500',
    flexShrink: 1,
  },
  stats: {
    flexDirection: 'row',
    gap: 6,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
