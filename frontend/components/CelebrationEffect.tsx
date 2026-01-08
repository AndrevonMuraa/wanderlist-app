import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width, height } = Dimensions.get('window');

interface CelebrationEffectProps {
  show: boolean;
  type?: 'landmark' | 'country' | 'continent' | 'milestone';
  onComplete?: () => void;
}

export default function CelebrationEffect({ 
  show, 
  type = 'landmark',
  onComplete 
}: CelebrationEffectProps) {
  const confettiRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (show) {
      // Trigger confetti
      if (confettiRef.current) {
        confettiRef.current.start();
      }

      // Animate celebration badge
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1.2,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    }
  }, [show]);

  if (!show) return null;

  // Different confetti configurations based on type
  const getConfettiConfig = () => {
    switch (type) {
      case 'continent':
        return {
          count: 200,
          origin: { x: width / 2, y: height / 2 },
          explosionSpeed: 400,
          fallSpeed: 3000,
          colors: ['#9C27B0', '#E1BEE7', '#CE93D8', '#BA68C8', '#AB47BC'],
        };
      case 'country':
        return {
          count: 150,
          origin: { x: width / 2, y: height / 3 },
          explosionSpeed: 350,
          fallSpeed: 2500,
          colors: ['#4CAF50', '#81C784', '#66BB6A', '#4DB6AC', '#26A69A'],
        };
      case 'milestone':
        return {
          count: 100,
          origin: { x: width / 2, y: height / 3 },
          explosionSpeed: 300,
          fallSpeed: 2000,
          colors: ['#FFD700', '#FFA000', '#FF6F00', '#F57C00', '#FF9800'],
        };
      default: // landmark
        return {
          count: 80,
          origin: { x: width / 2, y: height / 4 },
          explosionSpeed: 250,
          fallSpeed: 1800,
          colors: ['#20B2AA', '#00BCD4', '#26C6DA', '#00ACC1', '#0097A7'],
        };
    }
  };

  const config = getConfettiConfig();

  return (
    <View style={styles.container} pointerEvents="none">
      <ConfettiCannon
        ref={confettiRef}
        count={config.count}
        origin={config.origin}
        explosionSpeed={config.explosionSpeed}
        fallSpeed={config.fallSpeed}
        colors={config.colors}
        fadeOut
        autoStart={false}
      />
      
      {/* Celebration Badge - optional central animation */}
      <Animated.View
        style={[
          styles.badge,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Badge content can be customized per type */}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
