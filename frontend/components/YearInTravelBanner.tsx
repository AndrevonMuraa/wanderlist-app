/**
 * YearInTravelBanner — Spotify Wrapped style invitation banner
 * shown at the top of the Feed. Tapping opens /year-in-travel.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';

const DEFAULT_RECAP_YEAR = 2025;

interface YearInTravelBannerProps {
  year?: number;
  testID?: string;
}

export const YearInTravelBanner: React.FC<YearInTravelBannerProps> = ({
  year = DEFAULT_RECAP_YEAR,
  testID = 'year-in-travel-banner',
}) => {
  const router = useRouter();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmer]);

  const sparkleScale = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.1] });
  const sparkleOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push(`/year-in-travel?year=${year}`)}
      testID={testID}
      style={styles.touchable}
    >
      <LinearGradient
        colors={['#1a0b2e', '#3d1f5c', '#0d3b66', '#1e8a8a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        {/* decorative orbs */}
        <View style={[styles.orb, styles.orbA]} />
        <View style={[styles.orb, styles.orbB]} />
        <View style={[styles.orb, styles.orbC]} />

        <View style={styles.left}>
          <View style={styles.pill}>
            <Animated.View style={{ transform: [{ scale: sparkleScale }], opacity: sparkleOpacity }}>
              <Ionicons name="sparkles" size={11} color="#FFD700" />
            </Animated.View>
            <Text style={styles.pillText}>WANDERMARK · {year}</Text>
          </View>
          <Text style={styles.title}>Your {year} on{'\n'}WanderMark</Text>
          <Text style={styles.subtitle}>The places, the photos, the year of memories — relive it.</Text>

          <View style={styles.cta}>
            <Text style={styles.ctaText}>Watch your recap</Text>
            <Ionicons name="play" size={11} color="#0d0a1a" style={{ marginLeft: 6 }} />
          </View>
        </View>

        <View style={styles.right}>
          <Animated.View
            style={[
              styles.heroBadge,
              { transform: [{ scale: sparkleScale }], opacity: sparkleOpacity },
            ]}
          >
            <Text style={styles.heroYear}>{year}</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 22,
    ...theme.shadows.lg,
    shadowColor: '#3d1f5c',
    shadowOpacity: 0.35,
  },
  banner: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 140,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbA: {
    width: 130,
    height: 130,
    backgroundColor: 'rgba(255, 215, 0, 0.16)',
    top: -40,
    right: -30,
  },
  orbB: {
    width: 90,
    height: 90,
    backgroundColor: 'rgba(255, 99, 198, 0.18)',
    bottom: -30,
    left: -20,
  },
  orbC: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(77, 184, 216, 0.22)',
    top: 30,
    right: 90,
  },
  left: {
    flex: 1,
    paddingRight: 12,
  },
  right: {
    width: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  pillText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  cta: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
  ctaText: {
    color: '#0d0a1a',
    fontSize: 12,
    fontWeight: '800',
  },
  heroBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 215, 0, 0.55)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  heroYear: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
});

export default YearInTravelBanner;
