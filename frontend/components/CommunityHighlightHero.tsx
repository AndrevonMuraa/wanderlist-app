import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CommunityHighlight {
  visit_id: string;
  user_id?: string;
  user_name: string;
  user_picture?: string;
  activity_id?: string;
  photo_url?: string;
  landmark_id?: string | null;
  landmark_name?: string;
  country_name?: string;
  source: 'landmark' | 'custom';
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  has_diary?: boolean;
}

interface CommunityHighlightHeroProps {
  highlight: CommunityHighlight;
  onPress?: () => void;
}

/**
 * Signature hero card for Social tab showing ONE dynamic featured community visit.
 * Uses the "hotness" algorithm on backend: (likes+1) * freshness, random from top 20.
 */
export default function CommunityHighlightHero({
  highlight,
  onPress,
}: CommunityHighlightHeroProps) {
  const width = SCREEN_WIDTH - 32;
  const height = width / 0.8; // 4:5 aspect

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[styles.container, { width, height }]}
      data-testid="community-highlight-hero"
    >
      {/* Photo */}
      {highlight.photo_url ? (
        <Image source={{ uri: highlight.photo_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.border }]} />
      )}

      {/* Top badge row */}
      <View style={styles.topRow}>
        <View style={styles.featuredBadge}>
          <Ionicons name="sparkles" size={11} color="#FFF" />
          <Text style={styles.featuredBadgeText}>Community highlight</Text>
        </View>
        {highlight.source === 'custom' && (
          <View style={styles.customBadge}>
            <Ionicons name="compass" size={11} color="#FFF" />
            <Text style={styles.customBadgeText}>Custom trip</Text>
          </View>
        )}
      </View>

      {/* Bottom gradient + content */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.landmark} numberOfLines={2}>
            {highlight.landmark_name || 'Unknown place'}
          </Text>
          {highlight.country_name && (
            <Text style={styles.country} numberOfLines={1}>{highlight.country_name}</Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.userBlock}>
              {highlight.user_picture ? (
                <Image source={{ uri: highlight.user_picture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={12} color="#FFF" />
                </View>
              )}
              <Text style={styles.userName} numberOfLines={1}>by {highlight.user_name}</Text>
            </View>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Ionicons name={highlight.is_liked ? 'heart' : 'heart-outline'} size={14} color={highlight.is_liked ? '#FF4B6E' : '#FFF'} />
                <Text style={styles.statText}>{highlight.likes_count}</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="chatbubble-outline" size={13} color="#FFF" />
                <Text style={styles.statText}>{highlight.comments_count}</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  topRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  featuredBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  customBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(201, 169, 97, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  customBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 80,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  landmark: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  country: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
