import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Rank } from '../utils/rankSystem';

interface RankBadgeProps {
  rank: Rank;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  style?: ViewStyle;
}

export default function RankBadge({ 
  rank, 
  size = 'medium', 
  showName = true,
  style 
}: RankBadgeProps) {
  // Add safety check for rank object
  if (!rank || !rank.gradient || !rank.icon) {
    return null; // Return null if rank is invalid
  }

  const sizeConfig = {
    small: { badge: 40, icon: 20, fontSize: 10 },
    medium: { badge: 60, icon: 30, fontSize: 12 },
    large: { badge: 80, icon: 40, fontSize: 14 },
  };

  const config = sizeConfig[size];

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={rank.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.badge,
          {
            width: config.badge,
            height: config.badge,
            borderRadius: config.badge / 2,
          },
        ]}
      >
        <Ionicons name={rank.icon as any} size={config.icon} color="#fff" />
      </LinearGradient>
      
      {showName && (
        <View style={styles.nameContainer}>
          <Text style={[styles.rankName, { fontSize: config.fontSize + 2 }]}>
            {rank.name}
          </Text>
          <Text style={[styles.rankDescription, { fontSize: config.fontSize }]}>
            {rank.description}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  nameContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  rankName: {
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  rankDescription: {
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
});
