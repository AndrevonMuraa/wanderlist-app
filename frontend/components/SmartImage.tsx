/**
 * <SmartImage>
 *
 * Drop-in replacement for `<Image>` that survives broken URLs gracefully.
 *
 * Behavior:
 *   1. While loading       → soft skeleton (subtle pulsing background)
 *   2. On successful load  → render the image as usual
 *   3. On error / 404 / 0  → render a fallback panel with an icon and
 *                            optional caption — no more silent empty boxes.
 *
 * Designed to match the existing app aesthetic (Penthouse Window theme)
 * and works with any container size. Pass `style` exactly as you would to
 * `<Image>`. The `uri` may be undefined/null/empty — this is treated as
 * "no photo" and renders the empty-state panel by default.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image as RNImage, ImageProps as RNImageProps, ImageResizeMode } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

export interface SmartImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  blurRadius?: number;
  /** Override the fallback icon shown when the image fails or is missing. */
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  /** Render a custom node instead of the default fallback. */
  fallback?: React.ReactNode;
  /** Container style applied around the image (skeleton + fallback share it). */
  containerStyle?: StyleProp<ViewStyle>;
  /** When true, render an empty `View` instead of a placeholder if uri is missing. */
  silentWhenMissing?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  /** Pass through any other Image prop you might need (e.g. defaultSource). */
  imageProps?: Partial<RNImageProps>;
}

type LoadState = 'loading' | 'ok' | 'error';

const SmartImage: React.FC<SmartImageProps> = ({
  uri,
  style,
  resizeMode = 'cover',
  blurRadius,
  fallbackIcon = 'image-outline',
  fallback,
  containerStyle,
  silentWhenMissing = false,
  testID,
  accessibilityLabel,
  imageProps,
}) => {
  const trimmed = typeof uri === 'string' ? uri.trim() : '';
  const hasUri = trimmed.length > 0;

  const [state, setState] = useState<LoadState>(hasUri ? 'loading' : 'error');
  const pulse = useRef(new Animated.Value(0.4)).current;

  // Reset state if the uri changes (e.g. user swipes to next photo)
  useEffect(() => {
    setState(hasUri ? 'loading' : 'error');
  }, [trimmed, hasUri]);

  // Skeleton pulse animation while loading
  useEffect(() => {
    if (state !== 'loading') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  const renderFallback = () => {
    if (silentWhenMissing && !hasUri) {
      return <View style={[style as ViewStyle, containerStyle]} testID={testID} />;
    }
    if (fallback) return <>{fallback}</>;
    return (
      <View
        style={[styles.fallback, style as ViewStyle, containerStyle]}
        testID={testID ? `${testID}-fallback` : undefined}
        accessibilityLabel={accessibilityLabel ?? 'Image unavailable'}
        accessibilityRole="image"
      >
        <Ionicons
          name={fallbackIcon}
          size={28}
          color={theme.colors.textLight ?? '#9B9B9B'}
        />
      </View>
    );
  };

  if (state === 'error' || !hasUri) {
    return renderFallback();
  }

  return (
    <View style={[styles.wrapper, containerStyle]} testID={testID}>
      {state === 'loading' && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.skeleton,
            style as ViewStyle,
            { opacity: pulse },
          ]}
        />
      )}
      <RNImage
        source={{ uri: trimmed }}
        style={[style, state !== 'ok' && styles.hidden]}
        resizeMode={resizeMode}
        blurRadius={blurRadius}
        onLoad={() => setState('ok')}
        onError={() => setState('error')}
        accessibilityLabel={accessibilityLabel}
        {...imageProps}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  skeleton: {
    position: 'absolute',
    backgroundColor: theme.colors.borderLight ?? '#F0EDE8',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hidden: {
    opacity: 0,
  },
  fallback: {
    backgroundColor: theme.colors.borderLight ?? '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SmartImage;
