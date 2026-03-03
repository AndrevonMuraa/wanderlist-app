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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import theme, { gradients } from '../styles/theme';
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
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

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
        const [statsRes, visitsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BACKEND_URL}/api/visits`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        
        if (statsRes.ok && visitsRes.ok) {
          const statsData = await statsRes.json();
          const visits = await visitsRes.json();
          
          const withPhotos = visits.filter((v: any) => v.has_photos || (v.photos && v.photos.length > 0)).length;
          
          setStats({
            total_points: statsData.points || 0,
            leaderboard_points: statsData.leaderboard_points || 0,
            landmarks_visited: statsData.total_visits || visits.length,
            countries_visited: statsData.countries_visited || 0,
            visits_with_photos: withPhotos,
            visits_without_photos: visits.length - withPhotos,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradients.oceanToSand} start={gradients.horizontal.start} end={gradients.horizontal.end} style={styles.header}>
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
  const unverifiedPoints = totalPoints - verifiedPoints;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={gradients.oceanToSand} start={gradients.horizontal.start} end={gradients.horizontal.end} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Points Summary</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

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
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownIcon}>
                <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
              </View>
              <View style={styles.breakdownContent}>
                <Text style={styles.breakdownLabel}>Verified Points</Text>
                <Text style={styles.breakdownDesc}>From visits with photos (counts for global leaderboard)</Text>
              </View>
              <Text style={styles.breakdownValue}>{verifiedPoints.toLocaleString()}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownIcon}>
                <Ionicons name="star" size={20} color="#FFA726" />
              </View>
              <View style={styles.breakdownContent}>
                <Text style={styles.breakdownLabel}>Unverified Points</Text>
                <Text style={styles.breakdownDesc}>From visits without photos (counts for friends leaderboard)</Text>
              </View>
              <Text style={styles.breakdownValue}>{unverifiedPoints.toLocaleString()}</Text>
            </View>
          </Surface>
        </View>

        {/* How Points Work */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Points Work</Text>
          
          <Surface style={styles.card}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="location" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Landmark Visit</Text>
                <Text style={styles.infoDesc}>10 pts (official) or 25 pts (premium)</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="earth" size={18} color="#4CAF50" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Country Visit</Text>
                <Text style={styles.infoDesc}>50 points for each country visited</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="flag" size={18} color="#FF9800" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Country Bonus</Text>
                <Text style={styles.infoDesc}>+20 pts for first landmark in a new country</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="globe" size={18} color="#9C27B0" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Continent Bonus</Text>
                <Text style={styles.infoDesc}>+50 pts for first country on a new continent</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#E0F7FA' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#00BCD4" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Completion Bonuses</Text>
                <Text style={styles.infoDesc}>+50 pts per country, +200 pts per continent completed</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#FCE4EC' }]}>
                <Ionicons name="camera" size={18} color="#E91E63" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Photo Verification</Text>
                <Text style={styles.infoDesc}>Add photos to earn verified points for the leaderboard</Text>
              </View>
            </View>
          </Surface>
        </View>

        {/* Visit Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          
          <View style={styles.statsGrid}>
            <Surface style={styles.statCard}>
              <Ionicons name="location" size={24} color={theme.colors.primary} />
              <Text style={styles.statNumber}>{stats?.landmarks_visited || 0}</Text>
              <Text style={styles.statLabel}>Landmarks</Text>
            </Surface>
            <Surface style={styles.statCard}>
              <Ionicons name="earth" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>{stats?.countries_visited || 0}</Text>
              <Text style={styles.statLabel}>Countries</Text>
            </Surface>
            <Surface style={styles.statCard}>
              <Ionicons name="camera" size={24} color="#E91E63" />
              <Text style={styles.statNumber}>{stats?.visits_with_photos || 0}</Text>
              <Text style={styles.statLabel}>With Photos</Text>
            </Surface>
            <Surface style={styles.statCard}>
              <Ionicons name="eye-off" size={24} color="#999" />
              <Text style={styles.statNumber}>{stats?.visits_without_photos || 0}</Text>
              <Text style={styles.statLabel}>No Photos</Text>
            </Surface>
          </View>
        </View>

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
    </SafeAreaView>
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
});
