import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SectionList, TouchableOpacity, RefreshControl, Image, ImageBackground, Dimensions, Platform, StatusBar } from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { safeGoBack } from '../utils/navigation';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_URL } from '../utils/config';
import { cachedFetch } from '../utils/apiCache';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import theme, { gradients } from '../styles/theme';
import { CountryCardSkeleton } from '../components/Skeleton';
import { PersistentTabBar } from '../components/PersistentTabBar';
import { HeaderBranding } from '../components/BrandedGlobeIcon';
import { getToken } from '../utils/token';
import {
  getFlagUrl, CONTINENT_ICON_NAMES, CONTINENT_DESCRIPTIONS,
  OCEANIA_GEOGRAPHIC, Country, ContinentSection,
} from '../utils/countryConfig';

const { width } = Dimensions.get('window');

// Pilot: render flag background as a blurred version of the flag itself
// (instead of the flat sand-beige backdrop). Expand the set to roll out.
const BLUR_FLAG_BACKDROP: ReadonlySet<string> = new Set(['Pakistan']);


// ISO 3166-1 alpha-2 country codes for flag CDN
// Helper function to get flag URL
// Continent icons - using Ionicons names to match Journey page
export default function ExploreCountriesScreen() {
  const { user } = useAuth();
  const { continent } = useLocalSearchParams();
  const [sections, setSections] = useState<ContinentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Calculate safe area padding - same as continents.tsx (golden standard)
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchData();
      }
    }, [continent, user])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      // Destination visits in parallel (cached)
      const results = await Promise.allSettled([
        cachedFetch(`${BACKEND_URL}/api/countries`, token || '', 'countries'),
        cachedFetch(`${BACKEND_URL}/api/progress`, token || '', 'progress'),
        cachedFetch(`${BACKEND_URL}/api/country-visits`, token || '', 'country-visits'),
      ]);

      const [countriesResult, progressResult, destinationVisitsResult] = results;

      const countriesOk = countriesResult.status === 'fulfilled' && countriesResult.value.ok;
      const progressOk = progressResult.status === 'fulfilled' && progressResult.value.ok;

      if (countriesOk && progressOk) {
        let countries = await countriesResult.value.json();
        const progress = await progressResult.value.json();
        setProgressData(progress);
        
        // Destination visits (set of country_ids that have been visited)
        let visitedDestinationIds = new Set<string>();
        let verifiedDestinationIds = new Set<string>();
        if (destinationVisitsResult.status === 'fulfilled' && destinationVisitsResult.value.ok) {
          const destinationVisits = await destinationVisitsResult.value.json();
          visitedDestinationIds = new Set(destinationVisits.map((v: any) => v.country_id));
          verifiedDestinationIds = new Set(destinationVisits.filter((v: any) => v.photos && v.photos.length > 0).map((v: any) => v.country_id));
        }
        
        // Filter by continent if specified
        if (continent) {
          const continentFilter = (continent as string).toLowerCase();
          countries = countries.filter((c: Country) => 
            c.continent.toLowerCase() === continentFilter
          );
        }
        
        // Destination visit status with countries
        const enrichedCountries = countries.map((country: Country) => ({
          ...country,
          visited: progress.countries[country.country_id]?.visited || 0,
          percentage: progress.countries[country.country_id]?.percentage || 0,
          destinationVisited: visitedDestinationIds.has(country.country_id) || (progress.countries[country.country_id]?.visited || 0) > 0,
          countryVerified: verifiedDestinationIds.has(country.country_id) || (progress.countries[country.country_id]?.visited || 0) > 0,
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
        // For Oceania: sort geographic Oceania first, then island paradises, but keep as ONE section
        const sectionList: ContinentSection[] = [];
        
        Array.from(continentMap.entries()).forEach(([continentName, countries]) => {
          let sortedCountries = countries;
          let displayName = continentName;
          
          if (continentName === 'Oceania' && continent) {
            // Sort: geographic Oceania first, then other island paradises
            const oceaniaCountries = countries.filter(c => OCEANIA_GEOGRAPHIC.has(c.country_id));
            const islandParadises = countries.filter(c => !OCEANIA_GEOGRAPHIC.has(c.country_id));
            sortedCountries = [...oceaniaCountries, ...islandParadises];
            displayName = 'Oceania and other Island Paradises';
          }
          
          const rows: Country[][] = [];
          for (let i = 0; i < sortedCountries.length; i += 2) {
            rows.push(sortedCountries.slice(i, i + 2));
          }
          sectionList.push({ continent: displayName, data: rows as any });
        });

        setSections(sectionList);
      }
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const [flagErrors, setFlagErrors] = useState<Set<string>>(new Set());

  const renderDestinationCard = ({ item }: { item: Country[] }) => {
    return (
      <View style={styles.rowContainer}>
        {item.map((country) => {
          const isComplete = country.percentage === 100;
          const hasProgress = (country.visited || 0) > 0;
          const isDestinationVisited = country.destinationVisited || false; // Country marked as visited (manual or via landmarks)
          const flagUrl = getFlagUrl(country.name);
          const flagFailed = flagErrors.has(country.country_id);
          const pointReward = country.total_points || (country.landmark_count * 10); // Use API points or fallback
          
          return (
            <View key={country.country_id} style={styles.cardContainer}>
              <TouchableOpacity
                onPress={() => router.push(`/landmarks/${country.country_id}?name=${encodeURIComponent(country.name)}`)}
                activeOpacity={0.9}
                accessibilityLabel={`${country.name}, ${country.landmark_count} landmarks, ${country.visited || 0} visited`}
                accessibilityRole="button"
              >
                <View style={styles.countryCard}>
                  {/* Full Flag - Top Section */}
                  <View style={styles.flagSectionFull}>
                    {/* Premium: blurred flag backdrop (pilot — expand via BLUR_FLAG_BACKDROP) */}
                    {flagUrl && !flagFailed && BLUR_FLAG_BACKDROP.has(country.name) && (
                      <>
                        <Image
                          source={{ uri: flagUrl }}
                          style={[
                            StyleSheet.absoluteFillObject,
                            Platform.OS === 'web'
                              ? ({ filter: 'blur(22px) saturate(1.6)', transform: [{ scale: 1.2 }] } as any)
                              : { transform: [{ scale: 1.15 }] },
                          ]}
                          resizeMode="cover"
                          blurRadius={Platform.OS === 'web' ? 0 : 28}
                        />
                        {Platform.OS !== 'web' && (
                          <BlurView
                            intensity={35}
                            tint="light"
                            style={StyleSheet.absoluteFillObject}
                          />
                        )}
                        {/* Soft tint layer so blurred colors feel dreamy, not neon */}
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.28)' }]} />
                      </>
                    )}
                    {/* Base Flag Image or Fallback */}
                    {flagUrl && !flagFailed ? (
                      <Image
                        source={{ uri: flagUrl }}
                        style={styles.flagImage}
                        resizeMode="contain"
                        onError={() => setFlagErrors(prev => new Set(prev).add(country.country_id))}
                      />
                    ) : (
                      <View style={[styles.flagImage, styles.flagFallback]}>
                        <Text style={styles.flagFallbackText}>{country.name.charAt(0)}</Text>
                      </View>
                    )}
                    
                    {/* Premium Texture Overlays */}
                    {/* 1. Glossy Shine Effect - Top highlight */}
                    <LinearGradient
                      colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.05)', 'transparent']}
                      locations={[0, 0.3, 0.6]}
                      style={styles.glossOverlay}
                    />
                    
                    {/* 2. Vignette Effect - Darker edges for depth */}
                    <LinearGradient
                      colors={['transparent', 'transparent', 'rgba(0,0,0,0.15)']}
                      locations={[0, 0.7, 1]}
                      style={styles.vignetteOverlay}
                    />
                    
                    {/* 3. Subtle fabric/linen texture effect */}
                    <View style={styles.textureOverlay} />
                    
                    {/* 4. Edge highlight for 3D effect */}
                    <View style={styles.edgeHighlight} />
                    
                    {/* Country Name Overlay */}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.75)']}
                      style={styles.flagNameGradient}
                    >
                      <Text style={styles.countryNameOnFlag}>{country.name}</Text>
                    </LinearGradient>
                    
                    {/* Visited Badge - shows when country is visited (manual or via landmarks) */}
                    {isDestinationVisited && (
                      <View style={styles.completeBadgeTop}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      </View>
                    )}
                  </View>
                  
                  {/* Info Bar - Bottom Section */}
                  <View style={styles.infoBar}>
                    <View style={styles.infoBarRow}>
                      <View style={styles.pointsSection}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.pointsText}>{pointReward} pts</Text>
                      </View>
                      <View style={styles.progressMini}>
                        <Ionicons name="location" size={12} color={hasProgress ? theme.colors.primary : theme.colors.textLight} />
                        <Text style={[styles.progressMiniText, hasProgress && { color: theme.colors.primary }]}>
                          {country.visited || 0}/{country.landmark_count}
                        </Text>
                        {isComplete && (
                          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                        )}
                      </View>
                    </View>
                    <View style={styles.infoBarProgress}>
                      <View style={[
                        styles.infoBarProgressFill,
                        { 
                          width: `${country.percentage || 0}%`,
                          backgroundColor: isComplete ? '#4CAF50' : theme.colors.primary,
                        }
                      ]} />
                    </View>
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
    const allCountries = section.data.flat();
    const totalLandmarks = allCountries.reduce((sum, country) => sum + country.landmark_count, 0);
    
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
                  <Ionicons 
                    name={(CONTINENT_ICON_NAMES[section.continent] || 'globe-outline') as any} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </View>
                <View style={styles.sectionHeaderTextContainer}>
                  <Text style={styles.sectionTitle}>{section.continent}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {allCountries.length} destinations • {totalLandmarks} landmarks • {allCountries.reduce((s, c) => s + (c.total_points || c.landmark_count * 10), 0).toLocaleString()} pts
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
    
    // Calculate landmark counts and total available points from actual data
    const allCountries = sections.reduce((acc: Country[], section) => [...acc, ...section.data.flat()], []);
    const totalLandmarks = allCountries.reduce((sum, country) => sum + country.landmark_count, 0);
    const totalAvailablePoints = allCountries.reduce((sum, country) => sum + (country.total_points || country.landmark_count * 10), 0);
    
    const totalVisited = sections.reduce((sum, section) => 
      sum + section.data.flat().reduce((visitedSum, country) => visitedSum + (country.visited || 0), 0), 0);

    // Destination visits
    const totalVisitedCountries = allCountries.filter(c => c.destinationVisited).length;
    const totalVerifiedCountries = allCountries.filter(c => c.countryVerified).length;
    const totalEarnedPoints = allCountries.reduce((sum, country) => {
      const visitedLandmarks = country.visited || 0;
      const destinationVisitPoints = country.destinationVisited ? 50 : 0;
      return sum + (visitedLandmarks * 10) + destinationVisitPoints;
    }, 0);
    const totalMaxPoints = totalCountries * 50;

    return (
      <View>

        {/* Destination Progress Dashboard */}
        <View style={styles.statsContainerNew}>
          <Surface style={styles.statsCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressHeaderTitle}>Destination Progress</Text>
              <View style={styles.progressPointsBadge}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.progressPointsText}>{totalEarnedPoints} pts</Text>
              </View>
            </View>

            <View style={styles.progressRow}>
              <Ionicons name="flag" size={16} color="#4DB8D8" />
              <View style={styles.progressBarContent}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>{totalVisitedCountries}/{totalCountries} Destinations</Text>
                  <Text style={styles.progressPct}>{totalCountries > 0 ? Math.round((totalVisitedCountries / totalCountries) * 100) : 0}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(100, (totalVisitedCountries / totalCountries) * 100)}%`, backgroundColor: '#4DB8D8' }]} />
                </View>
              </View>
            </View>

            <View style={styles.progressRow}>
              <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
              <View style={styles.progressBarContent}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>{totalVerifiedCountries}/{totalVisitedCountries} Verified</Text>
                  <Text style={styles.progressPct}>{totalVisitedCountries > 0 ? Math.round((totalVerifiedCountries / totalVisitedCountries) * 100) : 0}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${totalVisitedCountries > 0 ? Math.min(100, (totalVerifiedCountries / totalVisitedCountries) * 100) : 0}%`, backgroundColor: '#4CAF50' }]} />
                </View>
              </View>
            </View>

            <View style={styles.progressRow}>
              <Ionicons name="star" size={16} color="#FFA726" />
              <View style={styles.progressBarContent}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>{totalEarnedPoints}/{totalMaxPoints.toLocaleString()} Points</Text>
                  <Text style={styles.progressPct}>{totalMaxPoints > 0 ? ((totalEarnedPoints / totalMaxPoints) * 100).toFixed(1) : 0}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(100, (totalEarnedPoints / totalMaxPoints) * 100)}%`, backgroundColor: '#FFA726' }]} />
                </View>
              </View>
            </View>
          </Surface>
        </View>
      </View>
    );
  };

  const renderListFooter = () => (
    <View style={styles.footerSpacer} />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gradients.oceanToSand}
          start={gradients.horizontal.start}
          end={gradients.horizontal.end}
          style={[styles.stickyHeader, { paddingTop: topPadding }]}
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Discover the World</Text>
            <View style={styles.brandingContainer}>
              <HeaderBranding size={18} textColor="#2A2A2A" />
            </View>
          </View>
        </LinearGradient>
        <View style={styles.skeletonContainer}>
          <Text style={styles.welcomeSubtext}>Loading amazing destinations...</Text>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sticky Header - with paddingTop for safe area */}
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.stickyHeader, { paddingTop: topPadding }]}
      >
        {/* Single Row: Back + Title Left, Branding Right */}
        <View style={styles.headerRow}>
          <View style={styles.titleWithBack}>
            {continent && (
              <TouchableOpacity 
                onPress={() => safeGoBack(router)}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                  overflow: 'hidden',
                }}>
                  <Ionicons name="arrow-back" size={22} color="#fff" />
                </View>
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>
              {continent ? `${(continent as string).charAt(0).toUpperCase() + (continent as string).slice(1)}` : 'Explore Destinations'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <HeaderBranding size={18} textColor="#2A2A2A" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <SectionList
        sections={sections}
        renderItem={renderDestinationCard}
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
      
      <PersistentTabBar />
    </View>
  );
}

const styles = StyleSheet.create<any>({
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
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
  headerTextContainer: {
    flex: 1,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
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
  statNumberCompact: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 2,
  },
  statLabelCompact: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  statNumberProgress: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabelProgress: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.textLight,
    marginTop: 2,
  },
  statDividerNew: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.sm,
  },
  // Progress Dashboard
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  progressPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressPointsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFA726',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  progressBarContent: {
    flex: 1,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textLight,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 2,
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
    flex: 1,
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
    height: 170,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    // Enhanced shadow for premium 3D effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  flagSectionFull: {
    width: '100%',
    height: '70%',
    position: 'relative',
    overflow: 'hidden',
    // Soft neutral backdrop so that `resizeMode="contain"` letterboxing stays
    // visually elegant when flag ratios don't match the container.
    backgroundColor: '#F4F1EB',
  },
  flagImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  flagFallback: {
    backgroundColor: 'rgba(32, 178, 170, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagFallbackText: {
    fontSize: 40,
    fontWeight: '800',
    color: 'rgba(32, 178, 170, 0.6)',
  },
  // Premium texture overlays
  glossOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    zIndex: 1,
  },
  vignetteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  textureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    // Subtle linen/fabric texture effect using repeated pattern
    backgroundColor: 'transparent',
    opacity: 0.03,
    // Creates a subtle noise/grain effect
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)',
  },
  edgeHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    zIndex: 4,
  },
  flagNameGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
    zIndex: 5,
  },
  countryNameOnFlag: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
  },
  completeBadgeTop: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    padding: 3,
    zIndex: 6,
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  infoBar: {
    paddingHorizontal: theme.spacing.sm,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  infoBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  pointsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B8860B',
    letterSpacing: 0.2,
  },
  progressMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  progressMiniText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textLight,
  },
  infoBarProgress: {
    height: 3,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  infoBarProgressFill: {
    height: '100%',
    borderRadius: 2,
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
  footerSpacer: {
    height: theme.spacing.xl,
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
