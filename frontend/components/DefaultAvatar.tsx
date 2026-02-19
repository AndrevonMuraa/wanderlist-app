import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';

interface DefaultAvatarProps {
  name: string;
  size?: number;
}

export const DefaultAvatar: React.FC<DefaultAvatarProps> = ({ name, size = 100 }) => {
  // Smart initials: handles full names, usernames, single names
  let initials = 'U';
  
  if (name) {
    const trimmed = name.trim();
    if (trimmed.includes(' ')) {
      // Full name with spaces: "Test User" → "TU"
      const words = trimmed.split(' ').filter(w => w.length > 0);
      initials = words
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();
    } else {
      // Username or single word: "testuser" → "TE", "John" → "JO"
      initials = trimmed.slice(0, 2).toUpperCase();
    }
  }

  const colors = [
    [theme.colors.primary, theme.colors.primaryDark],
    [theme.colors.accent, theme.colors.accentDark],
    ['#FF6B6B', '#E85858'],
    ['#66BB6A', '#4CAF50'],
    ['#4DB8D8', '#2E9AB5'],
  ];

  const colorIndex = name.charCodeAt(0) % colors.length;
  const [color1, color2] = colors[colorIndex];

  return (
    <LinearGradient
      colors={[color1, color2]}
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '700',
    color: '#fff',
  },
});
