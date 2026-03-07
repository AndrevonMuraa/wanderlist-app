import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../utils/navigation';
import theme from '../styles/theme';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  const features = [
    {
      icon: 'earth',
      title: 'Explore 1,500 Landmarks',
      description: '100 countries across 5 continents waiting for you',
      color: theme.colors.primary,
    },
    {
      icon: 'camera',
      title: 'Capture Your Journey',
      description: 'Photo proof, travel diaries, and tips for every visit',
      color: theme.colors.accent,
    },
    {
      icon: 'trophy',
      title: 'Compete & Climb',
      description: 'Earn points, climb the leaderboard, and compete with travelers worldwide',
      color: theme.colors.accentYellow,
    },
    {
      icon: 'people',
      title: 'Connect with Travelers',
      description: 'Friends, leaderboards, and shared adventures',
      color: theme.colors.primaryLight,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.hero}
        >
          <Text style={styles.heroEmoji}>🌍✈️🗺️</Text>
          <Text style={styles.heroTitle}>Welcome to WanderMark!</Text>
          <Text style={styles.heroSubtitle}>
            Your personal travel companion to explore the world's most amazing landmarks
          </Text>
        </LinearGradient>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What You Can Do</Text>
          
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                <Ionicons name={feature.icon as any} size={32} color={feature.color} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Compete Section - Points Showcase */}
        <View style={styles.competeSection}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.competeGradient}
          >
            <View style={styles.competeHeader}>
              <Ionicons name="podium" size={36} color={theme.colors.accentYellow} />
              <Text style={styles.competeTitle}>Compete with Travelers Worldwide</Text>
              <Text style={styles.competeSubtitle}>
                Every landmark you visit earns you points. Rise through the ranks and claim your spot on the global leaderboard.
              </Text>
            </View>

            <View style={styles.rankShowcase}>
              <View style={styles.rankCard}>
                <Text style={styles.rankIcon}>🥉</Text>
                <Text style={styles.rankName}>Explorer</Text>
                <Text style={styles.rankPoints}>0 - 499 pts</Text>
              </View>
              <View style={[styles.rankCard, styles.rankCardHighlight]}>
                <Text style={styles.rankIcon}>🥈</Text>
                <Text style={styles.rankName}>Adventurer</Text>
                <Text style={styles.rankPoints}>500 - 1,499 pts</Text>
              </View>
              <View style={styles.rankCard}>
                <Text style={styles.rankIcon}>🥇</Text>
                <Text style={styles.rankName}>Legend</Text>
                <Text style={styles.rankPoints}>5,000+ pts</Text>
              </View>
            </View>

            <View style={styles.pointsExamples}>
              <View style={styles.pointRow}>
                <Ionicons name="location" size={16} color={theme.colors.primaryLight} />
                <Text style={styles.pointText}>Visit a landmark</Text>
                <Text style={styles.pointValue}>+10 pts</Text>
              </View>
              <View style={styles.pointRow}>
                <Ionicons name="diamond" size={16} color={theme.colors.accent} />
                <Text style={styles.pointText}>Premium landmark</Text>
                <Text style={styles.pointValue}>+25 pts</Text>
              </View>
              <View style={styles.pointRow}>
                <Ionicons name="earth" size={16} color="#10b981" />
                <Text style={styles.pointText}>Country visit</Text>
                <Text style={styles.pointValue}>+50 pts</Text>
              </View>
              <View style={styles.pointRow}>
                <Ionicons name="flag" size={16} color="#ef4444" />
                <Text style={styles.pointText}>New country bonus</Text>
                <Text style={styles.pointValue}>+20 pts</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Start */}
        <View style={styles.quickStart}>
          <Text style={styles.sectionTitle}>Quick Start Guide</Text>
          
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Explore Continents</Text>
              <Text style={styles.stepText}>
                Browse 5 continents and discover amazing countries
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Mark as Visited</Text>
              <Text style={styles.stepText}>
                Add photos, write diaries, and earn points for each landmark
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Compete & Rise</Text>
              <Text style={styles.stepText}>
                Earn points for every visit, climb the ranks, and compete on the global leaderboard
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacySection}>
          <View style={styles.privacyCard}>
            <View style={styles.privacyHeader}>
              <View style={styles.privacyIconCircle}>
                <Ionicons name="shield-checkmark" size={24} color="#27ae60" />
              </View>
              <Text style={styles.privacyTitle}>Your Privacy</Text>
            </View>
            <Text style={styles.privacyText}>
              Your profile starts as <Text style={styles.privacyBold}>Public</Text> — your visits and photos are visible to the WanderMark community. You can change this anytime.
            </Text>
            <View style={styles.privacyOptions}>
              <View style={styles.privacyOption}>
                <Ionicons name="globe-outline" size={18} color="#27ae60" />
                <Text style={styles.privacyOptionLabel}>Public</Text>
                <View style={styles.privacyDefault}><Text style={styles.privacyDefaultText}>Default</Text></View>
              </View>
              <View style={styles.privacyOption}>
                <Ionicons name="people-outline" size={18} color="#3498db" />
                <Text style={styles.privacyOptionLabel}>Friends Only</Text>
              </View>
              <View style={styles.privacyOption}>
                <Ionicons name="lock-closed-outline" size={18} color="#e74c3c" />
                <Text style={styles.privacyOptionLabel}>Private</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.privacySettingsBtn} onPress={() => router.push('/settings')}>
              <Text style={styles.privacySettingsBtnText}>Change in Settings</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaButtonText}>Start Exploring</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => safeGoBack(router)}
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>Skip Tutorial</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    padding: theme.spacing.xl,
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing.lg,
  },
  featuresSection: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  // Compete Section
  competeSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  competeGradient: {
    padding: theme.spacing.xl,
  },
  competeHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  competeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  competeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  rankShowcase: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  rankCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rankCardHighlight: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderColor: 'rgba(255,215,0,0.3)',
    transform: [{ scale: 1.05 }],
  },
  rankIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  rankName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  rankPoints: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  pointsExamples: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: theme.spacing.md,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 10,
  },
  pointValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accentYellow,
  },
  quickStart: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  stepCard: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  ctaSection: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl * 2,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.lg,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  skipButton: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  skipButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
  privacySection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  privacyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.15)',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  privacyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  privacyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  privacyBold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  privacyOptions: {
    gap: 8,
    marginBottom: 14,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  privacyOptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
  },
  privacyDefault: {
    backgroundColor: 'rgba(39, 174, 96, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  privacyDefaultText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#27ae60',
  },
  privacySettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  privacySettingsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
