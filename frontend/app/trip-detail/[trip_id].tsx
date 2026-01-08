import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface TripDetail {
  trip_id: string;
  name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  notes?: string;
  status: string;
  landmark_count: number;
  visited_count: number;
  landmarks: Array<{
    trip_landmark_id: string;
    day_number?: number;
    notes?: string;
    visited: boolean;
    landmark: {
      landmark_id: string;
      name: string;
      country_name: string;
      category: string;
      points: number;
    };
  }>;
}

export default function TripDetailScreen() {
  const { trip_id } = useLocalSearchParams();
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTrip();
  }, []);

  const loadTrip = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/trips/${trip_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTrip(data);
      }
    } catch (error) {
      console.error('Error loading trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrip();
    setRefreshing(false);
  };

  const handleToggleVisited = async (tripLandmarkId: string, currentStatus: boolean) => {
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/trips/${trip_id}/landmarks/${tripLandmarkId}/visited?visited=${!currentStatus}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      await loadTrip();
    } catch (error) {
      console.error('Error toggling visited:', error);
    }
  };

  const handleRemoveLandmark = (tripLandmarkId: string, landmarkName: string) => {
    Alert.alert(
      'Remove Landmark',
      `Remove ${landmarkName} from this trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeLandmark(tripLandmarkId),
        },
      ]
    );
  };

  const removeLandmark = async (tripLandmarkId: string) => {
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/trips/${trip_id}/landmarks/${tripLandmarkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      await loadTrip();
    } catch (error) {
      console.error('Error removing landmark:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading trip...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Trip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = trip.landmark_count > 0 
    ? Math.round((trip.visited_count / trip.landmark_count) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {trip.name}
        </Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Trip Summary Card */}
        <Surface style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="location" size={20} color={theme.colors.primary} />
            <Text style={styles.destination}>{trip.destination}</Text>
          </View>

          {trip.budget && (
            <View style={styles.summaryRow}>
              <Ionicons name="wallet" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.summaryText}>Budget: ${trip.budget.toFixed(0)}</Text>
            </View>
          )}

          {trip.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText}>{trip.notes}</Text>
            </View>
          )}

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Trip Progress</Text>
              <Text style={styles.progressPercentage}>{progress}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressStats}>
              {trip.visited_count} of {trip.landmark_count} landmarks visited
            </Text>
          </View>
        </Surface>

        {/* Landmarks List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Landmarks</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push(`/(tabs)/explore`)}
            >
              <Ionicons name="add" size={20} color={theme.colors.primary} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {trip.landmarks.length > 0 ? (
            trip.landmarks.map((item) => (
              <Surface key={item.trip_landmark_id} style={styles.landmarkCard}>
                <View style={styles.landmarkContent}>
                  <View style={styles.landmarkLeft}>
                    <TouchableOpacity
                      onPress={() => handleToggleVisited(item.trip_landmark_id, item.visited)}
                      style={[
                        styles.checkbox,
                        item.visited && styles.checkboxChecked,
                      ]}
                    >
                      {item.visited && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </TouchableOpacity>

                    <View style={styles.landmarkInfo}>
                      <Text
                        style={[
                          styles.landmarkName,
                          item.visited && styles.landmarkNameVisited,
                        ]}
                        numberOfLines={1}
                      >
                        {item.landmark.name}
                      </Text>
                      <Text style={styles.landmarkLocation} numberOfLines={1}>
                        {item.landmark.country_name}
                      </Text>
                      {item.day_number && (
                        <Text style={styles.dayText}>Day {item.day_number}</Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemoveLandmark(item.trip_landmark_id, item.landmark.name)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.colors.textLight} />
                  </TouchableOpacity>
                </View>
              </Surface>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={48} color={theme.colors.textLight} />
              <Text style={styles.emptyTitle}>No Landmarks Yet</Text>
              <Text style={styles.emptyText}>
                Add landmarks from your bucket list or explore page
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: '#fff',
    fontWeight: '700',
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  summaryCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  destination: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  summaryText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  notesContainer: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  notesText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  progressSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  progressPercentage: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.full,
  },
  progressStats: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: `${theme.colors.primary}15`,
    borderRadius: theme.borderRadius.md,
  },
  addButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  landmarkCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  landmarkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  landmarkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  landmarkInfo: {
    flex: 1,
  },
  landmarkName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  landmarkNameVisited: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  landmarkLocation: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  dayText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
