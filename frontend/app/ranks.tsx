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

import { HeaderBranding } from '../components/BrandedGlobeIcon';
import { getToken } from '../../utils/token';

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
      const response = await fetch(`${BACKEND_URL}/api/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const points = data.verifiedPoints || 0;
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
        ]}
      >
        <View style={styles.rankRow}>
          {/* Left: Number + Badge icon */}
          <View style={styles.rankLeft}>
            <Text style={[styles.rankNumberText, { color: rank.color }]}>{index + 1}</Text>
            <View style={[styles.rankIconCircle, { backgroundColor: rank.gradient[0] + '20' }]}>
              <Ionicons name={rank.icon as any} size={22} color={rank.color} />
            </View>
          </View>

          {/* Middle: Name, description, points */}
          <View style={styles.rankMiddle}>
            <View style={styles.rankNameRow}>
              <Text style={[styles.rankName, { color: rank.color }]} numberOfLines={1}>
                {rank.name}
              </Text>
              {isCurrent && (
                <View style={[styles.currentTag, { backgroundColor: rank.color }]}>
                  <Text style={styles.currentTagText}>YOU</Text>
                </View>
              )}
              {isUnlocked && !isCurrent && (
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              )}
            </View>
            <Text style={styles.rankDescription} numberOfLines={1}>{rank.description}</Text>
            <View style={styles.rankPointsRow}>
              <Ionicons name="star" size={12} color={rank.color} />
              <Text style={styles.pointsText}>
                {rank.minPoints === 0 
                  ? '0+' 
                  : rank.maxPoints === Infinity
                    ? `${rank.minPoints.toLocaleString()}+`
                    : `${rank.minPoints.toLocaleString()} - ${rank.maxPoints.toLocaleString()}`
                } pts
              </Text>
            </View>
            {isCurrent && progress < 100 && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: rank.color }]} />
              </View>
            )}
            {!isUnlocked && !isCurrent && index === RANKS.indexOf(currentRank) + 1 && (
              <>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: rank.color }]} />
                </View>
                <Text style={{ fontSize: 10, color: theme.colors.textLight, marginTop: 2 }}>
                  {rank.minPoints - userPoints} pts to unlock • {Math.round(progress)}%
                </Text>
              </>
            )}
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <UniversalHeader title="Rank system" />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
        <>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Path to Transcendent</Text>
          <Text style={styles.heroSubtitle}>
            Ranks are based on verified points — earned by visiting landmarks with a personal photo. 
            Advance through 20 ranks to become a travel legend!
          </Text>

          {/* Your Progress */}
          <Surface style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <RankBadge rank={currentRank} size="medium" showName={false} />
              <View style={styles.progressInfo}>
                <Text style={styles.progressTitle}>Your current rank</Text>
                <Text style={[styles.progressRank, { color: currentRank.color }]}>
                  {currentRank.name}
                </Text>
              </View>
            </View>
            <Text style={styles.progressPoints}>
              {userPoints.toLocaleString()} verified points
            </Text>
          </Surface>
          )}
        </View>

        {/* All Ranks */}
        <View style={styles.ranksSection}>
          <Text style={styles.sectionTitle}>All ranks</Text>
          {RANKS.map((rank, index) => (
            <RankCard key={rank.name} rank={rank} index={index} />
          ))}
        </View>

        {/* How to Earn Points */}
        <Surface style={styles.infoCard}>
          <Text style={styles.infoTitle}>How to earn points</Text>
          <View style={styles.infoItem}>
            <Ionicons name="camera" size={20} color="#E91E63" />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Verified Points:</Text> Upload a personal photo of yourself at the landmark. Counts for the global leaderboard.
            </Text>
          </View>
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
              <Text style={styles.infoBold}>Country Visit:</Text> +50 points (auto or manual)
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="earth" size={20} color="#1E8A8A" />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>New Continent Bonus:</Text> +50 points for first country on a new continent
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="trophy" size={20} color="#FFA726" />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Completion:</Text> +50 per country, +200 per continent completed
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
            <Text style={styles.ctaText}>Start exploring</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: theme.spacing.xxl }} />
        </>
        )}
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
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    marginBottom: 8,
    ...theme.shadows.sm,
    position: 'relative',
  },
  rankCardCurrent: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  rankNumberText: {
    fontSize: 16,
    fontWeight: '800',
    width: 22,
    textAlign: 'center',
  },
  rankIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankMiddle: {
    flex: 1,
    gap: 1,
  },
  rankNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankName: {
    fontSize: 16,
    fontWeight: '700',
  },
  currentTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currentTagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rankDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  rankPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pointsText: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
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
