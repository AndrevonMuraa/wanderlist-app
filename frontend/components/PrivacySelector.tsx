import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

interface PrivacySelectorProps {
  selected: 'public' | 'friends' | 'private';
  onChange: (value: 'public' | 'friends' | 'private') => void;
}

export const PrivacySelector: React.FC<PrivacySelectorProps> = ({ selected, onChange }) => {
  const options: Array<{
    value: 'public' | 'friends' | 'private';
    icon: string;
    label: string;
    description: string;
  }> = [
    {
      value: 'public',
      icon: 'globe',
      label: 'Public',
      description: 'Visible to everyone',
    },
    {
      value: 'friends',
      icon: 'people',
      label: 'Friends Only',
      description: 'Only friends can see',
    },
    {
      value: 'private',
      icon: 'lock-closed',
      label: 'Private',
      description: 'Only you can see',
    },
  ];

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
              <Ionicons
                name={option.icon as any}
                size={20}
                color={isSelected ? '#fff' : theme.colors.textSecondary}
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconCircleSelected: {
    backgroundColor: theme.colors.primary,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: theme.colors.primary,
  },
  optionDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
