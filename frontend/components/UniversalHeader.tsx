import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import theme from '../styles/theme';

interface UniversalHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showBranding?: boolean;
  onBackPress?: () => void;
}

export const UniversalHeader: React.FC<UniversalHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showSearch = true,
  showBranding = true,
  onBackPress,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/continents');
    }
  };

  const handleBrandPress = () => {
    router.push('/about');
  };

  const handleProfilePress = () => {
    router.push('/(tabs)/profile');
  };

  const handleSearchPress = () => {
    router.push('/search');
  };

  return (
    <LinearGradient
      colors={['#3BB8C3', '#2AA8B3']}  // Lighter turquoise blue
      style={styles.headerGradient}
    >
      {/* Top Row: Branding + Profile */}
      {showBranding && (
        <View style={styles.brandingRow}>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={handleBrandPress}
            activeOpacity={0.7}
          >
            <Ionicons name="earth" size={18} color="#fff" />
            <Text style={styles.brandingText}>WanderList</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={handleProfilePress}
          >
            <View style={styles.profileCircle}>
              <Text style={styles.profileInitial}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Row */}
      <View style={styles.mainRow}>
        {showBack && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        
        <View style={[styles.titleContainer, !showBack && styles.titleContainerNoBack]}>
          {title && (
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {showSearch && (
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={handleSearchPress}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerGradient: {
    paddingHorizontal: theme.spacing.md,
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
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  titleContainerNoBack: {
    marginLeft: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
});

export default UniversalHeader;
