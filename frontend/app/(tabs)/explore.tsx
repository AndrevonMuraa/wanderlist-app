import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Dimensions, Platform } from 'react-native';
import { Text, Searchbar, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with spacing

// Helper to get token (works on both web and native)
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface Country {
  country_id: string;
  name: string;
  continent: string;
  landmark_count: number;
}

interface Continent {
  name: string;
  countries: Country[];
  totalLandmarks: number;
  image: string;
}

// Continent images and info
const CONTINENT_DATA: Record<string, { image: string; description: string }> = {
  'Africa': {
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800',
    description: 'Ancient wonders and wild beauty'
  },
  'Asia': {
    image: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
    description: 'Timeless traditions and modern marvels'
  },
  'Europe': {
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800',
    description: 'Historic grandeur and artistic heritage'
  },
  'North America': {
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
    description: 'Diverse landscapes and iconic cities'
  },
  'South America': {
    image: 'https://images.unsplash.com/photo-1589802829982-cc4628e7b2b8?w=800',
    description: 'Vibrant culture and natural wonders'
  },
  'Oceania': {
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800',
    description: 'Paradise islands and unique wildlife'
  },
};

export default function ExploreScreen() {
  const { user } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [continents, setContinents] = useState<Continent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/countries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCountries(data);
        
        // Group countries by continent
        const continentMap = new Map<string, Country[]>();
        data.forEach((country: Country) => {
          if (!continentMap.has(country.continent)) {
            continentMap.set(country.continent, []);
          }
          continentMap.get(country.continent)!.push(country);
        });

        // Create continent objects
        const continentList: Continent[] = Array.from(continentMap.entries()).map(([name, countries]) => ({
          name,
          countries,
          totalLandmarks: countries.reduce((sum, c) => sum + c.landmark_count, 0),
          image: CONTINENT_DATA[name]?.image || CONTINENT_DATA['Asia'].image
        }));

        setContinents(continentList);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCountries();
  };

  const renderContinentCard = ({ item }: { item: Continent }) => {
    const continentInfo = CONTINENT_DATA[item.name];
    
    return (
      <TouchableOpacity
        onPress={() => router.push(`/continent/${encodeURIComponent(item.name)}`)}
        activeOpacity={0.9}
        style={styles.continentCardWrapper}
      >
        <View style={styles.continentCard}>
          <Image
            source={{ uri: item.image }}
            style={styles.continentImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={styles.continentOverlay}
          >
            <Text style={styles.continentName}>{item.name}</Text>
            <Text style={styles.continentDescription}>
              {continentInfo?.description || 'Explore destinations'}
            </Text>
            <View style={styles.continentStats}>
              <View style={styles.statItem}>
                <Ionicons name="flag-outline" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.statText}>{item.countries.length} countries</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.statText}>{item.totalLandmarks} landmarks</Text>
              </View>
            </View>
          </LinearGradient>
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeatureCard = (icon: string, title: string, subtitle: string, onPress: () => void, accentColor: string) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={styles.featureCard}
    >
      <View style={[styles.featureIcon, { backgroundColor: accentColor + '20' }]}>
        <Ionicons name={icon as any} size={28} color={accentColor} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Discover the World</Text>
        <Text style={styles.welcomeSubtext}>
          Explore {continents.reduce((sum, c) => sum + c.totalLandmarks, 0)} landmarks across {continents.length} continents
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Explore by Continent</Text>
        <Text style={styles.sectionSubtitle}>Choose your destination</Text>
      </View>
    </>
  );

  const renderFooter = () => (
    <View style={styles.featuresSection}>
      <Text style={styles.sectionTitle}>Features</Text>
      
      {renderFeatureCard(
        'compass',
        'AI Trip Planner',
        'Plan your next adventure',
        () => {},
        theme.colors.primary
      )}
      
      {renderFeatureCard(
        'trophy',
        'Leaderboard',
        "See who's leading",
        () => router.push('/(tabs)/leaderboard'),
        theme.colors.accent
      )}
      
      {renderFeatureCard(
        'ribbon',
        'Achievements',
        'View your badges',
        () => {},
        theme.colors.accentBronze
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="earth" size={32} color={theme.colors.primary} />
          <Text style={styles.logo}>WanderList</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/profile')}>
          <View style={styles.profileCircle}>
            <Text style={styles.profileInitial}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={continents}
        renderItem={renderContinentCard}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    fontWeight: '700',
  },
  profileButton: {
    padding: theme.spacing.xs,
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    ...theme.typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: theme.spacing.xl,
  },
  welcomeSection: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  welcomeText: {
    ...theme.typography.display,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  welcomeSubtext: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  continentCardWrapper: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  continentCard: {
    height: 200,
    borderRadius: theme.borderRadius.xxl,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  continentImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  continentOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
  },
  continentName: {
    ...theme.typography.h1,
    color: '#fff',
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  continentDescription: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: theme.spacing.md,
  },
  continentStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  chevronContainer: {
    position: 'absolute',
    right: theme.spacing.lg,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresSection: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.sm,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  featureSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
