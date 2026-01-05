import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Alert, Dimensions } from 'react-native';
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

interface Country {
  country_id: string;
  name: string;
  continent: string;
  landmark_count: number;
}

// Group countries by continent
const CONTINENT_IMAGES: Record<string, string> = {
  'Africa': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800',
  'Asia': 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800',
  'Europe': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800',
  'North America': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
  'South America': 'https://images.unsplash.com/photo-1589802829982-cc4628e7b2b8?w=800',
  'Oceania': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800',
};

export default function ExploreScreen() {
  const { user } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [continents, setContinents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${BACKEND_URL}/api/countries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCountries(data);
        
        // Group by continent
        const continentMap = new Map();
        data.forEach((country: Country) => {
          if (!continentMap.has(country.continent)) {
            continentMap.set(country.continent, {
              continent: country.continent,
              count: 0,
              countries: []
            });
          }
          const cont = continentMap.get(country.continent);
          cont.count += country.landmark_count;
          cont.countries.push(country);
        });
        
        setContinents(Array.from(continentMap.values()));
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

  const renderContinentCard = ({ item, index }: { item: any; index: number }) => {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/continent/${item.continent}`)}
        activeOpacity={0.9}
        style={styles.continentCardWrapper}
      >
        <View style={styles.continentCard}>
          <Image
            source={{ uri: CONTINENT_IMAGES[item.continent] || CONTINENT_IMAGES['Asia'] }}
            style={styles.continentImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.continentOverlay}
          >
            <Text style={styles.continentName}>{item.continent}</Text>
            <Text style={styles.continentCount}>{item.count} landmarks</Text>
          </LinearGradient>
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
      <View style={[styles.featureIcon, { backgroundColor: accentColor + '15' }]}>
        <Ionicons name={icon as any} size={32} color={accentColor} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
    </TouchableOpacity>
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
        <TouchableOpacity style={styles.profileButton}>
          <View style={styles.profileCircle}>
            <Text style={styles.profileInitial}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
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
              <Text style={styles.sectionTitle}>Explore by Continent</Text>
              <View style={styles.continentsGrid}>
                {continents.map((continent, index) => (
                  <View key={continent.continent} style={{ width: CARD_WIDTH }}>
                    {renderContinentCard({ item: continent, index })}
                  </View>
                ))}
              </View>
            </View>

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
          </>
        }
        contentContainerStyle={styles.listContainer}
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
    ...theme.typography.h4,
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
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  continentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  continentCardWrapper: {
    marginBottom: theme.spacing.md,
  },
  continentCard: {
    height: 160,
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
    padding: theme.spacing.md,
  },
  continentName: {
    ...theme.typography.h3,
    color: '#fff',
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  continentCount: {
    ...theme.typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
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
