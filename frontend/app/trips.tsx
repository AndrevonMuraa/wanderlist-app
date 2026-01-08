import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface Trip {
  trip_id: string;
  name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  notes?: string;
  status: 'planned' | 'in_progress' | 'completed';
  landmark_count: number;
  visited_count: number;
  created_at: string;
}

export default function TripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Create trip form
  const [tripName, setTripName] = useState('');
  const [tripDestination, setTripDestination] = useState('');
  const [tripBudget, setTripBudget] = useState('');
  const [tripNotes, setTripNotes] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTrips();
  }, [filterStatus]);

  const loadTrips = async () => {
    try {
      const token = await getToken();
      const url = filterStatus === 'all' 
        ? `${BACKEND_URL}/api/trips`
        : `${BACKEND_URL}/api/trips?status=${filterStatus}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTrips(data);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  const handleCreateTrip = async () => {
    if (!tripName.trim() || !tripDestination.trim()) {
      return;
    }

    setCreating(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/trips`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tripName.trim(),
          destination: tripDestination.trim(),
          budget: tripBudget ? parseFloat(tripBudget) : null,
          notes: tripNotes.trim() || null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCreateModalVisible(false);
        setTripName('');
        setTripDestination('');
        setTripBudget('');
        setTripNotes('');
        await loadTrips();
        
        // Navigate to the new trip
        router.push(`/trip-detail/${result.trip_id}`);
      }
    } catch (error) {
      console.error('Error creating trip:', error);
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return '#3B82F6'; // Blue
      case 'in_progress':
        return '#10B981'; // Green
      case 'completed':
        return '#8B5CF6'; // Purple
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planned':
        return 'Planned';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const renderFilterButton = (status: string, label: string, icon: string) => {
    const isActive = filterStatus === status;
    return (
      <TouchableOpacity
        key={status}
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setFilterStatus(status)}
      >
        <Ionicons
          name={icon as any}
          size={16}
          color={isActive ? '#fff' : theme.colors.textSecondary}
        />
        <Text
          style={[
            styles.filterLabel,
            isActive && styles.filterLabelActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTripCard = (trip: Trip) => (
    <Surface key={trip.trip_id} style={styles.tripCard}>
      <TouchableOpacity
        style={styles.tripContent}
        onPress={() => router.push(`/trip-detail/${trip.trip_id}`)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.tripHeader}>
          <View style={styles.tripTitleRow}>
            <Text style={styles.tripName} numberOfLines={1}>
              {trip.name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(trip.status)}20` },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(trip.status) },
                ]}
              >
                {getStatusLabel(trip.status)}
              </Text>
            </View>
          </View>
          <View style={styles.destinationRow}>
            <Ionicons name="location" size={14} color={theme.colors.primary} />
            <Text style={styles.destinationText} numberOfLines={1}>
              {trip.destination}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.tripStats}>
          <View style={styles.statItem}>
            <Ionicons name="location" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>
              {trip.landmark_count} {trip.landmark_count === 1 ? 'landmark' : 'landmarks'}
            </Text>
          </View>
          {trip.budget && (
            <View style={styles.statItem}>
              <Ionicons name="wallet" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.statText}>${trip.budget.toFixed(0)}</Text>
            </View>
          )}
          {trip.landmark_count > 0 && (
            <View style={styles.statItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={theme.colors.success}
              />
              <Text style={styles.statText}>
                {trip.visited_count}/{trip.landmark_count} visited
              </Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {trip.landmark_count > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(trip.visited_count / trip.landmark_count) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round((trip.visited_count / trip.landmark_count) * 100)}%
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Surface>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading trips...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Trips</Text>
            <Text style={styles.subtitle}>
              {trips.length === 0
                ? 'No trips planned yet'
                : `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {renderFilterButton('all', 'All', 'apps')}
            {renderFilterButton('planned', 'Planned', 'calendar')}
            {renderFilterButton('in_progress', 'Active', 'navigate')}
            {renderFilterButton('completed', 'Completed', 'checkmark-circle')}
          </ScrollView>
        </View>

        {/* Trips List */}
        {trips.length > 0 ? (
          <View style={styles.tripsContainer}>
            {trips.map(trip => renderTripCard(trip))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="airplane-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No Trips Yet</Text>
            <Text style={styles.emptyText}>
              Start planning your next adventure by creating your first trip
            </Text>
            <TouchableOpacity
              style={styles.createTripButton}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.createTripButtonText}>Create Trip</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>

      {/* Create Trip Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Trip</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Trip Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Trip Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Summer Europe Adventure"
                  placeholderTextColor={theme.colors.textLight}
                  value={tripName}
                  onChangeText={setTripName}
                  maxLength={100}
                />
              </View>

              {/* Destination */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Destination *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., France, Italy, Spain"
                  placeholderTextColor={theme.colors.textLight}
                  value={tripDestination}
                  onChangeText={setTripDestination}
                  maxLength={100}
                />
              </View>

              {/* Budget */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Budget (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 5000"
                  placeholderTextColor={theme.colors.textLight}
                  value={tripBudget}
                  onChangeText={setTripBudget}
                  keyboardType="numeric"
                />
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add any notes about your trip..."
                  placeholderTextColor={theme.colors.textLight}
                  value={tripNotes}
                  onChangeText={setTripNotes}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>
            </ScrollView>

            {/* Create Button */}
            <TouchableOpacity
              style={[
                styles.modalButton,
                (!tripName.trim() || !tripDestination.trim()) && styles.modalButtonDisabled,
              ]}
              onPress={handleCreateTrip}
              disabled={!tripName.trim() || !tripDestination.trim() || creating}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>
                  {creating ? 'Creating...' : 'Create Trip'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs / 2,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  filterContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  filterLabelActive: {
    color: '#fff',
  },
  tripsContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  tripCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  tripContent: {
    padding: theme.spacing.md,
  },
  tripHeader: {
    marginBottom: theme.spacing.md,
  },
  tripTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  tripName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    ...theme.typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  destinationText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  tripStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.full,
  },
  progressText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.lg,
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
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  createTripButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  createTripButtonText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButton: {
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonGradient: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  modalButtonText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
  },
});
