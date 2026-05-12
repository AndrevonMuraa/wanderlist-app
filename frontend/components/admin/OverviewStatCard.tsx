import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DeltaBadge from './DeltaBadge';
import { formatCompactNumber, formatFullNumber } from '../../utils/formatters';

interface OverviewStatCardProps {
  title: string;
  value: number | null | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  /** Weekly delta (or any number). Use undefined to hide the badge entirely. */
  delta?: number | null;
  /** Suffix for the delta pill, e.g. "this week" */
  deltaSuffix?: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  testID?: string;
}

/**
 * Unified vertical stat card used in the Admin Overview grid.
 *
 *   ┌────────────────────────┐
 *   │ [icon]   Total Users   │ ← header row: icon (tinted) + small label
 *   │                        │
 *   │   1.5K                 │ ← large compact number, auto-shrinks
 *   │   ↗ +12 this week      │ ← delta badge (or neutral when 0/null)
 *   └────────────────────────┘
 *
 * Guarantees:
 *  - Numbers never wrap vertically (`numberOfLines=1` + `adjustsFontSizeToFit`).
 *  - All 4 cards have identical structure for visual symmetry.
 *  - Delta pill is fixed-width-ish, never truncates mid-word.
 */
export default function OverviewStatCard({
  title,
  value,
  icon,
  accentColor,
  delta,
  deltaSuffix = 'this week',
  surfaceColor,
  textColor,
  mutedColor,
  testID,
}: OverviewStatCardProps) {
  const showDelta = delta !== undefined;
  return (
    <View
      style={[styles.card, { backgroundColor: surfaceColor }]}
      testID={testID ?? 'overview-stat-card'}
      accessibilityLabel={`${title}: ${formatFullNumber(value)}`}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: accentColor + '1A' }]}>
          <Ionicons name={icon} size={16} color={accentColor} />
        </View>
        <Text
          style={[styles.title, { color: mutedColor }]}
          numberOfLines={1}
          testID={`${testID ?? 'overview-stat-card'}-title`}
        >
          {title}
        </Text>
      </View>

      <Text
        style={[styles.value, { color: textColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        testID={`${testID ?? 'overview-stat-card'}-value`}
      >
        {formatCompactNumber(value)}
      </Text>

      {showDelta ? (
        <DeltaBadge
          delta={delta}
          suffix={deltaSuffix}
          testID={`${testID ?? 'overview-stat-card'}-delta`}
        />
      ) : (
        <View style={{ height: 18 }} /> // spacer to keep all cards same height
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    minHeight: 116,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    flexShrink: 1,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginVertical: 4,
  },
});
