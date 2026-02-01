import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { BACKEND_URL } from '../../utils/config';

const { width: screenWidth } = Dimensions.get('window');

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface AnalyticsData {
  users: {
    total: number;
    pro: number;
    free: number;
    new_today: number;
    new_this_week: number;
    new_this_month: number;
  };
  visits: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
  };
  engagement: {
    avg_visits_per_user: number;
    conversion_rate: number;
    active_users_week: number;
  };
  top_landmarks: Array<{
    name: string;
    country: string;
    visits: number;
  }>;
  top_countries: Array<{
    name: string;
    visits: number;
  }>;
}

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = await getToken();
      
      // Fetch stats
      const statsRes = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (statsRes.ok) {
        const stats = await statsRes.json();
        
        // Calculate additional metrics
        const avgVisitsPerUser = stats.users.total > 0 
          ? (stats.visits.total / stats.users.total).toFixed(1) 
          : 0;
        const conversionRate = stats.users.total > 0
          ? ((stats.users.pro / stats.users.total) * 100).toFixed(1)
          : 0;

        setData({
          users: {
            total: stats.users.total,
            pro: stats.users.pro,
            free: stats.users.free,
            new_today: 0, // Would need additional endpoint
            new_this_week: stats.users.new_this_week,
            new_this_month: stats.users.new_this_month,
          },
          visits: {
            total: stats.visits.total,
            today: 0, // Would need additional endpoint
            this_week: stats.visits.this_week,
            this_month: stats.visits.this_month,
          },
          engagement: {
            avg_visits_per_user: parseFloat(avgVisitsPerUser as string),
            conversion_rate: parseFloat(conversionRate as string),
            active_users_week: stats.users.new_this_week,
          },
          top_landmarks: [],
          top_countries: [],
        });
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const MetricCard = ({ title, value, subtitle, icon, color, trend }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    trend?: { value: number; positive: boolean };
  }) => (
    <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.metricSubtitle, { color: color }]}>{subtitle}</Text>
      )}
      {trend && (
        <View style={styles.trendContainer}>
          <Ionicons 
            name={trend.positive ? 'trending-up' : 'trending-down'} 
            size={14} 
            color={trend.positive ? '#10b981' : '#ef4444'} 
          />
          <Text style={[styles.trendText, { color: trend.positive ? '#10b981' : '#ef4444' }]}>
            {trend.value}%
          </Text>
        </View>
      )}
    </View>
  );

  const ProgressBar = ({ label, value, maxValue, color }: {
    label: string;
    value: number;
    maxValue: number;
    color: string;
  }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
      <View style={styles.progressItem}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.progressValue, { color: colors.textSecondary }]}>{value}</Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Key Metrics */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Users"
            value={data?.users.total || 0}
            subtitle={`+${data?.users.new_this_week || 0} this week`}
            icon="people"
            color="#3b82f6"
          />
          <MetricCard
            title="Total Visits"
            value={data?.visits.total || 0}
            subtitle={`+${data?.visits.this_week || 0} this week`}
            icon="location"
            color="#10b981"
          />
          <MetricCard
            title="Pro Users"
            value={data?.users.pro || 0}
            subtitle={`${data?.engagement.conversion_rate || 0}% conversion`}
            icon="diamond"
            color="#f59e0b"
          />
          <MetricCard
            title="Avg Visits/User"
            value={data?.engagement.avg_visits_per_user || 0}
            icon="analytics"
            color="#8b5cf6"
          />
        </View>

        {/* Growth Metrics */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Growth</Text>
        <View style={[styles.growthCard, { backgroundColor: colors.surface }]}>
          <ProgressBar
            label="New Users (This Month)"
            value={data?.users.new_this_month || 0}
            maxValue={data?.users.total || 1}
            color="#3b82f6"
          />
          <ProgressBar
            label="New Visits (This Month)"
            value={data?.visits.this_month || 0}
            maxValue={data?.visits.total || 1}
            color="#10b981"
          />
          <ProgressBar
            label="Pro Conversion Rate"
            value={data?.users.pro || 0}
            maxValue={data?.users.total || 1}
            color="#f59e0b"
          />
        </View>

        {/* User Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>User Breakdown</Text>
        <View style={[styles.breakdownCard, { backgroundColor: colors.surface }]}>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Pro Users</Text>
            </View>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>{data?.users.pro || 0}</Text>
          </View>
          <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: '#6b7280' }]} />
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Free Users</Text>
            </View>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>{data?.users.free || 0}</Text>
          </View>
        </View>

        {/* Activity Summary */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Summary</Text>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>This Week</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{data?.visits.this_week || 0} visits</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Ionicons name="calendar" size={20} color="#10b981" />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>This Month</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{data?.visits.this_month || 0} visits</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: (screenWidth - 44) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  metricTitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  metricSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  growthCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 16,
  },
  progressItem: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  breakdownLabel: {
    fontSize: 15,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  breakdownDivider: {
    height: 1,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  summaryDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 40,
  },
});
