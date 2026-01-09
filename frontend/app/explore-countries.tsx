import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SectionList, TouchableOpacity, RefreshControl, Image, Dimensions, Platform } from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_URL } from '../utils/config';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';
import { CountryCardSkeleton } from '../components/Skeleton';
import { PersistentTabBar } from '../components/PersistentTabBar';

const { width } = Dimensions.get('window');
// Responsive grid: mobile (2 cols), tablet (3 cols), desktop (4 cols)
const getColumns = () => {
  if (width >= 1200) return 4; // Desktop
  if (width >= 768) return 3;  // Tablet
  return 2; // Mobile
};
const COLUMNS = getColumns();
const CARD_WIDTH = (width - (16 * (COLUMNS + 1))) / COLUMNS; // Dynamic width with spacing

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
  visited?: number; // Progress data
  percentage?: number;
}

interface ContinentSection {
  continent: string;
  data: Country[][];
}

// ISO 3166-1 alpha-2 country codes for flag CDN
const COUNTRY_FLAG_CODES: Record<string, string> = {
  // Europe
  'France': 'fr',
  'Italy': 'it',
  'Spain': 'es',
  'United Kingdom': 'gb',
  'Germany': 'de',
  'Greece': 'gr',
  'Norway': 'no',
  'Switzerland': 'ch',
  'Netherlands': 'nl',
  'Portugal': 'pt',
  // Asia
  'Japan': 'jp',
  'China': 'cn',
  'Thailand': 'th',
  'India': 'in',
  'United Arab Emirates': 'ae',
  'Singapore': 'sg',
  'Indonesia': 'id',
  'South Korea': 'kr',
  'Vietnam': 'vn',
  'Malaysia': 'my',
  // Africa
  'Egypt': 'eg',
  'Morocco': 'ma',
  'South Africa': 'za',
  'Kenya': 'ke',
  'Tanzania': 'tz',
  'Mauritius': 'mu',
  'Seychelles': 'sc',
  'Botswana': 'bw',
  'Namibia': 'na',
  'Tunisia': 'tn',
  // Americas
  'United States': 'us',
  'Canada': 'ca',
  'Mexico': 'mx',
  'Brazil': 'br',
  'Peru': 'pe',
  'Argentina': 'ar',
  'Chile': 'cl',
  'Colombia': 'co',
  'Ecuador': 'ec',
  'Costa Rica': 'cr',
  // Oceania
  'Australia': 'au',
  'New Zealand': 'nz',
  'Fiji': 'fj',
  'French Polynesia': 'pf',
  'Cook Islands': 'ck',
  'Samoa': 'ws',
  'Vanuatu': 'vu',
  'Tonga': 'to',
};

// Helper function to get flag URL
const getFlagUrl = (countryName: string): string => {
  const code = COUNTRY_FLAG_CODES[countryName];
  if (!code) return '';
  // Using flagcdn.com for high-quality flag images
  return `https://flagcdn.com/w320/${code}.png`;
};

// Continent icons
const CONTINENT_ICONS: Record<string, string> = {
  'Africa': '🌍',
  'Asia': '🌏',
  'Europe': '🇪🇺',
  'North America': '🌎',
  'South America': '🌎',
  'Oceania': '🌏',
};

export default function ExploreCountriesScreen() {
  const { user } = useAuth();
  const { continent } = useLocalSearchParams();
  const [sections, setSections] = useState<ContinentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [continent]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        console.error('No authentication token found');
        setLoading(false);
        return;
      }
      
      // Fetch countries and progress data in parallel
      const [countriesResponse, progressResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/countries`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/progress`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (countriesResponse.ok && progressResponse.ok) {
        let countries = await countriesResponse.json();
        const progress = await progressResponse.json();
        setProgressData(progress);
        
        // Filter by continent if specified
        if (continent) {
          const continentFilter = (continent as string).toLowerCase();
          countries = countries.filter((c: Country) => 
            c.continent.toLowerCase() === continentFilter
          );
        }
        
        // Merge progress data with countries
        const enrichedCountries = countries.map((country: Country) => ({
          ...country,
          visited: progress.countries[country.country_id]?.visited || 0,
          percentage: progress.countries[country.country_id]?.percentage || 0,
        }));
        
        // Group countries by continent
        const continentMap = new Map<string, Country[]>();
        enrichedCountries.forEach((country: Country) => {
          if (!continentMap.has(country.continent)) {
            continentMap.set(country.continent, []);
          }
          continentMap.get(country.continent)!.push(country);
        });

        // Create sections with rows (2 countries per row)
        const sectionList: ContinentSection[] = Array.from(continentMap.entries()).map(([continentName, countries]) => {
          // Group countries into rows of 2
          const rows: Country[][] = [];
          for (let i = 0; i < countries.length; i += 2) {
            rows.push(countries.slice(i, i + 2));
          }
          
          return {
            continent: continentName,
            data: rows as any // Cast to satisfy TypeScript
          };
        });

        setSections(sectionList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderCountryCard = ({ item }: { item: Country[] }) => {
    return (
      <View style={styles.rowContainer}>
        {item.map((country) => {
          const accentColor = (theme.colors.countryAccents as any)[country.name.toLowerCase().replace(' ', '_')] || theme.colors.primary;
          const isComplete = country.percentage === 100;
          const hasProgress = (country.visited || 0) > 0;
          const flagUrl = getFlagUrl(country.name);
          
          return (
            <View key={country.country_id} style={styles.cardContainer}>
              <TouchableOpacity
                onPress={() => router.push(`/landmarks/${country.country_id}?name=${encodeURIComponent(country.name)}`)}
                activeOpacity={0.9}
              >
                <View style={styles.countryCard}>
                  {/* Flag Container - Main Visual */}
                  <View style={styles.flagContainer}>
                    <Image
                      source={{ uri: flagUrl }}
                      style={styles.flagImage}
                      resizeMode="cover"
                    />
                    {/* Subtle Gradient Overlay for Text Readability */}
                    <LinearGradient
                      colors={['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.35)']}
                      style={styles.flagOverlay}
                    />
                  </View>
                  
                  {/* Content Overlay */}
                  <View style={styles.countryOverlay}>
                    <Text style={styles.countryName}>{country.name}</Text>
                    <Text style={styles.countryInfo}>{country.landmark_count} landmarks</Text>
                    
                    {/* Progress Indicator - Always visible */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressTextRow}>
                        <Text style={styles.progressText}>
                          {country.visited || 0}/{country.landmark_count}
                        </Text>
                        {isComplete && (
                          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                        )}
                      </View>
                      <View style={styles.miniProgressBar}>
                        <View 
                          style={[
                            styles.miniProgressFill, 
                            { 
                              width: `${country.percentage || 0}%`,
                              backgroundColor: isComplete ? '#4CAF50' : '#FFA726'
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                  <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: ContinentSection }) => {
    // Flatten rows to get all countries for calculations
    const allCountries = section.data.flat();
    const totalLandmarks = allCountries.reduce((sum, country) => sum + country.landmark_count, 0);
    
    // Continent descriptions for visual richness
    const continentDescriptions: { [key: string]: string } = {
      'Europe': 'Rich history and diverse cultures await',
      'Asia': 'Ancient traditions meet modern wonders',
      'Africa': 'Wildlife, deserts, and vibrant cultures',
      'North America': 'Natural beauty and urban adventures',
      'South America': 'Rainforests, mountains, and ancient ruins',
      'Oceania': 'Paradise islands and unique wildlife',
    };
    
    return (
      <View style={styles.sectionHeaderContainer}>
        <LinearGradient
          colors={['rgba(32, 178, 170, 0.08)', 'transparent']}
          style={styles.sectionHeaderGradient}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderContent}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.continentIconCircle}>
                  <Text style={styles.continentIcon}>{CONTINENT_ICONS[section.continent] || '🌍'}</Text>
                </View>
                <View style={styles.sectionHeaderTextContainer}>
                  <Text style={styles.sectionTitle}>{section.continent}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {allCountries.length} countries • {totalLandmarks} landmarks
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
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

  const renderListHeader = () => {
    // Calculate stats for visual display
    const totalCountries = sections.reduce((sum, section) => sum + section.data.flat().length, 0);
    
    // Calculate landmark counts from actual data
    const allCountries = sections.reduce((acc: Country[], section) => [...acc, ...section.data.flat()], []);
    const totalLandmarks = allCountries.reduce((sum, country) => sum + country.landmark_count, 0);
    
    const totalVisited = sections.reduce((sum, section) => 
      sum + section.data.flat().reduce((visitedSum, country) => visitedSum + (country.visited || 0), 0), 0);
    const totalPoints = progressData?.totalPoints || 0;

    return (
      <View>
        {/* Turquoise Gradient Header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.gradientHeader}
        >
          {continent && (
            <TouchableOpacity 
              style={styles.backButtonGradient}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
              <Text style={styles.backButtonTextWhite}>Back to Continents</Text>
            </TouchableOpacity>
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              {continent ? `${(continent as string).charAt(0).toUpperCase() + (continent as string).slice(1)}` : 'Explore Countries'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {continent ? 'Discover amazing landmarks' : 'Choose your next destination'}
            </Text>
          </View>
        </LinearGradient>

        {/* Visual Stats Section */}
        <View style={styles.statsContainerNew}>
          <Surface style={styles.statsCard}>
            <View style={styles.statBoxRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name="flag" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.statNumberLarge}>{totalCountries}</Text>
                <Text style={styles.statLabelNew}>Countries</Text>
              </View>
              
              <View style={styles.statDividerNew} />
              
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
                  <Ionicons name="location" size={24} color={theme.colors.accent} />
                </View>
                <Text style={styles.statNumberLarge}>{totalLandmarks}</Text>
                <Text style={styles.statLabelNew}>Landmarks</Text>
              </View>
              
              <View style={styles.statDividerNew} />
              
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.colors.accentYellow + '20' }]}>
                  <Ionicons name="star" size={24} color={theme.colors.accentYellow} />
                </View>
                <Text style={styles.statNumberLarge}>{totalPoints}</Text>
                <Text style={styles.statLabelNew}>Points</Text>
              </View>
            </View>
          </Surface>
        </View>
      </View>
    );
  };

  const renderListFooter = () => (
    <View style={styles.featuresSection}>
      <Text style={styles.featuresSectionTitle}>Features</Text>
      
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Discover the World</Text>
          <Text style={styles.welcomeSubtext}>Loading amazing destinations...</Text>
        </View>
        <View style={styles.skeletonContainer}>
          <View style={styles.rowContainer}>
            <CountryCardSkeleton />
            <CountryCardSkeleton />
          </View>
          <View style={styles.rowContainer}>
            <CountryCardSkeleton />
            <CountryCardSkeleton />
          </View>
          <View style={styles.rowContainer}>
            <CountryCardSkeleton />
            <CountryCardSkeleton />
          </View>
        </View>
      </SafeAreaView>
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

      <SectionList
        sections={sections}
        renderItem={renderCountryCard}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item, index) => `row-${index}-${item.map(c => c.country_id).join('-')}`}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />
      <PersistentTabBar />
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
    marginBottom: theme.spacing.md,
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
    paddingBottom: theme.spacing.md,
  },
  gradientHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  backButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  backButtonTextWhite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerTextContainer: {
    marginTop: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainerNew: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  statsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  statBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statNumberLarge: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabelNew: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  statDividerNew: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.sm,
  },

  welcomeSection: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  backButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeTextContainer: {
    marginBottom: theme.spacing.md,
  },
  welcomeText: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: theme.spacing.xs / 2,
  },
  welcomeTextAccent: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  welcomeSubtext: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceTinted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs / 2,
  },
  statNumber: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 24,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  landmarkBreakdown: {
    flexDirection: 'column',
    gap: 2,
    marginTop: 4,
  },
  landmarkBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  landmarkBreakdownText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  sectionHeaderContainer: {
    marginBottom: theme.spacing.xs,
  },
  sectionHeaderGradient: {
    paddingVertical: theme.spacing.xs,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continentIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(32, 178, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  continentIcon: {
    fontSize: 24,
  },
  sectionHeaderTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs / 2,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  rowContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardContainer: {
    flex: 1,
    paddingBottom: theme.spacing.md,
  },
  leftCard: {
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.xs,
  },
  rightCard: {
    paddingRight: theme.spacing.md,
    paddingLeft: theme.spacing.xs,
  },
  countryCard: {
    height: 220,
    borderRadius: theme.borderRadius.xxl,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  flagContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  flagImage: {
    width: '100%',
    height: '100%',
  },
  flagOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  countryOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
  },
  countryFlag: {
    fontSize: 36,
    marginBottom: theme.spacing.sm,
  },
  countryName: {
    ...theme.typography.h3,
    color: '#fff',
    fontWeight: '700',
    marginBottom: theme.spacing.xs / 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  countryInfo: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  featuresSection: {
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  featuresSectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontWeight: '700',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs / 2,
  },
  featureSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: theme.spacing.md,
  },
  progressContainer: {
    marginTop: theme.spacing.xs,
    width: '100%',
  },
  progressTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  miniProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
