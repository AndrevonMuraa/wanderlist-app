import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { getProgressToNextRank } from '../utils/rankSystem';
import theme from '../styles/theme';

interface RankProgressProps {
  points: number;
}

export default function RankProgress({ points }: RankProgressProps) {
  const progress = getProgressToNextRank(points);
  const { currentRank, nextRank, pointsNeededForNext, progressPercentage } = progress;

  if (!nextRank) {
    // Max rank reached
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.currentRankText}>{currentRank.name}</Text>
          <Text style={styles.maxRankText}>MAX RANK</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={currentRank.gradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBar, { width: '100%' as any }]}
          />
        </View>
        <Text style={styles.maxRankDescription}>
          You've reached legendary status! 👑
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.currentRankText, { color: currentRank.color }]}>
          {currentRank.name}
        </Text>
        <Text style={[styles.nextRankText, { color: nextRank.color }]}>
          {nextRank.name}
        </Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <LinearGradient
          colors={currentRank.gradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressBar, { width: `${progressPercentage}%` as any }]}
        />
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.pointsText}>
          {pointsNeededForNext} points to {nextRank.name}
        </Text>
        <Text style={styles.percentageText}>
          {progressPercentage.toFixed(0)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  currentRankText: {
    ...theme.typography.h3,
    fontWeight: '700',
  },
  nextRankText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  maxRankText: {
    ...theme.typography.body,
    fontWeight: '700',
    color: '#1E8A8A',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  percentageText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
  },
  maxRankDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
