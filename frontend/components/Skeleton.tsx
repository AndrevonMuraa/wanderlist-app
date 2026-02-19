import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View 
      style={[
        styles.skeleton, 
        { width, height, borderRadius, opacity },
        style
      ]}
    >
      <LinearGradient
        colors={['#e0e0e0', '#f0f0f0', '#e0e0e0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

// Preset skeleton components
export const CountryCardSkeleton: React.FC = () => (
  <View style={styles.countryCardSkeleton}>
    <Skeleton height={220} borderRadius={24} />
  </View>
);

export const LandmarkCardSkeleton: React.FC = () => (
  <View style={styles.landmarkCardSkeleton}>
    <Skeleton height={200} borderRadius={16} style={{ marginBottom: 12 }} />
    <Skeleton width="70%" height={20} style={{ marginBottom: 8 }} />
    <Skeleton width="50%" height={16} />
  </View>
);

export const FriendCardSkeleton: React.FC = () => (
  <View style={styles.friendCardSkeleton}>
    <Skeleton width={56} height={56} borderRadius={28} style={{ marginRight: 16 }} />
    <View style={{ flex: 1 }}>
      <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={14} />
    </View>
  </View>
);

export const ProfileStatsSkeleton: React.FC = () => (
  <View style={styles.profileStatsSkeleton}>
    <View style={styles.statItemSkeleton}>
      <Skeleton width={40} height={40} borderRadius={20} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={14} />
    </View>
    <View style={styles.statItemSkeleton}>
      <Skeleton width={40} height={40} borderRadius={20} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={14} />
    </View>
    <View style={styles.statItemSkeleton}>
      <Skeleton width={40} height={40} borderRadius={20} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={14} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  countryCardSkeleton: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  landmarkCardSkeleton: {
    marginBottom: 16,
    padding: 16,
  },
  friendCardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  profileStatsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  statItemSkeleton: {
    alignItems: 'center',
  },
});
