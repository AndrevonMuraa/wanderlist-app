import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

// Only import MapView for native platforms
let MapView: any;
let Marker: any;
let PROVIDER_GOOGLE: any;

if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
  PROVIDER_GOOGLE = RNMaps.PROVIDER_GOOGLE;
}

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

  // For web, show a static Google Maps image
  if (Platform.OS === 'web') {
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=13&size=600x${height}&markers=color:red%7C${latitude},${longitude}&key=AIzaSyDummyKeyForDisplay`;
    
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.webMapContainer}>
          <View style={styles.webMapPlaceholder}>
            <Ionicons name="location" size={48} color={theme.colors.primary} />
            <Text style={styles.webMapText}>{landmarkName}</Text>
            <Text style={styles.webMapCoords}>
              📍 {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
            </Text>
            <Text style={styles.webMapLink}>
              Tap to open in Google Maps
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // For native platforms, use react-native-maps
  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={region}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation={false}
        showsMyLocationButton={false}
        zoomEnabled={true}
        scrollEnabled={true}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={landmarkName}
          description="📍 Landmark Location"
        >
          <View style={styles.markerContainer}>
            <Ionicons name="location" size={40} color={theme.colors.primary} />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
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
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMapContainer: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  webMapText: {
    marginTop: theme.spacing.md,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  webMapCoords: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.textLight,
  },
  webMapLink: {
    marginTop: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});
