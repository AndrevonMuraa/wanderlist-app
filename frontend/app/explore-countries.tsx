import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SectionList, TouchableOpacity, RefreshControl, Image, ImageBackground, Dimensions, Platform, StatusBar } from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_URL } from '../utils/config';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme, { gradients } from '../styles/theme';
import { CountryCardSkeleton } from '../components/Skeleton';
import { PersistentTabBar } from '../components/PersistentTabBar';
import { AddCountryVisitModal } from '../components/AddCountryVisitModal';

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
  const [showCountryVisitModal, setShowCountryVisitModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{id: string; name: string} | null>(null);
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
          const isComplete = country.percentage === 100;
          const hasProgress = (country.visited || 0) > 0;
          const flagUrl = getFlagUrl(country.name);
          const pointReward = country.landmark_count * 10;
          
          return (
            <View key={country.country_id} style={styles.cardContainer}>
              <TouchableOpacity
                onPress={() => router.push(`/landmarks/${country.country_id}?name=${encodeURIComponent(country.name)}`)}
                activeOpacity={0.9}
              >
                <View style={styles.countryCard}>
                  {/* Full Flag - Top 70% */}
                  <ImageBackground
                    source={{ uri: flagUrl }}
                    style={styles.flagSectionFull}
                    resizeMode="cover"
                  >
                    {/* Country Name Overlay */}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)']}
                      style={styles.flagNameGradient}
                    >
                      <Text style={styles.countryNameOnFlag}>{country.name}</Text>
                    </LinearGradient>
                    
                    {/* Completion Badge */}
                    {isComplete && (
                      <View style={styles.completeBadgeTop}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      </View>
                    )}
                  </ImageBackground>
                  
                  {/* Info Bar - Bottom 30% */}
                  <View style={styles.infoBar}>
                    <View style={styles.pointsSection}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.pointsText}>{pointReward} points</Text>
                    </View>
                    
                    {hasProgress ? (
                      <View style={styles.progressMini}>
                        <Text style={styles.progressMiniText}>{country.visited}/{country.landmark_count}</Text>
                        {isComplete && (
                          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.shareButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedCountry({ id: country.country_id, name: country.name });
                          setShowCountryVisitModal(true);
                        }}
                      >
                        <Ionicons name="share-social" size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
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

  const renderStatsHeader = () => {
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
      <Text style={styles.featuresSectionTitle}>Premium Features</Text>
      
      {renderFeatureCard(
        'analytics',
        'Travel Analytics',
        'Premium: View detailed stats & insights',
        () => router.push('/analytics'),
        theme.colors.primary
      )}
      
      {renderFeatureCard(
        'folder-multiple',
        'My Collections',
        'Premium: Organize your dream destinations',
        () => router.push('/collections'),
        theme.colors.accent
      )}
      
      {renderFeatureCard(
        'trophy',
        'Leaderboard',
        "Compete with travelers worldwide",
        () => router.push('/leaderboard'),
        theme.colors.accentYellow
      )}
      
      {renderFeatureCard(
        'ribbon',
        'Achievements',
        'Unlock badges and milestones',
        () => router.push('/achievements'),
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
      {/* Sticky Header */}
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={styles.stickyHeader}
      >
        {/* Single Row: Back + Title Left, Branding Right */}
        <View style={styles.headerRow}>
          <View style={styles.titleWithBack}>
            {continent && (
              <TouchableOpacity 
                style={styles.backButtonInline}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>
              {continent ? `${(continent as string).charAt(0).toUpperCase() + (continent as string).slice(1)}` : 'Explore Countries'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <Ionicons name="earth" size={16} color="#2A2A2A" />
            <Text style={styles.brandingTextDark}>WanderList</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <SectionList
        sections={sections}
        renderItem={renderCountryCard}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item, index) => `row-${index}-${item.map(c => c.country_id).join('-')}`}
        contentContainerStyle={[styles.listContainer, { paddingBottom: Platform.OS === 'ios' ? 100 : 90 }]}
        ListHeaderComponent={renderStatsHeader}
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
      
      {selectedCountry && (
        <AddCountryVisitModal
          visible={showCountryVisitModal}
          countryId={selectedCountry.id}
          countryName={selectedCountry.name}
          onClose={() => {
            setShowCountryVisitModal(false);
            setSelectedCountry(null);
          }}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
      
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
  stickyHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  titleWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButtonInline: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandingTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
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
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
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
  profileInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonInline: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
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
  flagBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  flagBackgroundImageStyle: {
    opacity: 1,
  },
  luxuryOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  cardContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.spacing.md,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  countryNameLux: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2A2A',
    marginBottom: theme.spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  pointChip: {
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  infoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  luxProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressIndicator: {
    height: '100%',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  completionGlow: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 2,
  },

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
    height: 140,  // Taller for vertical layout
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  flagSectionFull: {
    width: '100%',
    height: '70%',  // Flag takes 70% of card
  },
  flagNameGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.sm,
  },
  countryNameOnFlag: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  completeBadgeTop: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 2,
  },
  infoBar: {
    height: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pointsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C9A961',
  },
  progressMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressMiniText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  progressBarTiny: {
    width: 60,
    height: 3,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillTiny: {
    height: '100%',
  },
  shareButton: {
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.primary + '15',
    borderRadius: theme.borderRadius.sm,
  },
  flagImageCompact: {
    width: '100%',
    height: 50,
  },
  infoSection: {
    flex: 1,
    padding: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  countryNameCompact: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  compactProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  progressBarMini: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillMini: {
    height: '100%',
  },
  progressPercentText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primary,
    minWidth: 32,
    textAlign: 'right',
  },
  completeBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
  },
  countryNameNew: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  statsRowNew: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  statBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statBubbleText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  progressBarNew: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillNew: {
    height: '100%',
  },
  progressTextNew: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  visitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary + '15',
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  visitButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
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
