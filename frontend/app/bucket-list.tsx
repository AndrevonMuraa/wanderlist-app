import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { PersistentTabBar } from '../components/PersistentTabBar';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface BucketListItem {
  bucket_list_id: string;
  added_at: string;
  notes?: string;
  landmark: {
    landmark_id: string;
    name: string;
    country_name: string;
    continent: string;
    points: number;
    category: string;
  };
}

export default function BucketListScreen() {
  const router = useRouter();
  const [bucketList, setBucketList] = useState<BucketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBucketList();
  }, []);

  const loadBucketList = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/bucket-list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBucketList(data);
      }
    } catch (error) {
      console.error('Error loading bucket list:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBucketList();
    setRefreshing(false);
  };

  const handleRemove = (item: BucketListItem) => {
    Alert.alert(
      'Remove from Bucket List',
      `Remove ${item.landmark.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromBucketList(item.bucket_list_id),
        },
      ]
    );
  };

  const removeFromBucketList = async (bucketListId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/bucket-list/${bucketListId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setBucketList(prev => prev.filter(item => item.bucket_list_id !== bucketListId));
      }
    } catch (error) {
      console.error('Error removing from bucket list:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'nature':
        return 'leaf';
      case 'cultural':
        return 'globe';
      case 'historical':
        return 'time';
      case 'premium':
        return 'diamond';
      default:
        return 'location';
    }
  };

  const renderBucketListItem = (item: BucketListItem) => (
    <Surface key={item.bucket_list_id} style={styles.itemCard}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => router.push(`/landmark-detail/${item.landmark.landmark_id}`)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            item.landmark.category === 'premium' && styles.iconContainerPremium,
          ]}
        >
          <Ionicons
            name={getCategoryIcon(item.landmark.category) as any}
            size={24}
            color={item.landmark.category === 'premium' ? '#FFD700' : theme.colors.primary}
          />
        </View>

        {/* Content */}
        <View style={styles.itemInfo}>
          <Text style={styles.landmarkName} numberOfLines={1}>
            {item.landmark.name}
          </Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {item.landmark.country_name} • {item.landmark.continent}
          </Text>
          <View style={styles.metadata}>
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.pointsText}>{item.landmark.points} pts</Text>
            </View>
            {item.landmark.category === 'premium' && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={10} color="#FFD700" />
                <Text style={styles.premiumText}>PREMIUM</Text>
              </View>
            )}
          </View>
        </View>

        {/* Remove Button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemove(item)}
        >
          <Ionicons name="close-circle" size={24} color={theme.colors.textLight} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Surface>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading bucket list...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Universal Turquoise Header */}
      <LinearGradient
        colors={['#3BB8C3', '#2AA8B3']}
        style={styles.headerGradient}
      >
        {/* Top Row: Branding + Profile */}
        <View style={styles.brandingRow}>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <Ionicons name="earth" size={18} color="#fff" />
            <Text style={styles.brandingText}>WanderList</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <View style={styles.profileCircle}>
              <Ionicons name="person" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Bucket List</Text>
            <Text style={styles.headerSubtitle}>
              {bucketList.length === 0 ? 'Save landmarks to visit' : `${bucketList.length} saved`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={styles.tabButton}
          onPress={() => router.push('/continents')}
        >
          <Ionicons name="earth" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.tabLabel}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, styles.tabButtonActive]}
        >
          <Ionicons name="bookmark" size={20} color={theme.colors.primary} />
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Bucket List</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bucket List</Text>
          <Text style={styles.subtitle}>
            {bucketList.length === 0
              ? 'No landmarks saved yet'
              : `${bucketList.length} ${bucketList.length === 1 ? 'landmark' : 'landmarks'} to visit`}
          </Text>
        </View>

        {/* Bucket List */}
        {bucketList.length > 0 ? (
          <View style={styles.listContainer}>
            {bucketList.map(item => renderBucketListItem(item))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>Your Bucket List is Empty</Text>
            <Text style={styles.emptyText}>
              Browse landmarks and tap the heart icon to add them to your bucket list
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.exploreButtonText}>Explore Landmarks</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
      <PersistentTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGradient: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: theme.colors.primary,
  },
  // Universal header branding styles
  brandingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  profileButton: {
    padding: 2,
  },
  profileCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs / 2,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${theme.colors.primary}30`,
  },
  iconContainerPremium: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  itemInfo: {
    flex: 1,
  },
  landmarkName: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  locationText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  metadata: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${theme.colors.background}`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  pointsText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 11,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  premiumText: {
    ...theme.typography.caption,
    color: '#FFD700',
    fontWeight: '700',
    fontSize: 10,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  exploreButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  exploreButtonText: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
  },
});
