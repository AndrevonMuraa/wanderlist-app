import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

interface VisitSubmitButtonProps {
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  active?: boolean;
}

export default function VisitSubmitButton({
  onPress,
  loading,
  disabled = false,
  label = 'Record Visit',
  loadingLabel = 'Saving...',
  active = true,
}: VisitSubmitButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.9}
      style={styles.container}
      testID="visit-submit-button"
    >
      <LinearGradient
        colors={active ? [theme.colors.primary, theme.colors.secondary] : ['#78909C', '#546E7A']}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
        )}
        <Text style={styles.text}>{loading ? loadingLabel : label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
