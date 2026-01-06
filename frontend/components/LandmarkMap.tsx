import React from 'react';
import { View, StyleSheet, Platform, Linking, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

interface LandmarkMapProps {
  latitude?: number | null;
  longitude?: number | null;
  landmarkName: string;
  height?: number;
}

export default function LandmarkMap({ latitude, longitude, landmarkName, height = 250 }: LandmarkMapProps) {
  // If no coordinates, show a message
  if (!latitude || !longitude) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.noLocationContainer}>
          <Ionicons name="map-outline" size={48} color={theme.colors.border} />
          <Text style={styles.noLocationText}>Location data coming soon</Text>
        </View>
      </View>
    );
  }

  const openInMaps = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${landmarkName})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    });
    
    if (url) {
      Linking.openURL(url);
    }
  };

  // For web and all platforms, show a simple location card
  return (
    <TouchableOpacity 
      style={[styles.container, { height }]} 
      onPress={openInMaps}
      activeOpacity={0.8}
    >
      <View style={styles.mapPlaceholder}>
        <View style={styles.iconContainer}>
          <Ionicons name="location" size={64} color={theme.colors.primary} />
        </View>
        <Text style={styles.landmarkText}>{landmarkName}</Text>
        <Text style={styles.coordsText}>
          📍 {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
        </Text>
        <View style={styles.openButton}>
          <Ionicons name="map" size={20} color={theme.colors.primary} />
          <Text style={styles.openButtonText}>Open in Maps</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
  },
  noLocationText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textLight,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceVariant,
  },
  iconContainer: {
    marginBottom: theme.spacing.md,
  },
  landmarkText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  coordsText: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.lg,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 8,
    gap: theme.spacing.sm,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
