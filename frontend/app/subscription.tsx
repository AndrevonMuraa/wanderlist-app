import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { usePurchases } from '../contexts/PurchaseContext';
import { Package } from '../utils/purchases';

import { HeaderBranding } from '../components/BrandedGlobeIcon';
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface SubscriptionStatus {
  subscription_tier: string;
  is_pro: boolean;
  expires_at: string | null;
  limits: {
    max_friends: number;
    photos_per_visit: number;
    can_access_premium_landmarks: boolean;
    can_create_custom_visits: boolean;
  };
  usage: {
    friends_count: number;
    friends_limit: number;
    friends_remaining: number;
  };
  pricing: {
    monthly: { price: number; currency: string };
    yearly: { price: number; currency: string; savings: string };
  };
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  
  // Use purchase context
  const { offerings, isPro, isMockMode, purchase, restore, refresh } = usePurchases();

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  const handleBack = () => {
    router.push('/(tabs)/profile');
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      // Get the selected package from offerings
      const pkg = selectedPlan === 'yearly' ? offerings?.annual : offerings?.monthly;
      
      if (!pkg) {
        Alert.alert('Error', 'Unable to load subscription packages. Please try again.');
        setUpgrading(false);
        return;
      }
      
      const success = await purchase(pkg);
      
      if (success) {
        // Sync with backend
        const token = await getToken();
        await fetch(`${BACKEND_URL}/api/subscription/upgrade?plan=${selectedPlan}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        Alert.alert(
          '🎉 Welcome to WanderMark Pro!',
          'Your subscription has been activated. Enjoy all premium features!',
          [{ text: 'Awesome!', onPress: () => {
            fetchSubscriptionStatus();
            refresh();
          }}]
        );
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      Alert.alert('Error', 'Failed to process purchase. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleRestore = async () => {
    setUpgrading(true);
    try {
      const success = await restore();
      
      if (success) {
        // Sync with backend
        const token = await getToken();
        await fetch(`${BACKEND_URL}/api/subscription/upgrade?plan=yearly`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        Alert.alert(
          '✅ Purchase Restored',
          'Your WanderMark Pro subscription has been restored!',
          [{ text: 'Great!', onPress: () => {
            fetchSubscriptionStatus();
            refresh();
          }}]
        );
      } else {
        Alert.alert(
          'No Purchase Found',
          'We could not find a previous subscription. If you believe this is an error, please contact support.'
        );
      }
    } catch (error) {
      console.error('Error restoring:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const FeatureRow = ({ icon, text, included, highlight }: { icon: string; text: string; included: boolean; highlight?: boolean }) => (
    <View style={[styles.featureRow, highlight && styles.featureRowHighlight]}>
      <Ionicons 
        name={included ? 'checkmark-circle' : 'close-circle'} 
        size={22} 
        color={included ? '#4CAF50' : '#E0E0E0'} 
      />
      <Text style={[styles.featureText, !included && styles.featureTextDisabled]}>{text}</Text>
      {highlight && (
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gradients.oceanToSand}
          start={gradients.horizontal.start}
          end={gradients.horizontal.end}
          style={[styles.header, { paddingTop: topPadding }]}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>WanderMark Pro</Text>
            <View style={styles.brandingContainer}>
            <HeaderBranding size={18} textColor="#2A2A2A" />
          </View>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  // Use isPro from context (line 57), check status for backend sync
  const isProFromBackend = status?.is_pro;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>WanderMark Pro</Text>
          <View style={styles.brandingContainer}>
            <HeaderBranding size={18} textColor="#2A2A2A" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#4DB8D8', '#1E8A8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <Ionicons name="diamond" size={48} color="#fff" />
            <Text style={styles.heroTitle}>WanderMark Pro</Text>
            <Text style={styles.heroSubtitle}>
              Unlock the full travel experience
            </Text>
            {isPro && (
              <View style={styles.activeTag}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.activeTagText}>Active</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Current Status */}
        {isPro && status?.expires_at && (
          <Surface style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.statusLabel}>Your Plan</Text>
                <Text style={styles.statusValue}>WanderMark Pro</Text>
              </View>
              <View>
                <Text style={styles.statusLabel}>Valid Until</Text>
                <Text style={styles.statusValue}>
                  {new Date(status.expires_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Features Comparison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's Included</Text>
          
          <Surface style={styles.featuresCard}>
            <Text style={styles.tierLabel}>Free</Text>
            <FeatureRow icon="flag" text="428 Official Landmarks" included />
            <FeatureRow icon="camera" text="1 Photo per Visit" included />
            <FeatureRow icon="people" text="5 Friends Maximum" included />
            <FeatureRow icon="trophy" text="Global Leaderboard" included />
            <FeatureRow icon="ribbon" text="Basic Badges (up to 100 visits)" included />
            <View style={styles.divider} />
            <Text style={[styles.tierLabel, styles.tierLabelPro]}>+ Pro Features</Text>
            <FeatureRow icon="star" text="92 Premium Landmarks" included={isPro || false} highlight />
            <FeatureRow icon="images" text="10 Photos per Visit" included={isPro || false} highlight />
            <FeatureRow icon="people" text="Unlimited Friends" included={isPro || false} highlight />
            <FeatureRow icon="airplane" text="Custom Visits Feature" included={isPro || false} highlight />
            <FeatureRow icon="medal" text="All Badges Achievable" included={isPro || false} highlight />
          </Surface>
        </View>

        {/* Pricing Cards */}
        {!isPro && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            
            <View style={styles.pricingContainer}>
              {/* Monthly Plan */}
              <TouchableOpacity
                style={[
                  styles.pricingCard,
                  selectedPlan === 'monthly' && styles.pricingCardSelected,
                ]}
                onPress={() => setSelectedPlan('monthly')}
                activeOpacity={0.8}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>Monthly</Text>
                </View>
                <Text style={styles.planPrice}>$3.99</Text>
                <Text style={styles.planPeriod}>per month</Text>
                {selectedPlan === 'monthly' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Yearly Plan */}
              <TouchableOpacity
                style={[
                  styles.pricingCard,
                  styles.pricingCardBest,
                  selectedPlan === 'yearly' && styles.pricingCardSelected,
                ]}
                onPress={() => setSelectedPlan('yearly')}
                activeOpacity={0.8}
              >
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </View>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>Yearly</Text>
                </View>
                <Text style={styles.planPrice}>$29.99</Text>
                <Text style={styles.planPeriod}>per year</Text>
                <Text style={styles.savingsText}>Save 37%</Text>
                {selectedPlan === 'yearly' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Upgrade Button */}
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgrade}
              disabled={upgrading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#4DB8D8', '#1E8A8A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeGradient}
              >
                {upgrading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="diamond" size={20} color="#fff" />
                    <Text style={styles.upgradeText}>
                      Upgrade to Pro - ${selectedPlan === 'yearly' ? '29.99/yr' : '3.99/mo'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Payment will be processed securely. Cancel anytime.
            </Text>

            {/* Mock Mode Indicator */}
            {isMockMode && (
              <View style={styles.mockModeIndicator}>
                <Ionicons name="flask" size={16} color="#f59e0b" />
                <Text style={styles.mockModeText}>Test Mode - No real charges</Text>
              </View>
            )}

            {/* Restore Purchases */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={upgrading}
            >
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Premium Landmarks Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Landmarks Include</Text>
          <Surface style={styles.previewCard}>
            <View style={styles.previewGrid}>
              {[
                { name: 'Blue Lagoon', country: 'Iceland 🇮🇸' },
                { name: 'Zhangjiajie', country: 'China 🇨🇳' },
                { name: 'Antelope Canyon', country: 'USA 🇺🇸' },
                { name: 'Hallstatt', country: 'Austria 🇦🇹' },
                { name: 'Bora Bora', country: 'French Polynesia 🇵🇫' },
                { name: '+ 87 more', country: 'worldwide' },
              ].map((item, idx) => (
                <View key={idx} style={styles.previewItem}>
                  <Text style={styles.previewName}>{item.name}</Text>
                  <Text style={styles.previewCountry}>{item.country}</Text>
                </View>
              ))}
            </View>
          </Surface>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  // Hero
  heroSection: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  heroGradient: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: theme.spacing.sm,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: theme.spacing.xs,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: theme.spacing.md,
    gap: 6,
  },
  activeTagText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  // Status Card
  statusCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 2,
  },
  // Sections
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  // Features Card
  featuresCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
  },
  tierLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
  },
  tierLabelPro: {
    color: '#1E8A8A',
    marginTop: theme.spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: theme.spacing.sm,
  },
  featureRowHighlight: {
    backgroundColor: 'rgba(118, 75, 162, 0.05)',
    marginHorizontal: -theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  featureTextDisabled: {
    color: theme.colors.textLight,
  },
  proBadge: {
    backgroundColor: '#1E8A8A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  // Pricing
  pricingContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  pricingCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  pricingCardBest: {
    borderColor: '#1E8A8A',
  },
  pricingCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(38, 198, 218, 0.05)',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#1E8A8A',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  planHeader: {
    marginTop: theme.spacing.sm,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  planPeriod: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: theme.spacing.xs,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  // Upgrade Button
  upgradeButton: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: theme.spacing.sm,
  },
  upgradeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
  },
  // Preview
  previewCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewItem: {
    width: '50%',
    paddingVertical: theme.spacing.sm,
  },
  previewName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  previewCountry: {
    fontSize: 11,
    color: theme.colors.textLight,
  },
  // Mock Mode & Restore
  mockModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: '#fef3c7',
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  mockModeText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  restoreButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  restoreText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});
