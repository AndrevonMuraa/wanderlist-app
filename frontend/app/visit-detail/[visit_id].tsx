import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeGoBack } from '../../utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import { lightHaptic } from '../../utils/haptics';
import { PhotoGalleryModal } from '../../components/PhotoGalleryModal';
import { shareVisit } from '../../utils/shareUtils';
import ReportButton from '../../components/ReportButton';

import UniversalHeader from '../../components/UniversalHeader';

const { width } = Dimensions.get('window');

const VISIBILITY_META: Record<string, { icon: string; label: string; color: string }> = {
  public: { icon: 'globe-outline', label: 'Public', color: '#27ae60' },
  friends: { icon: 'people-outline', label: 'Friends Only', color: '#3498db' },
  private: { icon: 'lock-closed-outline', label: 'Private', color: '#e74c3c' },
};

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
  comments?: string;
  points_earned: number;
  visited_at: string;
  verified: boolean;
  visibility?: string;
}

export default function VisitDetailScreen() {
  const { visit_id } = useLocalSearchParams();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [currentVisibility, setCurrentVisibility] = useState<string>('public');
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
        setCurrentVisibility(data.visibility || 'public');
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

  const handleChangeVisibility = async (newVisibility: string) => {
    if (newVisibility === currentVisibility) return;
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/visits/${visit_id}/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ visibility: newVisibility }),
      });
      if (response.ok) {
        setCurrentVisibility(newVisibility);
        await lightHaptic();
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
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
      <UniversalHeader 
        title={visit.landmark_name || 'Visit Details'}
      />
      <ScrollView style={styles.scrollView}>

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
        <View style={styles.infoCard}>
          {visit.country_name && (
            <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 12, textAlign: 'center' }}>
              {visit.country_name}
            </Text>
          )}
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
        </View>

        {/* Travel Diary */}
        {visit.diary_notes && (
          <View style={styles.diaryCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="journal" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Travel Diary</Text>
            </View>
            <Text style={styles.diaryText}>{visit.diary_notes}</Text>
          </View>
        )}

        {/* Visibility Control */}
        <View style={styles.visibilityCard} data-testid="visit-visibility-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Visibility</Text>
          </View>
          <View style={styles.visibilityRow}>
            {Object.entries(VISIBILITY_META).map(([key, meta]) => {
              const isActive = currentVisibility === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.visChip, isActive && { borderColor: meta.color, backgroundColor: meta.color + '15' }]}
                  onPress={() => handleChangeVisibility(key)}
                  activeOpacity={0.7}
                  data-testid={`visit-visibility-${key}`}
                >
                  <Ionicons name={meta.icon as any} size={16} color={isActive ? meta.color : theme.colors.textLight} />
                  <Text style={[styles.visChipText, isActive && { color: meta.color, fontWeight: '700' }]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Comments */}
        {visit.comments && (
          <View style={styles.commentsCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Quick Notes</Text>
            </View>
            <Text style={styles.commentsText}>{visit.comments}</Text>
          </View>
        )}

        {/* Share Visit */}
        <TouchableOpacity
          style={styles.shareVisitButton}
          onPress={handleShare}
          activeOpacity={0.7}
          data-testid="share-visit-button"
        >
          <Ionicons name="share-social-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.shareVisitText}>Share This Visit</Text>
        </TouchableOpacity>

        {/* Report */}
        <View style={styles.reportRow}>
          <ReportButton contentType="activity" contentId={visit_id as string} size={16} />
          <Text style={styles.reportLabel}>Report this visit</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      
      <PhotoGalleryModal
        visible={showGallery}
        photos={photos}
        initialIndex={selectedPhoto}
        onClose={() => setShowGallery(false)}
      />
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  visibilityCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  visChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textLight,
  },
  commentsCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface,
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
  commentsText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: theme.spacing.xl * 2,
  },
  shareVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  shareVisitText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: theme.spacing.md,
    marginTop: 0,
    padding: 12,
  },
  reportLabel: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
