import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeltaBadgeProps {
  /** Numeric delta. Use null/undefined to render a neutral "—" pill. */
  delta: number | null | undefined;
  /** Label suffix shown after the number, e.g. "this week" */
  suffix?: string;
  testID?: string;
}

/**
 * Compact delta pill: ↗ +12, ↘ -3, or — 0 (neutral muted).
 * Replaces the truncating "+0 this week" text and keeps a fixed visual size.
 */
export default function DeltaBadge({ delta, suffix, testID }: DeltaBadgeProps) {
  const n = typeof delta === 'number' && !Number.isNaN(delta) ? delta : 0;
  const hasData = delta !== null && delta !== undefined && !Number.isNaN(delta as number);

  let mode: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (hasData && n > 0) mode = 'positive';
  else if (hasData && n < 0) mode = 'negative';

  const palette = {
    positive: { bg: 'rgba(16,185,129,0.10)', fg: '#059669', icon: 'arrow-up' as const },
    negative: { bg: 'rgba(220,38,38,0.10)', fg: '#DC2626', icon: 'arrow-down' as const },
    neutral: { bg: 'rgba(100,116,139,0.10)', fg: '#64748B', icon: 'remove' as const },
  }[mode];

  const prefix = mode === 'positive' ? '+' : mode === 'negative' ? '' : '';
  const display = hasData ? `${prefix}${n}` : '0';

  return (
    <View
      style={[styles.container, { backgroundColor: palette.bg }]}
      testID={testID ?? 'delta-badge'}
    >
      <Ionicons name={palette.icon} size={10} color={palette.fg} />
      <Text style={[styles.value, { color: palette.fg }]} numberOfLines={1}>
        {display}
      </Text>
      {suffix ? (
        <Text style={[styles.suffix, { color: palette.fg }]} numberOfLines={1}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  value: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  suffix: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 3,
    opacity: 0.85,
  },
});
