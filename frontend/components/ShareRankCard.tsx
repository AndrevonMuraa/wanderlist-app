import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Text, ActivityIndicator, Modal, Portal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface ShareRankCardProps {
  visible: boolean;
  onDismiss: () => void;
  rank: number;
  totalUsers: number;
  category: string;
  value: number;
  userName: string;
}

export default function ShareRankCard({ visible, onDismiss, rank, totalUsers, category, value, userName }: ShareRankCardProps) {
  const { colors } = useTheme();
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      setSharing(true);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
        setSharing(false);
        return;
      }
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your ranking!',
      });
      onDismiss();
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const percentile = totalUsers > 0 ? Math.round(((totalUsers - rank) / totalUsers) * 100) : 0;
  const categoryLabel = category === 'points' ? 'Points' : category === 'visits' ? 'Landmarks Visited' : 'Countries Explored';
  const categoryIcon = category === 'points' ? 'star' : category === 'visits' ? 'location' : 'flag';
  const medalColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#a78bfa';

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Share Your Ranking</Text>
          <TouchableOpacity onPress={onDismiss}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View ref={cardRef} collapsable={false} style={styles.shareCardWrapper}>
          <LinearGradient
            colors={['#0f172a', '#1e293b', '#334155']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareCard}
          >
            <View style={styles.brandRow}>
              <Ionicons name="globe-outline" size={18} color="#3BB8C3" />
              <Text style={styles.brandText}>WanderMark</Text>
            </View>

            <View style={styles.rankDisplay}>
              <View style={[styles.medalCircle, { borderColor: medalColor }]}>
                <Ionicons name="podium" size={32} color={medalColor} />
              </View>
              <Text style={styles.rankHash}>#</Text>
              <Text style={styles.rankNumber}>{rank}</Text>
            </View>

            <Text style={styles.userName}>{userName}</Text>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Ionicons name={categoryIcon as any} size={20} color="#3BB8C3" />
                <Text style={styles.statValue}>{value.toLocaleString()}</Text>
                <Text style={styles.statLabel}>{categoryLabel}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Ionicons name="people" size={20} color="#a78bfa" />
                <Text style={styles.statValue}>{totalUsers.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Travelers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Ionicons name="trending-up" size={20} color="#10b981" />
                <Text style={styles.statValue}>Top {100 - percentile}%</Text>
                <Text style={styles.statLabel}>Percentile</Text>
              </View>
            </View>

            <View style={styles.ctaRow}>
              <Text style={styles.ctaText}>Can you beat my rank? 🌍</Text>
              <Text style={styles.ctaUrl}>wandermark.app</Text>
            </View>
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.8}
          data-testid="share-rank-card-button"
        >
          <LinearGradient
            colors={['#7c3aed', '#a78bfa']}
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
    fontSize: 18,
    fontWeight: '700',
  },
  shareCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  shareCard: {
    padding: 24,
    alignItems: 'center',
    width: screenWidth - 80,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  brandText: {
    color: '#3BB8C3',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rankDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medalCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankHash: {
    fontSize: 36,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.4)',
  },
  rankNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 60,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    justifyContent: 'space-around',
  },
  statBlock: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ctaRow: {
    alignItems: 'center',
    gap: 4,
  },
  ctaText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  ctaUrl: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  shareButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
