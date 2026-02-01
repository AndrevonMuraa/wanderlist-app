import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import theme from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';

interface ProgressBarProps {
  percentage: number;
  color?: string;
  height?: number;
  label?: string;
  showPercentage?: boolean;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  color,
  height = 8,
  label,
  showPercentage = true,
  style,
}) => {
  const { colors } = useTheme();
  const barColor = color || colors.primary;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  return (
    <View style={[styles.container, style]}>
      {(label || showPercentage) && (
        <View style={styles.header}>
          {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
          {showPercentage && <Text style={[styles.percentage, { color: colors.textSecondary }]}>{Math.round(clampedPercentage)}%</Text>}
        </View>
      )}
      <View style={[styles.track, { height, backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedPercentage}%`,
              backgroundColor: barColor,
              height,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  percentage: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  track: {
    width: '100%',
    backgroundColor: theme.colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 10,
  },
});
