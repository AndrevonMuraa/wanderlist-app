import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
import theme, { gradients } from '../styles/theme';

interface BrandedGlobeIconProps {
  size?: number;
  showPin?: boolean;
  showW?: boolean;
  variant?: 'gradient' | 'turquoise' | 'white';
  containerStyle?: 'rounded' | 'circle' | 'none';
}

/**
 * WanderList Branded Globe Icon
 * Design: Globe with latitude/longitude lines + "W" letter + Gold location pin
 * Colors: Ocean to Sand gradient (#4DB8D8 → #E8DCC8) + Gold accent (#C9A961)
 */
export default function BrandedGlobeIcon({ 
  size = 60, 
  showPin = true, 
  showW = true,
  variant = 'gradient',
  containerStyle = 'none'
}: BrandedGlobeIconProps) {
  const globeSize = containerStyle !== 'none' ? size * 0.7 : size;
  const strokeWidth = Math.max(2, globeSize * 0.04);
  const pinSize = globeSize * 0.3;
  
  // Colors based on variant
  const globeColors = {
    gradient: ['#4DB8D8', '#7DCBE3', '#C9CAAE', '#E8DCC8'],
    turquoise: ['#4DB8D8', '#4DB8D8'],
    white: ['#FFFFFF', '#FFFFFF'],
  };

  const renderGlobeSvg = () => (
    <Svg width={globeSize} height={globeSize} viewBox="0 0 100 100">
      {/* Globe circle */}
      <Circle
        cx="50"
        cy="50"
        r="45"
        stroke="white"
        strokeWidth={strokeWidth}
        fill={variant === 'turquoise' ? '#4DB8D8' : 'none'}
      />
      
      {/* Equator line */}
      <Line
        x1="8"
        y1="50"
        x2="92"
        y2="50"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={strokeWidth * 0.6}
      />
      
      {/* Meridian (vertical ellipse) */}
      <Ellipse
        cx="50"
        cy="50"
        rx="22"
        ry="45"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={strokeWidth * 0.5}
        fill="none"
      />
      
      {/* Top latitude line */}
      <Line
        x1="15"
        y1="32"
        x2="85"
        y2="32"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={strokeWidth * 0.4}
      />
      
      {/* Bottom latitude line */}
      <Line
        x1="15"
        y1="68"
        x2="85"
        y2="68"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={strokeWidth * 0.4}
      />
    </Svg>
  );

  const renderW = () => {
    if (!showW) return null;
    const fontSize = globeSize * 0.5;
    return (
      <Text style={[styles.wLetter, { fontSize, lineHeight: fontSize * 1.1 }]}>
        W
      </Text>
    );
  };

  const renderPin = () => {
    if (!showPin) return null;
    return (
      <View style={[styles.pinContainer, { 
        top: -pinSize * 0.15, 
        right: -pinSize * 0.15,
        width: pinSize,
        height: pinSize,
      }]}>
        <View style={[styles.pinBody, { 
          width: pinSize * 0.8, 
          height: pinSize * 0.8,
          borderRadius: pinSize * 0.4,
          borderWidth: Math.max(2, pinSize * 0.1),
        }]}>
          <View style={[styles.pinDot, {
            width: pinSize * 0.25,
            height: pinSize * 0.25,
            borderRadius: pinSize * 0.125,
          }]} />
        </View>
      </View>
    );
  };

  const renderContent = () => (
    <View style={[styles.globeContainer, { width: globeSize, height: globeSize }]}>
      {renderGlobeSvg()}
      <View style={styles.wContainer}>
        {renderW()}
      </View>
      {renderPin()}
    </View>
  );

  // Container wrapper based on style
  if (containerStyle === 'rounded') {
    return (
      <LinearGradient
        colors={gradients.oceanToSand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.roundedContainer, { 
          width: size, 
          height: size, 
          borderRadius: size * 0.22 
        }]}
      >
        {renderContent()}
      </LinearGradient>
    );
  }
  
  if (containerStyle === 'circle') {
    return (
      <View style={[styles.circleContainer, { 
        width: size, 
        height: size, 
        borderRadius: size / 2 
      }]}>
        <LinearGradient
          colors={gradients.oceanToSand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.circleGradient, { borderRadius: size / 2 }]}
        >
          {renderContent()}
        </LinearGradient>
      </View>
    );
  }

  // No container - just the globe on gradient
  return (
    <LinearGradient
      colors={gradients.oceanToSand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.inlineGlobe, { width: globeSize, height: globeSize, borderRadius: globeSize / 2 }]}
    >
      {renderGlobeSvg()}
      <View style={styles.wContainer}>
        {renderW()}
      </View>
      {renderPin()}
    </LinearGradient>
  );
}

// Simple header branding component for use in headers
export function HeaderBranding({ 
  size = 18, 
  textColor = '#2A2A2A',
  showText = true 
}: { 
  size?: number; 
  textColor?: string;
  showText?: boolean;
}) {
  return (
    <View style={styles.headerBranding}>
      <View style={[styles.miniGlobeContainer, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* Mini globe with gradient fill simulation */}
          <Circle cx="50" cy="50" r="46" fill="#4DB8D8" />
          {/* Equator */}
          <Line x1="8" y1="50" x2="92" y2="50" stroke="rgba(255,255,255,0.7)" strokeWidth="4" />
          {/* Meridian */}
          <Ellipse cx="50" cy="50" rx="22" ry="44" stroke="rgba(255,255,255,0.5)" strokeWidth="3" fill="none" />
          {/* Top latitude */}
          <Line x1="18" y1="32" x2="82" y2="32" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
          {/* Bottom latitude */}
          <Line x1="18" y1="68" x2="82" y2="68" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
        </Svg>
        {/* Mini W */}
        <Text style={[styles.miniW, { fontSize: size * 0.5 }]}>W</Text>
        {/* Mini Pin */}
        <View style={[styles.miniPin, { 
          width: size * 0.35, 
          height: size * 0.35,
          top: -size * 0.08,
          right: -size * 0.08,
        }]}>
          <View style={styles.miniPinInner} />
        </View>
      </View>
      {showText && (
        <Text style={[styles.brandText, { color: textColor, fontSize: size * 0.8 }]}>
          WanderList
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  globeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  wLetter: {
    fontFamily: 'Georgia',
    fontWeight: '800',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  pinContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBody: {
    backgroundColor: theme.colors.accent, // Gold #C9A961
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
    borderBottomLeftRadius: 0,
  },
  pinDot: {
    backgroundColor: 'white',
    transform: [{ rotate: '45deg' }],
  },
  roundedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  circleContainer: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  circleGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineGlobe: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Header branding styles
  headerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniGlobeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniW: {
    position: 'absolute',
    fontFamily: 'Georgia',
    fontWeight: '800',
    color: 'white',
  },
  miniPin: {
    position: 'absolute',
    backgroundColor: theme.colors.accent,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPinInner: {
    width: '40%',
    height: '40%',
    backgroundColor: 'white',
    borderRadius: 100,
  },
  brandText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
