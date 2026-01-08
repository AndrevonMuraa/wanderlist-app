import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../utils/config';
import theme from '../../styles/theme';
import AddVisitModal from '../../components/AddVisitModal';

// Helper to get token (works on both web and native)
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync('auth_token');
  }
};

export default function AddVisitScreen() {
  const { landmark_id, name } = useLocalSearchParams();
  const [landmark, setLandmark] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState('free');
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchLandmark();
    fetchUserData();
  }, []);

  const fetchLandmark = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/landmarks/${landmark_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLandmark(data);
        // Auto-open modal after loading
        setModalVisible(true);
      } else {
        Alert.alert('Error', 'Failed to load landmark details');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching landmark:', error);
      Alert.alert('Error', 'Failed to load landmark details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserTier(data.subscription_tier || 'free');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleSubmit = async (visitData: {
    photos: string[];
    diary_notes: string;
    travel_tips: string[];
  }) => {
    try {
      const token = await getToken();

      // Create visit with rich content
      const response = await fetch(`${BACKEND_URL}/api/visits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          landmark_id: landmark_id,
          photos: visitData.photos,
          photo_base64: visitData.photos.length > 0 ? visitData.photos[0] : null, // First photo as main
          diary_notes: visitData.diary_notes,
          travel_tips: visitData.travel_tips,
          comments: '', // Legacy field
        }),
      });

      if (response.status === 403) {
        const errorData = await response.json();
        Alert.alert(
          'Premium Required',
          errorData.detail || 'This is a premium landmark',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => {/* Handle upgrade */} },
          ]
        );
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to create visit');
      }

      const result = await response.json();

      // Show success message
      Alert.alert(
        '🎉 Visit Recorded!',
        `You earned ${result.points_earned} points${
          result.newly_awarded_badges && result.newly_awarded_badges.length > 0
            ? `\n\n✨ New badge unlocked: ${result.newly_awarded_badges[0].name}!`
            : ''
        }`,
        [
          {
            text: 'Great!',
            onPress: () => {
              setModalVisible(false);
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting visit:', error);
      Alert.alert('Error', 'Failed to save your visit. Please try again.');
      throw error; // Re-throw to keep modal open
    }
  };

  const handleClose = () => {
    setModalVisible(false);
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading landmark...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Add Visit</Text>
          <Text style={styles.headerSubtitle}>{landmark?.name || name}</Text>
        </View>
      </View>

      {/* Modern Modal Component */}
      {landmark && (
        <AddVisitModal
          visible={modalVisible}
          onClose={handleClose}
          landmarkName={landmark.name}
          landmarkId={landmark_id as string}
          onSubmit={handleSubmit}
          isPremium={userTier === 'premium'}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
