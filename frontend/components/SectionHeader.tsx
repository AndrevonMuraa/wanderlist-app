import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

interface SectionHeaderProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  onSeeAll?: () => void;
  seeAllTestId?: string;
}

/**
 * Unified section header for Community-style lists.
 * Icon + title on the left, optional "See all →" on the right.
 */
export default function SectionHeader({
  icon,
  iconColor = theme.colors.accent,
  title,
  onSeeAll,
  seeAllTestId,
}: SectionHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {icon && <Ionicons name={icon} size={18} color={iconColor} />}
        <Text style={styles.title}>{title}</Text>
      </View>
      {onSeeAll && (
        <TouchableOpacity
          onPress={onSeeAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          data-testid={seeAllTestId}
        >
          <Text style={styles.link}>See all →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 20,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
