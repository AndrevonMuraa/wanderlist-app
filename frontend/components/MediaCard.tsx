import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  onLongPress?: () => void;
  width?: number;
  aspect?: number;
  testID?: string;
}

/**
 * Window Card — premium "penthouse window" treatment.
 * 1px sand border + warm shadow + matte inner frame on the photo.
 * Spring-physics press animation + light haptic tap.
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
  onLongPress,
  width = 170,
  aspect = 1.25,
  testID,
}: MediaCardProps) {
  const height = width * aspect;
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 8 }),
      Animated.spring(translateY, { toValue: 2, useNativeDriver: true, speed: 40, bounciness: 8 }),
    ]).start();
  };
  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 10 }),
    ]).start();
  };

  const handlePress = () => {
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    onPress?.();
  };

  const isTopThree = rankBadge !== undefined && rankBadge <= 3;

  return (
    <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        delayLongPress={450}
        style={[styles.card, { width, height }]}
        testID={testID}
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.border }]} />
        )}

        {/* Matte inner frame (penthouse window edge) */}
        <View pointerEvents="none" style={styles.innerFrame} />

        {/* Top badges */}
        <View style={styles.topRow}>
          {rankBadge !== undefined && (
            isTopThree ? (
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accentSand]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rankBadgeTop3}
              >
                <Text style={styles.rankBadgeTop3Text}>#{rankBadge}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>#{rankBadge}</Text>
              </View>
            )
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
                    <View style={styles.avatarGlow}>
                      <Image source={{ uri: userPicture }} style={styles.avatar} />
                    </View>
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
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Window Card DNA
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  innerFrame: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  topRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
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
  rankBadgeTop3: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    minWidth: 32,
    alignItems: 'center',
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  rankBadgeTop3Text: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowRadius: 2,
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
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
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
  avatarGlow: {
    shadowColor: theme.colors.accentSand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: 'rgba(255,255,255,0.9)',
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
