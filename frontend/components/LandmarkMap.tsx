import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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
});
