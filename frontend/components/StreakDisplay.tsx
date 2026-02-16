import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  size?: 'small' | 'medium' | 'large';
}

export default function StreakDisplay({ 
  currentStreak, 
  longestStreak,
  size = 'medium' 
}: StreakDisplayProps) {
  const sizeConfig = {
    small: { flame: 24, number: 20, label: 10 },
    medium: { flame: 32, number: 28, label: 12 },
    large: { flame: 48, number: 36, label: 14 },
  };

  const config = sizeConfig[size];

  // Flame color based on streak
  const getFlameColor = () => {
    if (currentStreak >= 100) return ['#FF6B00', '#FF8E53']; // Hot orange
    if (currentStreak >= 30) return ['#FF4500', '#FF6347']; // Orange-red
    if (currentStreak >= 7) return ['#FFA500', '#FFD700']; // Orange-gold
    return ['#FF8C00', '#FFA500']; // Default orange
  };

  const flameGradient = getFlameColor();

  return (
    <View style={styles.container}>
      <View style={styles.streakSection}>
        <LinearGradient
          colors={flameGradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.flameContainer, { 
            width: config.flame + 20, 
            height: config.flame + 20,
            borderRadius: (config.flame + 20) / 2 
          }]}
        >
          <Ionicons name="flame" size={config.flame} color="#fff" />
        </LinearGradient>
        <View style={styles.streakInfo}>
          <Text style={[styles.streakNumber, { fontSize: config.number }]}>
            {currentStreak}
          </Text>
          <Text style={[styles.streakLabel, { fontSize: config.label }]}>
            Day Streak
          </Text>
        </View>
      </View>

      {longestStreak > currentStreak && (
        <View style={styles.longestSection}>
          <Ionicons name="trophy" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.longestText}>
            Best: {longestStreak} days
          </Text>
        </View>
      )}

      {currentStreak === 0 && (
        <Text style={styles.motivationText}>
          Visit a landmark today to start your streak! 🔥
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  streakSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  flameContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  streakInfo: {
    alignItems: 'flex-start',
  },
  streakNumber: {
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 36,
  },
  streakLabel: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  longestSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceTinted,
    borderRadius: theme.borderRadius.md,
  },
  longestText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  motivationText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
});
