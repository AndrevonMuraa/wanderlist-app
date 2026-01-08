import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Dimensions,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import CommentsSection from '../../components/CommentsSection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface VisitDetail {
  visit_id: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  username?: string;
  landmark_id: string;
  landmark_name: string;
  country_name: string;
  landmark_image?: string;
  diary?: string;
  tips?: string[];
  photos?: string[];
  visited_at: string;
  points_earned: number;
}

export default function VisitDetailScreen() {
  const { visit_id } = useLocalSearchParams();
  const router = useRouter();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [commentsCount, setCommentsCount] = useState(0);

  useEffect(() => {
    loadVisitDetails();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.user_id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadVisitDetails = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/visits/${visit_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setVisit(data);
      }
    } catch (error) {
      console.error('Error loading visit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Visit',
      'Are you sure you want to delete this visit? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              const response = await fetch(`${BACKEND_URL}/api/visits/${visit_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                router.back();
              }
            } catch (error) {
              console.error('Error deleting visit:', error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderPhotoGallery = () => {
    if (!visit?.photos || visit.photos.length === 0) {
      return null;
    }

    return (
      <View style={styles.photoGallery}>
        <FlatList
          data={visit.photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `photo-${index}`}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSelectedPhotoIndex(index)}
            >
              <Image
                source={{ uri: item }}
                style={styles.photo}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
        />
        <View style={styles.photoCounter}>
          <Text style={styles.photoCounterText}>
            {visit.photos.length} {visit.photos.length === 1 ? 'photo' : 'photos'}
          </Text>
        </View>
      </View>
    );
  };

  const renderFullScreenPhoto = () => {
    if (selectedPhotoIndex === null || !visit?.photos) return null;

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhotoIndex(null)}
      >
        <View style={styles.fullScreenModal}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPhotoIndex(null)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          <FlatList
            data={visit.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedPhotoIndex}
            getItemLayout={(data, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            keyExtractor={(item, index) => `fullscreen-photo-${index}`}
            renderItem={({ item, index }) => (
              <View style={styles.fullScreenPhotoContainer}>
                <Image
                  source={{ uri: item }}
                  style={styles.fullScreenPhoto}
                  resizeMode="contain"
                />
                <Text style={styles.fullScreenPhotoCounter}>
                  {index + 1} / {visit.photos!.length}
                </Text>
              </View>
            )}
          />
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading visit...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Visit not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = currentUserId === visit.user_id;

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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Visit Details
        </Text>
        {isOwner && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        {!isOwner && <View style={styles.headerRight} />}
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery */}
        {renderPhotoGallery()}

        {/* Landmark Info */}
        <Surface style={styles.landmarkCard}>
          <View style={styles.landmarkHeader}>
            <View style={styles.landmarkInfo}>
              <Text style={styles.landmarkName}>{visit.landmark_name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={theme.colors.primary} />
                <Text style={styles.locationText}>{visit.country_name}</Text>
              </View>
            </View>
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.pointsText}>+{visit.points_earned}</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <Ionicons name="calendar" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.dateText}>Visited {formatDate(visit.visited_at)}</Text>
          </View>
        </Surface>

        {/* User Info */}
        <Surface style={styles.userCard}>
          <Image
            source={{ uri: visit.user_picture || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{visit.user_name}</Text>
            {visit.username && (
              <Text style={styles.username}>@{visit.username}</Text>
            )}
          </View>
        </Surface>

        {/* Diary */}
        {visit.diary && (
          <Surface style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="book" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Travel Diary</Text>
            </View>
            <Text style={styles.diaryText}>{visit.diary}</Text>
          </Surface>
        )}

        {/* Tips */}
        {visit.tips && visit.tips.length > 0 && (
          <Surface style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Travel Tips</Text>
            </View>
            {visit.tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <View style={styles.tipBullet}>
                  <Text style={styles.tipBulletText}>{index + 1}</Text>
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </Surface>
        )}

        {/* Comments Section */}
        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubbles" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Comments</Text>
          </View>
          <CommentsSection
            activityId={visit.visit_id}
            commentsCount={commentsCount}
            currentUserId={currentUserId}
            onCommentsChange={setCommentsCount}
          />
        </Surface>

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>

      {/* Full Screen Photo Modal */}
      {renderFullScreenPhoto()}
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
  deleteButton: {
    padding: theme.spacing.xs,
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
  photoGallery: {
    height: 300,
    backgroundColor: theme.colors.surface,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  photoCounter: {
    position: 'absolute',
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  photoCounterText: {
    ...theme.typography.caption,
    color: '#fff',
    fontWeight: '600',
  },
  landmarkCard: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  landmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  landmarkInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  landmarkName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  pointsText: {
    ...theme.typography.body,
    color: '#FFD700',
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  username: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  section: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  diaryText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    alignItems: 'flex-start',
  },
  tipBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  tipBulletText: {
    ...theme.typography.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  tipText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 22,
  },
  // Full Screen Photo Modal
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: theme.spacing.lg,
    zIndex: 10,
    padding: theme.spacing.sm,
  },
  fullScreenPhotoContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenPhoto: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  fullScreenPhotoCounter: {
    position: 'absolute',
    bottom: 40,
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
});
