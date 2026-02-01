import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions, Alert } from 'react-native';
import { Text, ActivityIndicator, Modal, Portal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface ShareStatsCardProps {
  visible: boolean;
  onDismiss: () => void;
  stats: {
    totalVisits: number;
    countriesVisited: number;
    continentsVisited: number;
    points: number;
    rank?: number;
    achievements?: number;
  };
  userName: string;
}

export default function ShareStatsCard({ visible, onDismiss, stats, userName }: ShareStatsCardProps) {
  const { colors } = useTheme();
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const handleShare = async () => {
    if (!cardRef.current) return;
    
    try {
      setSharing(true);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
        setSharing(false);
        return;
      }

      // Capture the card as an image
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Share the image
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your travel stats!',
      });
      
      onDismiss();
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Share Your Journey</Text>
          <TouchableOpacity onPress={onDismiss}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Shareable Card */}
        <View ref={cardRef} collapsable={false} style={styles.shareCardWrapper}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareCard}
          >
            {/* App branding */}
            <View style={styles.brandRow}>
              <Ionicons name="globe-outline" size={20} color="#3BB8C3" />
              <Text style={styles.brandText}>WanderMark</Text>
            </View>

            {/* User name */}
            <Text style={styles.userName}>{userName}'s Journey</Text>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="location" size={28} color="#10b981" />
                <Text style={styles.statValue}>{stats.totalVisits}</Text>
                <Text style={styles.statLabel}>Landmarks</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="flag" size={28} color="#3b82f6" />
                <Text style={styles.statValue}>{stats.countriesVisited}</Text>
                <Text style={styles.statLabel}>Countries</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="earth" size={28} color="#f59e0b" />
                <Text style={styles.statValue}>{stats.continentsVisited}</Text>
                <Text style={styles.statLabel}>Continents</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="star" size={28} color="#ec4899" />
                <Text style={styles.statValue}>{stats.points.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
            </View>

            {/* Achievement count if available */}
            {stats.achievements && stats.achievements > 0 && (
              <View style={styles.achievementBadge}>
                <Ionicons name="trophy" size={16} color="#fbbf24" />
                <Text style={styles.achievementText}>{stats.achievements} Achievements Unlocked</Text>
              </View>
            )}

            {/* Rank badge if available */}
            {stats.rank && (
              <View style={styles.rankBadge}>
                <Ionicons name="podium" size={16} color="#a78bfa" />
                <Text style={styles.rankText}>Global Rank #{stats.rank}</Text>
              </View>
            )}

            {/* Call to action */}
            <View style={styles.ctaRow}>
              <Text style={styles.ctaText}>Join me on WanderMark! 🌍</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#3BB8C3', '#2dd4bf']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButtonGradient}
          >
            {sharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="share-social" size={20} color="#fff" />
                <Text style={styles.shareButtonText}>Share to Social Media</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Works with Instagram, Facebook, WhatsApp & more
        </Text>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  shareCardWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shareCard: {
    width: screenWidth - 80,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3BB8C3',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginTop: 8,
  },
  achievementText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167,139,250,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginTop: 8,
  },
  rankText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },
  ctaRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    alignItems: 'center',
  },
  ctaText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
  },
});
