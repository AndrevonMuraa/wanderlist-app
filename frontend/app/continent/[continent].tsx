import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Dimensions, Platform, StatusBar } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import { PersistentTabBar } from '../../components/PersistentTabBar';
import { FixedTopBar, SubHeader } from '../../components/StickyHeader';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Helper to get token
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

export default function ContinentScreen() {
  const params = useLocalSearchParams();
  const continentName = decodeURIComponent((params.continent || params['continent']) as string || 'Unknown');
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Calculate the height of the fixed top bar
  const fixedBarHeight = (Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 24)) + 44;

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
        // Filter by continent
        const filtered = data.filter((c: Country) => c.continent === continentName);
        setCountries(filtered);
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Top Bar - Stays in place when scrolling */}
      <FixedTopBar />

      {/* Content with proper padding for fixed bar */}
      <View style={[styles.contentContainer, { paddingTop: fixedBarHeight }]}>
        {/* Sub Header - Scrolls with content */}
        <SubHeader
          title={continentName}
          subtitle={`${countries.length} countries to explore`}
          showBack={true}
          showSearch={false}
        />

        <FlatList
          data={countries}
          renderItem={renderCountryCard}
          keyExtractor={(item) => item.country_id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.listContainer, { paddingBottom: Platform.OS === 'ios' ? 100 : 90 }]}
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
      </View>
      
      <PersistentTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  row: {
    justifyContent: 'space-between',
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
