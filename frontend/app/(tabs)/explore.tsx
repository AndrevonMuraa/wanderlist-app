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
  flag_emoji?: string;
}

// Country flag emojis
const COUNTRY_FLAGS: Record<string, string> = {
  'Norway': '🇳🇴',
  'France': '🇫🇷',
  'Italy': '🇮🇹',
  'Japan': '🇯🇵',
  'Egypt': '🇪🇬',
  'Peru': '🇵🇪',
  'Australia': '🇦🇺',
  'USA': '🇺🇸',
  'UK': '🇬🇧',
  'China': '🇨🇳',
  'Spain': '🇪🇸',
  'Greece': '🇬🇷',
  'Thailand': '🇹🇭',
  'India': '🇮🇳',
  'Brazil': '🇧🇷',
  'Mexico': '🇲🇽',
  'UAE': '🇦🇪',
  'Germany': '🇩🇪',
  'Canada': '🇨🇦',
  'South Africa': '🇿🇦',
};

// Country images from Unsplash
const COUNTRY_IMAGES: Record<string, string> = {
  'Norway': 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=600',
  'France': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600',
  'Italy': 'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?w=600',
  'Japan': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600',
  'Egypt': 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=600',
  'Peru': 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=600',
  'Australia': 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=600',
  'USA': 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=600',
  'UK': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600',
  'China': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600',
  'Spain': 'https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=600',
  'Greece': 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600',
  'Thailand': 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=600',
  'India': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600',
  'Brazil': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600',
  'Mexico': 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600',
  'UAE': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600',
  'Germany': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600',
  'Canada': 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=600',
  'South Africa': 'https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=600',
};

export default function ExploreScreen() {
  const { user } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = countries.filter(country =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.continent.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCountries(filtered);
    } else {
      setFilteredCountries(countries);
    }
  }, [searchQuery, countries]);

  const fetchCountries = async () => {
    try {
      const token = await getToken();
      console.log('Fetching countries with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch(`${BACKEND_URL}/api/countries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Countries API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Countries fetched:', data.length);
        setCountries(data);
        setFilteredCountries(data);
      } else {
        console.error('Failed to fetch countries:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
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

  const renderCountryCard = ({ item }: { item: Country }) => {
    const accentColor = (theme.colors.countryAccents as any)[item.name.toLowerCase().replace(' ', '_')] || theme.colors.primary;
    
    return (
      <TouchableOpacity
        onPress={() => router.push(`/landmarks/${item.country_id}?name=${encodeURIComponent(item.name)}`)}
        activeOpacity={0.9}
        style={styles.countryCardWrapper}
      >
        <View style={styles.countryCard}>
          <Image
            source={{ uri: COUNTRY_IMAGES[item.name] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600' }}
            style={styles.countryImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.countryOverlay}
          >
            <Text style={styles.countryFlag}>{COUNTRY_FLAGS[item.name] || '🌍'}</Text>
            <Text style={styles.countryName}>{item.name}</Text>
            <Text style={styles.countryInfo}>{item.landmark_count} landmarks</Text>
          </LinearGradient>
          <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
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
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search destinations..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={theme.colors.primary}
          inputStyle={styles.searchInput}
          placeholderTextColor={theme.colors.textLight}
          elevation={0}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discover Countries</Text>
        <Text style={styles.sectionSubtitle}>Explore {countries.length} countries across the world</Text>
      </View>
    </>
  );

  const renderFooter = () => (
    <View style={styles.section}>
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
        data={filteredCountries}
        renderItem={renderCountryCard}
        keyExtractor={(item) => item.country_id}
        numColumns={2}
        columnWrapperStyle={styles.row}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="globe-outline" size={64} color={theme.colors.border} />
            <Text style={styles.emptyText}>No countries found</Text>
          </View>
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
  searchContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  searchBar: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.sm,
  },
  searchInput: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  listContainer: {
    paddingBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
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
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  countryCardWrapper: {
    width: CARD_WIDTH,
    marginBottom: theme.spacing.md,
  },
  countryCard: {
    height: 160,
    borderRadius: theme.borderRadius.xxl,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  countryImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  countryOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
  },
  countryFlag: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  countryName: {
    ...theme.typography.h4,
    color: '#fff',
    fontWeight: '700',
    marginBottom: theme.spacing.xs / 2,
  },
  countryInfo: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.9)',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    ...theme.typography.h3,
    color: theme.colors.textLight,
    marginTop: theme.spacing.md,
  },
});
