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
import CelebrationEffect from '../../components/CelebrationEffect';
import { checkLevelUp } from '../../utils/rankSystem';

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
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'landmark' | 'country' | 'continent' | 'milestone'>('landmark');
  const [userPoints, setUserPoints] = useState(0);
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
        setUserPoints(data.points || 0); // Track user points for level-up detection
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

      // Fetch updated user data to get new points and check for level-up
      const userToken = await getToken();
      const userResponse = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });
      
      let newUserPoints = userPoints;
      let rankedUp = false;
      let newRank = null;
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        newUserPoints = userData.points || 0;
        
        // Check for level-up
        newRank = checkLevelUp(userPoints, newUserPoints);
        if (newRank) {
          rankedUp = true;
        }
      }

      // Check for country or continent completion
      let celebrationMessage = `You earned ${result.points_earned} points`;
      let shouldCelebrate = false;
      let celebType: 'landmark' | 'country' | 'continent' | 'milestone' = 'landmark';

      // Priority: Continent > Country > Rank Up
      if (result.continent_completed) {
        celebrationMessage = `🌍 CONTINENT MASTERED!\n\nYou've completed all countries in ${result.completed_continent}!\n\n+${result.points_earned} points + 200 BONUS points!`;
        shouldCelebrate = true;
        celebType = 'continent';
      } else if (result.country_completed) {
        celebrationMessage = `🎊 COUNTRY COMPLETED!\n\nYou've visited all landmarks in ${result.completed_country_name}!\n\n+${result.points_earned} points + 50 BONUS points!`;
        shouldCelebrate = true;
        celebType = 'country';
      } else if (rankedUp && newRank) {
        celebrationMessage = `⭐ RANK UP!\n\nYou've advanced to ${newRank.name}!\n\n${newRank.description}\n\n+${result.points_earned} points earned!`;
        shouldCelebrate = true;
        celebType = 'milestone';
      }

      // Add badge info if available
      if (result.newly_awarded_badges && result.newly_awarded_badges.length > 0) {
        celebrationMessage += `\n\n✨ New badge unlocked: ${result.newly_awarded_badges[0].name}!`;
      }
      
      // Add rank up mention even if there's a country/continent completion
      if (rankedUp && newRank && (result.country_completed || result.continent_completed)) {
        celebrationMessage += `\n\n⭐ BONUS: You also ranked up to ${newRank.name}!`;
      }

      // Trigger celebration animation
      if (shouldCelebrate) {
        setCelebrationType(celebType);
        setShowCelebration(true);
      }

      // Show success message
      Alert.alert(
        shouldCelebrate ? '🎉 AMAZING ACHIEVEMENT!' : '🎉 Visit Recorded!',
        celebrationMessage,
        [
          {
            text: 'Awesome!',
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

      {/* Celebration Effect */}
      <CelebrationEffect
        show={showCelebration}
        type={celebrationType}
        onComplete={() => setShowCelebration(false)}
      />
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
