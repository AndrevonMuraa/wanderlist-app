import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SectionList, TouchableOpacity, RefreshControl, Image, Dimensions, Platform } from 'react-native';
import { Text, Searchbar, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { BACKEND_URL } from '../../utils/config';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

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
}

interface ContinentSection {
  continent: string;
  data: Country[];
}

// Country flag emojis
const COUNTRY_FLAGS: Record<string, string> = {
  'Norway': '🇳🇴', 'France': '🇫🇷', 'Italy': '🇮🇹', 'Japan': '🇯🇵',
  'Egypt': '🇪🇬', 'Peru': '🇵🇪', 'Australia': '🇦🇺', 'USA': '🇺🇸',
  'UK': '🇬🇧', 'China': '🇨🇳', 'Spain': '🇪🇸', 'Greece': '🇬🇷',
  'Thailand': '🇹🇭', 'India': '🇮🇳', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽',
  'UAE': '🇦🇪', 'Germany': '🇩🇪', 'Canada': '🇨🇦', 'South Africa': '🇿🇦',
};

// Country images
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

// Continent icons
const CONTINENT_ICONS: Record<string, string> = {
  'Africa': '🌍',
  'Asia': '🌏',
  'Europe': '🇪🇺',
  'North America': '🌎',
  'South America': '🌎',
  'Oceania': '🌏',
};

export default function ExploreScreen() {
  const { user } = useAuth();
  const [sections, setSections] = useState<ContinentSection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSections, setFilteredSections] = useState<ContinentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = sections.map(section => ({
        ...section,
        data: section.data.filter(country =>
          country.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.data.length > 0);
      setFilteredSections(filtered);
    } else {
      setFilteredSections(sections);
    }
  }, [searchQuery, sections]);

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
        
        // Group countries by continent
        const continentMap = new Map<string, Country[]>();
        data.forEach((country: Country) => {
          if (!continentMap.has(country.continent)) {
            continentMap.set(country.continent, []);
          }
          continentMap.get(country.continent)!.push(country);
        });

        // Create sections
        const sectionList: ContinentSection[] = Array.from(continentMap.entries()).map(([continent, countries]) => ({
          continent,
          data: countries
        }));

        setSections(sectionList);
        setFilteredSections(sectionList);
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

  const renderCountryCard = ({ item, index, section }: { item: Country; index: number; section: ContinentSection }) => {
    const accentColor = (theme.colors.countryAccents as any)[item.name.toLowerCase().replace(' ', '_')] || theme.colors.primary;
    const columnIndex = index % COLUMNS;
    const isFirstColumn = columnIndex === 0;
    const isLastColumn = columnIndex === COLUMNS - 1;
    
    return (
      <View style={[
        styles.cardContainer,
        { width: CARD_WIDTH },
        isFirstColumn && styles.firstColumnCard,
        isLastColumn && styles.lastColumnCard
      ]}>
        <TouchableOpacity
          onPress={() => router.push(`/landmarks/${item.country_id}?name=${encodeURIComponent(item.name)}`)}
          activeOpacity={0.9}
        >
          <View style={styles.countryCard}>
            <Image
              source={{ uri: COUNTRY_IMAGES[item.name] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600' }}
              style={styles.countryImage}
              resizeMode="cover"
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
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: ContinentSection }) => {
    const totalLandmarks = section.data.reduce((sum, country) => sum + country.landmark_count, 0);
    
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
                    {section.data.length} countries • {totalLandmarks} landmarks
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

  const renderListHeader = () => (
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

      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Discover the World</Text>
        <Text style={styles.welcomeSubtext}>
          Explore {sections.reduce((sum, s) => sum + s.data.reduce((total, c) => total + c.landmark_count, 0), 0)} landmarks across {sections.reduce((sum, s) => sum + s.data.length, 0)} countries
        </Text>
      </View>
    </>
  );

  const renderListFooter = () => (
    <View style={styles.featuresSection}>
      <Text style={styles.featuresSectionTitle}>Features</Text>
      
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

      <SectionList
        sections={filteredSections}
        renderItem={renderCountryCard}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.country_id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        numColumns={2}
        stickySectionHeadersEnabled={false}
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
    paddingBottom: theme.spacing.xl,
  },
  welcomeSection: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  welcomeText: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
    fontSize: 28,
    fontWeight: '800',
  },
  welcomeSubtext: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
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
  cardContainer: {
    width: '50%',
    paddingBottom: theme.spacing.md,
  },
  firstColumnCard: {
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.xs / 2,
  },
  lastColumnCard: {
    paddingRight: theme.spacing.md,
    paddingLeft: theme.spacing.xs / 2,
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
    marginTop: theme.spacing.xl,
  },
  featuresSectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
