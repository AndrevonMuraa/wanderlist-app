import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import theme, { gradients } from '../styles/theme';
import UniversalHeader from '../components/UniversalHeader';
import { BACKEND_URL } from '../utils/config';

interface UserStats {
  total_points: number;
  leaderboard_points: number;
  landmarks_visited: number;
  countries_visited: number;
  visits_with_photos: number;
  visits_without_photos: number;
}

export default function PointsSummary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<'verified' | 'unverified' | null>(null);
  const [breakdown, setBreakdown] = useState<any>(null);

  const getToken = async () => {
    if (Platform.OS === 'web') {
      return localStorage.getItem('auth_token');
    }
    return await SecureStore.getItemAsync('auth_token');
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken();
        // Fetch both stats and progress in parallel — progress has calculated points
        const [statsRes, progressRes, breakdownRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${BACKEND_URL}/api/progress`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${BACKEND_URL}/api/points/breakdown`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        
        if (statsRes.ok && progressRes.ok) {
          const statsData = await statsRes.json();
          const progressData = await progressRes.json();
          const withPhotos = statsData.visits_with_photos || 0;
          const totalVisits = statsData.total_visits || 0;
          
          // Use CALCULATED values from progress (single source of truth)
          setStats({
            total_points: progressData.totalPoints || 0,
            leaderboard_points: progressData.verifiedPoints || 0,
            landmarks_visited: totalVisits,
            countries_visited: statsData.countries_visited || 0,
            visits_with_photos: withPhotos,
            visits_without_photos: totalVisits - withPhotos,
          });
        }
        if (breakdownRes.ok) {
          setBreakdown(await breakdownRes.json());
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const fetchBreakdown = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/points/breakdown`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBreakdown(await res.json());
    } catch {}
  };

  const handleToggleSection = (section: 'verified' | 'unverified') => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
      if (!breakdown) fetchBreakdown();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradients.oceanToSand} start={gradients.horizontal.start} end={gradients.horizontal.end} style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Points Summary</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  const totalPoints = stats?.total_points || 0;
  const verifiedPoints = stats?.leaderboard_points || 0;
  const unverifiedPoints = Math.max(0, totalPoints - verifiedPoints);

  return (
    <View style={styles.container}>
      <UniversalHeader title="Points Summary" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Main Points Card */}
        <View style={styles.mainCard}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainCardGradient}
          >
            <Text style={styles.totalLabel}>Total Points</Text>
            <Text style={styles.totalNumber}>{totalPoints.toLocaleString()}</Text>
          </LinearGradient>
        </View>

        {/* Points Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points Breakdown</Text>
          
          <Surface style={styles.card}>
            <TouchableOpacity onPress={() => handleToggleSection('verified')} activeOpacity={0.7}>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownIcon}>
                  <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                </View>
                <View style={styles.breakdownContent}>
                  <Text style={styles.breakdownLabel}>Verified Points</Text>
                  <Text style={styles.breakdownDesc}>From visits with photos — counts for leaderboard and rank</Text>
                </View>
                <Text style={[styles.breakdownValue, { color: '#4CAF50' }]}>{verifiedPoints.toLocaleString()}</Text>
                <Ionicons name={expandedSection === 'verified' ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textLight} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
            
            {expandedSection === 'verified' && breakdown && (
              <View style={styles.detailSection}>
                {breakdown.landmarks.filter((l: any) => l.verified).length > 0 && (
                  <>
                    <Text style={styles.detailGroupTitle}>Landmarks ({breakdown.summary.landmark_verified} pts)</Text>
                    {breakdown.landmarks.filter((l: any) => l.verified).map((l: any) => (
                      <TouchableOpacity key={l.visit_id} style={styles.detailRow} onPress={() => router.push(`/visit-detail/${l.visit_id}`)} activeOpacity={0.7}>
                        <Ionicons name="location" size={14} color="#E87850" />
                        <Text style={styles.detailName} numberOfLines={1}>{l.name}</Text>
                        <Text style={styles.detailCountry}>{l.country}</Text>
                        <Text style={styles.detailPts}>+{l.points}</Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.colors.textLight} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {breakdown.continent_bonuses.length > 0 && (
                  <>
                    <Text style={styles.detailGroupTitle}>Continent Bonuses ({breakdown.summary.continent_total} pts)</Text>
                    {breakdown.continent_bonuses.map((b: any) => (
                      <View key={b.continent} style={styles.detailRow}>
                        <Ionicons name="globe-outline" size={14} color="#66BB6A" />
                        <Text style={styles.detailName}>{b.continent}</Text>
                        <Text style={styles.detailPts}>+{b.points}</Text>
                      </View>
                    ))}
                  </>
                )}
                {verifiedPoints === 0 && (
                  <Text style={styles.detailEmpty}>Add photos to your visits to earn verified points</Text>
                )}
              </View>
            )}
            
            <View style={styles.divider} />
            
            <TouchableOpacity onPress={() => handleToggleSection('unverified')} activeOpacity={0.7}>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownIcon}>
                  <Ionicons name="star" size={20} color="#FFA726" />
                </View>
                <View style={styles.breakdownContent}>
                  <Text style={styles.breakdownLabel}>Unverified Points</Text>
                  <Text style={styles.breakdownDesc}>From visits without photos — personal total only</Text>
                </View>
                <Text style={styles.breakdownValue}>{unverifiedPoints.toLocaleString()}</Text>
                <Ionicons name={expandedSection === 'unverified' ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textLight} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
            
            {expandedSection === 'unverified' && breakdown && (
              <View style={styles.detailSection}>
                {breakdown.landmarks.filter((l: any) => !l.verified && l.points > 0).length > 0 && (
                  <>
                    <Text style={styles.detailGroupTitle}>Landmarks ({breakdown.summary.landmark_total - breakdown.summary.landmark_verified} pts)</Text>
                    {breakdown.landmarks.filter((l: any) => !l.verified && l.points > 0).map((l: any) => (
                      <TouchableOpacity key={l.visit_id} style={styles.detailRow} onPress={() => router.push(`/visit-detail/${l.visit_id}`)} activeOpacity={0.7}>
                        <Ionicons name="location" size={14} color="#E87850" />
                        <Text style={styles.detailName} numberOfLines={1}>{l.name}</Text>
                        <Text style={styles.detailCountry}>{l.country}</Text>
                        <Text style={styles.detailPts}>+{l.points}</Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.colors.textLight} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {breakdown.country_visits.length > 0 && (
                  <>
                    <Text style={styles.detailGroupTitle}>Destination Visits ({breakdown.summary.country_total} pts)</Text>
                    {breakdown.country_visits.map((c: any) => (
                      <TouchableOpacity key={c.country_visit_id} style={styles.detailRow} onPress={() => router.push(`/country-visit-detail/${c.country_visit_id}`)} activeOpacity={0.7}>
                        <Ionicons name="flag" size={14} color="#4DB8D8" />
                        <Text style={styles.detailName}>{c.name}</Text>
                        <Text style={styles.detailPts}>+{c.points}</Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.colors.textLight} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {unverifiedPoints === 0 && (
                  <Text style={styles.detailEmpty}>No unverified points</Text>
                )}
              </View>
            )}
          </Surface>
        </View>

        {/* How Points Work */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Points Work</Text>
          
          <Surface style={styles.card}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#FCE4EC' }]}>
                <Ionicons name="camera" size={18} color="#E91E63" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Photo Verification</Text>
                <Text style={styles.infoDesc}>Take a personal photo of yourself at the landmark to earn verified points for the leaderboard</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#FDEAE4' }]}>
                <Ionicons name="location" size={18} color="#E87850" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Landmark Visit</Text>
                <Text style={styles.infoDesc}>10 pts (official) or 25 pts (premium)</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#E0F4F4' }]}>
                <Ionicons name="flag" size={18} color="#4DB8D8" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Country Visit</Text>
                <Text style={styles.infoDesc}>+50 pts for each country visited (auto or manual)</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="globe-outline" size={18} color="#66BB6A" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Continent Bonus</Text>
                <Text style={styles.infoDesc}>+50 pts for first country on a new continent</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#FFF8E1' }]}>
                <Ionicons name="star" size={18} color="#FFD700" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Completion Bonuses</Text>
                <Text style={styles.infoDesc}>+50 pts per country, +200 pts per continent completed</Text>
              </View>
            </View>
          </Surface>
        </View>

        {/* Earning Potential */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earning Potential</Text>
          
          <Surface style={styles.card}>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
              You've earned {totalPoints > 0 ? ((totalPoints / 27750) * 100).toFixed(1) : '0'}% of all possible points
            </Text>

            <TouchableOpacity style={styles.potentialRow} onPress={() => router.push('/my-landmark-visits')} activeOpacity={0.7}>
              <View style={[styles.potentialIcon, { backgroundColor: '#FDEAE4' }]}>
                <Ionicons name="location" size={16} color="#E87850" />
              </View>
              <View style={styles.potentialContent}>
                <View style={styles.potentialLabelRow}>
                  <Text style={styles.potentialLabel}>Landmarks</Text>
                  <Text style={styles.potentialValue}>{breakdown?.summary?.landmark_total || 0} <Text style={styles.potentialMax}>/ 22,500</Text></Text>
                </View>
                <View style={styles.potentialBarBg}>
                  <View style={[styles.potentialBar, { width: `${Math.min(100, ((breakdown?.summary?.landmark_total || 0) / 22500) * 100)}%`, backgroundColor: '#E87850' }]} />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.potentialRow} onPress={() => router.push('/my-country-visits')} activeOpacity={0.7}>
              <View style={[styles.potentialIcon, { backgroundColor: '#E0F4F4' }]}>
                <Ionicons name="flag" size={16} color="#4DB8D8" />
              </View>
              <View style={styles.potentialContent}>
                <View style={styles.potentialLabelRow}>
                  <Text style={styles.potentialLabel}>Destination Visits</Text>
                  <Text style={styles.potentialValue}>{breakdown?.summary?.country_total || 0} <Text style={styles.potentialMax}>/ 5,000</Text></Text>
                </View>
                <View style={styles.potentialBarBg}>
                  <View style={[styles.potentialBar, { width: `${Math.min(100, ((breakdown?.summary?.country_total || 0) / 5000) * 100)}%`, backgroundColor: '#4DB8D8' }]} />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textLight} />
            </TouchableOpacity>

            <View style={styles.potentialRow}>
              <View style={[styles.potentialIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="globe-outline" size={16} color="#66BB6A" />
              </View>
              <View style={styles.potentialContent}>
                <View style={styles.potentialLabelRow}>
                  <Text style={styles.potentialLabel}>Continent Bonuses</Text>
                  <Text style={styles.potentialValue}>{breakdown?.summary?.continent_total || 0} <Text style={styles.potentialMax}>/ 250</Text></Text>
                </View>
                <View style={styles.potentialBarBg}>
                  <View style={[styles.potentialBar, { width: `${Math.min(100, ((breakdown?.summary?.continent_total || 0) / 250) * 100)}%`, backgroundColor: '#66BB6A' }]} />
                </View>
              </View>
            </View>

            <View style={[styles.divider, { marginTop: 8 }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>Total Earned</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.primary }}>{totalPoints.toLocaleString()} <Text style={styles.potentialMax}>/ 27,750</Text></Text>
            </View>
          </Surface>
        </View>

        {/* Next Milestone */}
        {(() => {
          const { getUserRank, RANKS } = require('../utils/rankSystem');
          const currentRank = getUserRank(verifiedPoints);
          const currentIdx = RANKS.indexOf(currentRank);
          const nextRank = currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : null;
          if (!nextRank) return null;
          const needed = nextRank.minPoints - verifiedPoints;
          return (
            <View style={styles.section}>
              <Surface style={[styles.card, { borderLeftWidth: 3, borderLeftColor: nextRank.color }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: nextRank.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="trophy" size={22} color={nextRank.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Next Rank</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: nextRank.color }}>{nextRank.name}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textLight, marginTop: 2 }}>{needed.toLocaleString()} more verified points needed</Text>
                  </View>
                </View>
              </Surface>
            </View>
          );
        })()}

        {/* CTA */}
        <TouchableOpacity 
          style={styles.ctaButton} 
          onPress={() => router.push('/leaderboard')}
          activeOpacity={0.8}
          data-testid="view-leaderboard-btn"
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Ionicons name="trophy" size={20} color="#fff" />
            <Text style={styles.ctaText}>View Leaderboard</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  mainCard: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  mainCardGradient: {
    padding: 28,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fff',
    ...theme.shadows.card,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breakdownContent: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  breakdownDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  infoDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    ...theme.shadows.card,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  ctaButton: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  detailSection: {
    paddingTop: 4,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  detailGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
    paddingLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    gap: 6,
  },
  detailName: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  detailCountry: {
    fontSize: 11,
    color: theme.colors.textLight,
    marginRight: 4,
  },
  detailPts: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    minWidth: 30,
    textAlign: 'right',
  },
  detailEmpty: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  // Earning Potential
  potentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  potentialIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  potentialContent: {
    flex: 1,
  },
  potentialLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  potentialLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  potentialValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  potentialMax: {
    fontSize: 11,
    fontWeight: '400',
    color: theme.colors.textLight,
  },
  potentialBarBg: {
    height: 6,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  potentialBar: {
    height: 6,
    borderRadius: 3,
    minWidth: 2,
  },
});
