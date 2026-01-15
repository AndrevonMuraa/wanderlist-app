import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import RankBadge from '../components/RankBadge';
import { RANKS, getUserRank, Rank } from '../utils/rankSystem';
import { BACKEND_URL } from '../utils/config';
import UniversalHeader from '../components/UniversalHeader';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

export default function RanksScreen() {
  const router = useRouter();
  const [userPoints, setUserPoints] = useState(0);
  const [currentRank, setCurrentRank] = useState<Rank>(RANKS[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

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
        const points = data.points || 0;
        setUserPoints(points);
        setCurrentRank(getUserRank(points));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isRankUnlocked = (rank: Rank) => {
    return userPoints >= rank.minPoints;
  };

  const getProgressToRank = (rank: Rank): number => {
    if (userPoints >= rank.minPoints) return 100;
    if (userPoints < (RANKS[RANKS.indexOf(rank) - 1]?.maxPoints || 0)) return 0;
    
    const prevRank = RANKS[RANKS.indexOf(rank) - 1];
    const rangeStart = prevRank ? prevRank.maxPoints + 1 : 0;
    const rangeTotal = rank.minPoints - rangeStart;
    const userProgress = userPoints - rangeStart;
    
    return (userProgress / rangeTotal) * 100;
  };

  const RankCard = ({ rank, index }: { rank: Rank; index: number }) => {
    const isUnlocked = isRankUnlocked(rank);
    const isCurrent = rank.name === currentRank.name;
    const progress = getProgressToRank(rank);

    return (
      <Surface 
        style={[
          styles.rankCard,
          isCurrent && styles.rankCardCurrent,
          !isUnlocked && styles.rankCardLocked
        ]}
      >
        {isCurrent && (
          <View style={styles.currentBadge}>
            <LinearGradient
              colors={rank.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.currentBadgeGradient}
            >
              <Text style={styles.currentBadgeText}>YOUR RANK</Text>
            </LinearGradient>
          </View>
        )}

        <View style={styles.rankCardHeader}>
          <View style={styles.rankNumber}>
            <Text style={styles.rankNumberText}>{index + 1}</Text>
          </View>
          <View style={[styles.rankBadgeContainer, !isUnlocked && styles.lockedBadge]}>
            <RankBadge rank={rank} size="large" showName={false} />
            {!isUnlocked && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={32} color="#666" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.rankCardContent}>
          <Text style={[styles.rankName, { color: rank.color }]}>
            {rank.name}
          </Text>
          <Text style={styles.rankDescription}>{rank.description}</Text>

          <View style={styles.pointsRequirement}>
            <Ionicons name="star" size={16} color={rank.color} />
            <Text style={styles.pointsText}>
              {rank.minPoints === 0 
                ? '0+ points' 
                : rank.maxPoints === Infinity
                  ? `${rank.minPoints.toLocaleString()}+ points`
                  : `${rank.minPoints.toLocaleString()} - ${rank.maxPoints.toLocaleString()} points`
              }
            </Text>
          </View>

          {!isUnlocked && progress > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progress}%`, backgroundColor: rank.color }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progress)}% to unlock
              </Text>
            </View>
          )}

          {isUnlocked && !isCurrent && (
            <View style={styles.unlockedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.unlockedText}>Unlocked!</Text>
            </View>
          )}

          {isCurrent && (
            <View style={styles.currentInfo}>
              <Text style={styles.currentPoints}>
                You have {userPoints.toLocaleString()} points
              </Text>
            </View>
          )}
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <UniversalHeader title="Rank System" />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Path to Legend</Text>
          <Text style={styles.heroSubtitle}>
            Earn points by visiting landmarks and completing challenges. 
            Advance through 5 ranks to become a travel legend!
          </Text>

          {/* Your Progress */}
          <Surface style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <RankBadge rank={currentRank} size="medium" showName={false} />
              <View style={styles.progressInfo}>
                <Text style={styles.progressTitle}>Your Current Rank</Text>
                <Text style={[styles.progressRank, { color: currentRank.color }]}>
                  {currentRank.name}
                </Text>
              </View>
            </View>
            <Text style={styles.progressPoints}>
              {userPoints.toLocaleString()} points earned
            </Text>
          </Surface>
        </View>

        {/* All Ranks */}
        <View style={styles.ranksSection}>
          <Text style={styles.sectionTitle}>All Ranks</Text>
          {RANKS.map((rank, index) => (
            <RankCard key={rank.name} rank={rank} index={index} />
          ))}
        </View>

        {/* How to Earn Points */}
        <Surface style={styles.infoCard}>
          <Text style={styles.infoTitle}>How to Earn Points</Text>
          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Visit Official Landmarks:</Text> +10 points each
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="diamond" size={20} color="#FFD700" />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Visit Premium Landmarks:</Text> +25 points each
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="flag" size={20} color="#4CAF50" />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Complete a Country:</Text> +50 bonus points
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="earth" size={20} color="#9C27B0" />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Complete a Continent:</Text> +200 bonus points
            </Text>
          </View>
        </Surface>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/continents')}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Start Exploring</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: theme.spacing.xxl }} />
      </ScrollView>
    </View>
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
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  // Hero Section
  heroSection: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  heroTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  progressCard: {
    width: '100%',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  progressRank: {
    ...theme.typography.h2,
    fontWeight: '700',
  },
  progressPoints: {
    ...theme.typography.body,
    color: theme.colors.text,
    textAlign: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  // Ranks Section
  ranksSection: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  rankCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
    position: 'relative',
  },
  rankCardCurrent: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  rankCardLocked: {
    opacity: 0.6,
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    right: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  currentBadgeGradient: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
  },
  currentBadgeText: {
    ...theme.typography.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1,
  },
  rankCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  rankNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceTinted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumberText: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  rankBadgeContainer: {
    position: 'relative',
  },
  lockedBadge: {
    opacity: 0.4,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 40,
  },
  rankCardContent: {
    gap: theme.spacing.sm,
  },
  rankName: {
    ...theme.typography.h2,
    fontWeight: '700',
  },
  rankDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  pointsRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  pointsText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: theme.spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  unlockedText: {
    ...theme.typography.caption,
    color: '#4CAF50',
    fontWeight: '700',
  },
  currentInfo: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  currentPoints: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Info Card
  infoCard: {
    margin: theme.spacing.lg,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  infoTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 22,
  },
  infoBold: {
    fontWeight: '700',
  },
  // CTA
  ctaButton: {
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  ctaText: {
    ...theme.typography.h3,
    color: '#fff',
    fontWeight: '700',
  },
});
