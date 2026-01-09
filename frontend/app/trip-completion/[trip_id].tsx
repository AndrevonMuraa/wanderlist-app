import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Text, Surface, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import CelebrationEffect from '../components/CelebrationEffect';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface TripLandmark {
  trip_landmark_id: string;
  landmark: {
    landmark_id: string;
    name: string;
    country_name: string;
    points: number;
    category: string;
  };
  visited: boolean;
}

export default function TripCompletionScreen() {
  const { trip_id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [tripName, setTripName] = useState('');
  const [landmarks, setLandmarks] = useState<TripLandmark[]>([]);
  const [selectedLandmarks, setSelectedLandmarks] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [completionStats, setCompletionStats] = useState<any>(null);

  useEffect(() => {
    loadTripForCompletion();
  }, []);

  const loadTripForCompletion = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/trips/${trip_id}/complete-review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTripName(data.trip.name);
        setLandmarks(data.landmarks);
        // Pre-select all landmarks by default
        const allIds = new Set(data.landmarks.map((l: TripLandmark) => l.trip_landmark_id));
        setSelectedLandmarks(allIds);
      }
    } catch (error) {
      console.error('Error loading trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLandmark = (tripLandmarkId: string) => {
    setSelectedLandmarks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tripLandmarkId)) {
        newSet.delete(tripLandmarkId);
      } else {
        newSet.add(tripLandmarkId);
      }
      return newSet;
    });
  };

  const handleCompleteTrip = async () => {
    if (selectedLandmarks.size === 0) {
      Alert.alert('No Landmarks Selected', 'Please select at least one landmark you visited');
      return;
    }

    Alert.alert(
      'Complete Trip',
      `Convert ${selectedLandmarks.size} ${selectedLandmarks.size === 1 ? 'landmark' : 'landmarks'} to visits and mark trip as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: completeTrip,
        },
      ]
    );
  };

  const completeTrip = async () => {
    setCompleting(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/trips/${trip_id}/convert-to-visits`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Array.from(selectedLandmarks)),
      });

      if (response.ok) {
        const stats = await response.json();
        setCompletionStats(stats);
        setShowCelebration(true);
        
        // After celebration, navigate back
        setTimeout(() => {
          router.back();
        }, 4000);
      } else {
        Alert.alert('Error', 'Failed to complete trip');
      }
    } catch (error) {
      console.error('Error completing trip:', error);
      Alert.alert('Error', 'Failed to complete trip');
    } finally {
      setCompleting(false);
    }
  };

  const selectedCount = selectedLandmarks.size;
  const totalPoints = landmarks
    .filter(l => selectedLandmarks.has(l.trip_landmark_id))
    .reduce((sum, l) => sum + l.landmark.points, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showCelebration && completionStats) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CelebrationEffect colors={['#FFD700', '#FFA500', '#FF6B6B']} />
        <View style={styles.celebrationContainer}>
          <Ionicons name="trophy" size={80} color="#FFD700" />
          <Text style={styles.celebrationTitle}>Trip Completed! 🎉</Text>
          <Text style={styles.celebrationSubtitle}>{completionStats.trip_name}</Text>
          
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Ionicons name="location" size={24} color={theme.colors.primary} />
              <Text style={styles.statText}>
                {completionStats.visits_created} {completionStats.visits_created === 1 ? 'landmark' : 'landmarks'} visited
              </Text>
            </View>
            
            <View style={styles.statRow}>
              <Ionicons name="earth" size={24} color={theme.colors.success} />
              <Text style={styles.statText}>
                {completionStats.countries_visited} {completionStats.countries_visited === 1 ? 'country' : 'countries'} explored
              </Text>
            </View>
            
            <View style={styles.statRow}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.statText}>
                {completionStats.total_points} points earned
              </Text>
            </View>
          </View>
          
          <Text style={styles.celebrationMessage}>
            Great adventure! Your visits have been saved.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Complete Trip
        </Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Trip Info */}
        <Surface style={styles.infoCard}>
          <Text style={styles.tripName}>{tripName}</Text>
          <Text style={styles.instructionText}>
            Select the landmarks you actually visited during your trip
          </Text>
        </Surface>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Selected</Text>
            <Text style={styles.summaryValue}>{selectedCount}/{landmarks.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Points</Text>
            <Text style={styles.summaryValue}>{totalPoints}</Text>
          </View>
        </View>

        {/* Landmarks Checklist */}
        <View style={styles.landmarksContainer}>
          {landmarks.map((item) => {
            const isSelected = selectedLandmarks.has(item.trip_landmark_id);
            return (
              <Surface key={item.trip_landmark_id} style={styles.landmarkCard}>
                <TouchableOpacity
                  style={styles.landmarkContent}
                  onPress={() => toggleLandmark(item.trip_landmark_id)}
                  activeOpacity={0.7}
                >
                  <Checkbox
                    status={isSelected ? 'checked' : 'unchecked'}
                    onPress={() => toggleLandmark(item.trip_landmark_id)}
                    color={theme.colors.primary}
                  />

                  <View style={styles.landmarkInfo}>
                    <Text style={styles.landmarkName} numberOfLines={1}>
                      {item.landmark.name}
                    </Text>
                    <View style={styles.landmarkMeta}>
                      <Text style={styles.landmarkCountry}>{item.landmark.country_name}</Text>
                      <View style={styles.pointsBadge}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.pointsText}>{item.landmark.points} pts</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Surface>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Complete Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            (selectedCount === 0 || completing) && styles.completeButtonDisabled,
          ]}
          onPress={handleCompleteTrip}
          disabled={selectedCount === 0 || completing}
        >
          <LinearGradient
            colors={[theme.colors.success, '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.completeButtonGradient}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.completeButtonText}>
              {completing ? 'Completing...' : `Complete Trip (${selectedCount})`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
  infoCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  tripName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  instructionText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  landmarksContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  landmarkCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  landmarkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  landmarkInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  landmarkName: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  landmarkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  landmarkCountry: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 11,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.lg,
  },
  completeButton: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  completeButtonText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  celebrationTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  celebrationSubtitle: {
    ...theme.typography.h3,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  statsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    ...theme.shadows.md,
    gap: theme.spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  statText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  celebrationMessage: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    lineHeight: 22,
  },
});
