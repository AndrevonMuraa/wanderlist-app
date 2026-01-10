import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import { lightHaptic } from '../../utils/haptics';
import { PhotoGalleryModal } from '../../components/PhotoGalleryModal';
import { shareVisit } from '../../utils/shareUtils';

const { width } = Dimensions.get('window');

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface VisitDetail {
  visit_id: string;
  landmark_id: string;
  landmark_name?: string;
  country_name?: string;
  photo_base64?: string;
  photos?: string[];
  diary_notes?: string;
  travel_tips?: string[];
  comments?: string;
  points_earned: number;
  visited_at: string;
  verified: boolean;
}

export default function VisitDetailScreen() {
  const { visit_id } = useLocalSearchParams();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchVisitDetails();
  }, []);

  const fetchVisitDetails = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/visits/${visit_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setVisit(data);
      }
    } catch (error) {
      console.error('Error fetching visit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (visit) {
      await shareVisit(
        visit.landmark_name || 'Landmark',
        visit.country_name || 'Country',
        visit.points_earned
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading visit details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textLight} />
          <Text style={styles.errorText}>Visit not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const photos = visit.photos || (visit.photo_base64 ? [visit.photo_base64] : []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={async () => {
              await lightHaptic();
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{visit.landmark_name || 'Visit Details'}</Text>
            {visit.country_name && (
              <Text style={styles.headerSubtitle}>{visit.country_name}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Ionicons name="share-social" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <View style={styles.photoSection}>
            <TouchableOpacity
              onPress={async () => {
                await lightHaptic();
                setShowGallery(true);
              }}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: photos[selectedPhoto] }}
                style={styles.mainPhoto}
                resizeMode="cover"
              />
              {photos.length > 1 && (
                <View style={styles.photoCountBadge}>
                  <Ionicons name="images" size={16} color="#fff" />
                  <Text style={styles.photoCountText}>{photos.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            {photos.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoThumbnails}
              >
                {photos.map((photo, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={async () => {
                      await lightHaptic();
                      setSelectedPhoto(index);
                    }}
                  >
                    <Image
                      source={{ uri: photo }}
                      style={[
                        styles.thumbnail,
                        selectedPhoto === index && styles.thumbnailActive
                      ]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Visit Info */}
        <Surface style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {new Date(visit.visited_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="star" size={20} color={theme.colors.accentYellow} />
              <Text style={styles.infoLabel}>Points</Text>
              <Text style={styles.infoValue}>+{visit.points_earned}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons 
                name={visit.verified ? "checkmark-circle" : "alert-circle"} 
                size={20} 
                color={visit.verified ? theme.colors.success : theme.colors.textLight} 
              />
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{visit.verified ? 'Verified' : 'Unverified'}</Text>
            </View>
          </View>
        </Surface>

        {/* Travel Diary */}
        {visit.diary_notes && (
          <Surface style={styles.diaryCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="journal" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Travel Diary</Text>
            </View>
            <Text style={styles.diaryText}>{visit.diary_notes}</Text>
          </Surface>
        )}

        {/* Travel Tips */}
        {visit.travel_tips && visit.travel_tips.length > 0 && (
          <Surface style={styles.tipsCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={24} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>Travel Tips</Text>
            </View>
            {visit.travel_tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </Surface>
        )}

        {/* Comments */}
        {visit.comments && (
          <Surface style={styles.commentsCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Quick Notes</Text>
            </View>
            <Text style={styles.commentsText}>{visit.comments}</Text>
          </Surface>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  photoSection: {
    backgroundColor: '#000',
  },
  mainPhoto: {
    width: width,
    height: width * 0.75,
  },
  photoThumbnails: {
    padding: theme.spacing.sm,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    opacity: 0.6,
  },
  thumbnailActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  infoCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  diaryCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.card,
  },
  tipsCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.card,
  },
  commentsCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  diaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.text,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text,
  },
  commentsText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: theme.spacing.xl * 2,
  },
});
