import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Alert, ScrollView } from 'react-native';
import { Text, ActivityIndicator, Modal, Portal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '../contexts/ThemeContext';
import { getUserRank } from '../utils/rankSystem';

const { width: screenWidth } = Dimensions.get('window');

interface ShareJourneyCardProps {
  visible: boolean;
  onDismiss: () => void;
  stats: {
    landmarks: number;
    countries: number;
    continents: number;
    points: number;
    verifiedPoints: number;
    rank?: number;
  };
  userName: string;
}

export default function ShareJourneyCard({ visible, onDismiss, stats, userName }: ShareJourneyCardProps) {
  const { colors } = useTheme();
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const userRank = getUserRank(stats.verifiedPoints);

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      setSharing(true);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
        return;
      }
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your travel journey',
      });
      onDismiss();
    } catch (error) {
      Alert.alert('Error', 'Could not share. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const firstName = userName?.split(' ')[0] || userName || 'Traveler';

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Share your journey</Text>
          <TouchableOpacity onPress={onDismiss} testID="share-journey-close">
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* === The Shareable Card === */}
        <View ref={cardRef} collapsable={false} style={styles.cardOuter}>
          <LinearGradient
            colors={['#0c1220', '#162032', '#1a2840']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.3, y: 1 }}
            style={styles.card}
          >
            {/* Subtle decorative elements */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            {/* Brand with logo */}
            <View style={styles.brandRow}>
              <View style={styles.brandLogo}>
                <Text style={styles.brandLogoText}>W</Text>
              </View>
              <Text style={styles.brandText}>WANDERMARK</Text>
            </View>

            {/* User Greeting */}
            <Text style={styles.cardTitle}>{firstName}'s Journey</Text>
            <Text style={styles.cardSubtitle}>A life measured in destinations and landmarks</Text>

            {/* Rank Badge */}
            <View style={[styles.rankPill, { borderColor: userRank.color + '60' }]}>
              <Ionicons name={userRank.icon as any} size={16} color={userRank.color} />
              <Text style={[styles.rankLabel, { color: userRank.color }]}>{userRank.name}</Text>
            </View>

            {/* Stats: Continents → Destinations → Landmarks */}
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{stats.continents}</Text>
                <View style={styles.statLabelRow}>
                  <Ionicons name="earth" size={9} color="#4CAF50" />
                  <Text style={styles.statLabel}>Continents</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statCell}>
                <Text style={styles.statNum}>{stats.countries}</Text>
                <View style={styles.statLabelRow}>
                  <Ionicons name="flag" size={9} color="#4DB8D8" />
                  <Text style={styles.statLabel}>Destinations</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statCell}>
                <Text style={styles.statNum}>{stats.landmarks}</Text>
                <View style={styles.statLabelRow}>
                  <Ionicons name="location" size={9} color="#E87850" />
                  <Text style={styles.statLabel}>Landmarks</Text>
                </View>
              </View>
            </View>

            {/* Points - Hero Number */}
            <View style={styles.pointsBlock}>
              <LinearGradient
                colors={['rgba(201,169,97,0.12)', 'rgba(201,169,97,0.04)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pointsInner}
              >
                <Ionicons name="star" size={18} color="#C9A961" />
                <Text style={styles.pointsValue}>{stats.points.toLocaleString()}</Text>
                <Text style={styles.pointsLabel}>points earned</Text>
              </LinearGradient>
            </View>

            {/* Global Rank (if available) */}
            {stats.rank && stats.rank > 0 && (
              <View style={styles.globalRank}>
                <Ionicons name="podium-outline" size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.globalRankText}>Global Rank #{stats.rank}</Text>
              </View>
            )}

            {/* Footer / CTA */}
            <View style={styles.cardFooter}>
              <View style={styles.footerLine} />
              <Text style={styles.ctaText}>The world awaits. Start your journey.</Text>
              <Text style={styles.ctaUrl}>wandermark.app</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.85}
          testID="share-journey-button"
        >
          <LinearGradient
            colors={['#C9A961', '#E8DCC8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareBtnGradient}
          >
            {sharing ? (
              <ActivityIndicator color="#1a1a2e" />
            ) : (
              <>
                <Ionicons name="share-social" size={18} color="#1a1a2e" />
                <Text style={styles.shareBtnText}>Share to social media</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Instagram, WhatsApp, Facebook & more
        </Text>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 24,
    padding: 20,
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  /* Card wrapper */
  cardOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  card: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },

  /* Decorative circles for depth */
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(77,184,216,0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(201,169,97,0.05)',
  },
  decorLine: {
    position: 'absolute',
    top: 0,
    left: 28,
    width: 32,
    height: 3,
    backgroundColor: '#4DB8D8',
    borderRadius: 2,
  },

  /* Brand */
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  brandLogo: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#4DB8D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 3,
  },

  /* Title */
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    letterSpacing: 0.3,
    marginBottom: 16,
  },

  /* Rank Pill */
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 24,
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statNum: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 32,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  /* Points Block */
  pointsBlock: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  pointsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  pointsValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#C9A961',
  },
  pointsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(201,169,97,0.7)',
    letterSpacing: 0.3,
  },

  /* Global Rank */
  globalRank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  globalRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.3,
  },

  /* Footer */
  cardFooter: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 14,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  ctaUrl: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(77,184,216,0.5)',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  /* Share Button */
  shareBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  shareBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 10,
  },
  shareBtnText: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  /* Hint */
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
});
