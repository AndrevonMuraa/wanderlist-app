import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  StatusBar,
  Linking,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import theme, { gradients } from '../styles/theme';
import { HeaderBranding } from '../components/BrandedGlobeIcon';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleFAQ = (faq: string) => {
    setExpandedFAQ(expandedFAQ === faq ? null : faq);
  };

  const FAQItem = ({ id, question, answer }: { id: string; question: string; answer: string }) => (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => toggleFAQ(id)}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons
          name={expandedFAQ === id ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.textLight}
        />
      </View>
      {expandedFAQ === id && (
        <Text style={styles.faqAnswer}>{answer}</Text>
      )}
    </TouchableOpacity>
  );

  const FeatureCard = ({
    icon,
    title,
    description,
    color,
    onPress,
  }: {
    icon: string;
    title: string;
    description: string;
    color: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.featureCard}>
      <Surface style={styles.featureCardSurface}>
        <View style={[styles.featureIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon as any} size={28} color={color} />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
      </Surface>
    </TouchableOpacity>
  );

  const HowItWorksStep = ({
    number,
    icon,
    title,
    description,
  }: {
    number: number;
    icon: string;
    title: string;
    description: string;
  }) => (
    <View style={styles.stepContainer}>
      <View style={styles.stepNumber}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          style={styles.stepNumberGradient}
        >
          <Text style={styles.stepNumberText}>{number}</Text>
        </LinearGradient>
      </View>
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <Ionicons name={icon as any} size={22} color={theme.colors.primary} />
          <Text style={styles.stepTitle}>{title}</Text>
        </View>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Universal Header - Ocean to Sand gradient */}
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About & Help</Text>
          <View style={styles.brandingContainer}>
            <HeaderBranding size={18} textColor="#2A2A2A" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['rgba(32, 178, 170, 0.1)', 'transparent']}
            style={styles.heroGradient}
          >
            <View style={styles.heroIcon}>
              <HeaderBranding size={56} showText={false} />
            </View>
            <Text style={styles.heroTitle}>Explore the World,{'\n'}One Landmark at a Time</Text>
            <Text style={styles.heroSubtitle}>
              Your personal travel companion for discovering and conquering the world's most amazing landmarks
            </Text>
            <Text style={styles.versionText}>Version {Constants.expoConfig?.version || '1.2.0'}</Text>
          </LinearGradient>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Surface style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>1,500</Text>
                <Text style={styles.statLabel}>Landmarks</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>100</Text>
                <Text style={styles.statLabel}>Destinations</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>5</Text>
                <Text style={styles.statLabel}>Continents</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>30,000+</Text>
                <Text style={styles.statLabel}>Total Points</Text>
              </View>
            </View>
          </Surface>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={24} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>How It Works</Text>
          </View>
          <Surface style={styles.card}>
            <HowItWorksStep
              number={1}
              icon="compass"
              title="Explore Landmarks"
              description="Browse 1,500 landmarks across 100 destinations and 5 continents."
            />
            <HowItWorksStep
              number={2}
              icon="location"
              title="Visit & Check In"
              description="Mark landmarks as visited. Add photos and travel diaries."
            />
            <HowItWorksStep
              number={3}
              icon="star"
              title="Earn Points & Rank Up"
              description="Collect points for visits. Take personal photos at landmarks for verified leaderboard points!"
            />
            <HowItWorksStep
              number={4}
              icon="people"
              title="Connect & Compete"
              description="Add friends, share your journey, and climb the leaderboard."
            />
          </Surface>
        </View>

        {/* Key Features */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={24} color="#FFD700" />
            <Text style={styles.sectionTitle}>Key Features</Text>
          </View>

          <FeatureCard
            icon="earth"
            title="Explore Continents"
            description="Discover destinations across 5 continents"
            color="#3BB8C3"
            onPress={() => router.push('/continents')}
          />

          <FeatureCard
            icon="location"
            title="Landmark Visits"
            description="Visit 1,500 landmarks and earn points"
            color={theme.colors.accent}
            onPress={() => router.push('/my-landmark-visits')}
          />

          <FeatureCard
            icon="flag"
            title="Destination Visits"
            description="Record entire country experiences with photos & diaries"
            color={theme.colors.primary}
            onPress={() => router.push('/my-country-visits')}
          />

          <FeatureCard
            icon="airplane"
            title="Custom Visits"
            description="Record trips to places not in our database"
            color="#1E8A8A"
            onPress={() => router.push({ pathname: '/(tabs)/journey', params: { scrollTo: 'custom-visits' } })}
          />

          <FeatureCard
            icon="trophy"
            title="Rank System"
            description="Progress through 20 ranks as you earn points"
            color="#FFD700"
            onPress={() => router.push('/ranks')}
          />

          <FeatureCard
            icon="podium"
            title="Leaderboard"
            description="Compete with friends and travelers worldwide"
            color="#00BCD4"
            onPress={() => router.push('/leaderboard')}
          />
        </View>

        {/* Core Mechanics - Expandable */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings" size={24} color={theme.colors.textLight} />
            <Text style={styles.sectionTitle}>Game Mechanics</Text>
          </View>
          
          <TouchableOpacity
            style={styles.expandableCard}
            onPress={() => toggleSection('points')}
            activeOpacity={0.8}
          >
            <Surface style={styles.card}>
              <View style={styles.expandableHeader}>
                <View style={styles.expandableHeaderLeft}>
                  <Ionicons name="star" size={22} color="#FFD700" />
                  <Text style={styles.expandableTitle}>Dual Points System</Text>
                </View>
                <Ionicons
                  name={expandedSection === 'points' ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={theme.colors.textLight}
                />
              </View>
              {expandedSection === 'points' && (
                <View style={styles.expandableContent}>
                  <Text style={styles.expandableText}>
                    <Text style={styles.bold}>Verified Points</Text> (with personal photos):{'\n'}
                    • Official Landmarks: 10 pts{'\n'}
                    • Premium Landmarks: 25 pts{'\n'}
                    • Destination Visit: 50 pts (auto or manual){'\n'}
                    • New Continent Bonus: +50 pts{'\n'}
                    • Country Completion: +50 pts{'\n'}
                    • Continent Completion: +200 pts{'\n\n'}
                    <Text style={styles.bold}>Unverified Points</Text> (without photos):{'\n'}
                    • Same values, but without personal photo verification{'\n'}
                    • Count for total points and friends leaderboard{'\n'}
                    • Do not count for global leaderboard or rank{'\n\n'}
                    Photos must show you personally at the landmark to earn verified points. Non-compliant uploads may have their verified status revoked.
                  </Text>
                </View>
              )}
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.expandableCard}
            onPress={() => router.push('/ranks')}
            activeOpacity={0.8}
          >
            <Surface style={styles.card}>
              <View style={styles.expandableHeader}>
                <View style={styles.expandableHeaderLeft}>
                  <Ionicons name="trophy" size={22} color="#FFD700" />
                  <Text style={styles.expandableTitle}>Rank System</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={theme.colors.textLight}
                />
              </View>
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.expandableCard}
            onPress={() => toggleSection('privacy')}
            activeOpacity={0.8}
          >
            <Surface style={styles.card}>
              <View style={styles.expandableHeader}>
                <View style={styles.expandableHeaderLeft}>
                  <Ionicons name="shield-checkmark" size={22} color="#4CAF50" />
                  <Text style={styles.expandableTitle}>Privacy Controls</Text>
                </View>
                <Ionicons
                  name={expandedSection === 'privacy' ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={theme.colors.textLight}
                />
              </View>
              {expandedSection === 'privacy' && (
                <View style={styles.expandableContent}>
                  <Text style={styles.expandableText}>
                    <Text style={styles.bold}>Visit Visibility:</Text>{'\n'}
                    Set a default privacy level in Settings that applies to all new visits, or override it per visit:{'\n\n'}
                    • Public — Everyone can see{'\n'}
                    • Friends — Only your friends{'\n'}
                    • Private — Only you{'\n\n'}
                    <Text style={styles.bold}>Diary Sharing:</Text>{'\n'}
                    Share or hide your travel diary independently — make a visit public while keeping diary notes private.{'\n\n'}
                    <Text style={styles.bold}>Comment Permissions:</Text>{'\n'}
                    Control who can comment on your visits: everyone, friends only, or nobody.{'\n\n'}
                    <Text style={styles.bold}>Content Reporting:</Text>{'\n'}
                    Report inappropriate content for moderation. All reports are anonymous.
                  </Text>
                </View>
              )}
            </Surface>
          </TouchableOpacity>
        </View>

        {/* Help & Support Section - FAQ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>

          <Surface style={styles.card}>
            <FAQItem
              id="points"
              question="How do I earn points?"
              answer={`You earn points for visiting landmarks and exploring destinations:

• Official Landmarks: 10 points
• Premium Landmarks: 25 points
• Destination Visit: 50 points (auto or manual)
• New Continent Bonus: +50 points (first country on a new continent)
• Country Completion: +50 bonus points (all landmarks in a country)
• Continent Completion: +200 bonus points (all countries on a continent)

There are two types of points:
• Verified Points: Earned when you upload a personal photo of yourself at the landmark. These count for the global leaderboard and your rank.
• Unverified Points: Earned for visits without personal photos. These count toward your total points but not the leaderboard or rank.

Photos must show you personally at the landmark. Uploads that don't meet this requirement may have their verified status revoked by moderators.`}
            />
            
            <FAQItem
              id="custom"
              question="What are Custom Visits?"
              answer={`Use 'Custom Visits' to record trips to places not in our database! You can:

• Add any country name
• Add up to 10 landmarks with individual photos
• Add up to 10 general country photos
• Write diary notes
• Share publicly in the community feed (Pro feature)

Find it on the Journey page under 'Custom Visits' or on the Explore page at the bottom.`}
            />
            
            <FAQItem
              id="privacy"
              question="Can I control who sees my visits?"
              answer={`Yes! WanderMark gives you full control over your privacy:

Visibility levels for each visit:
• Public — Everyone can see
• Friends — Only your friends
• Private — Only you

You can set a default privacy level in Settings > Privacy that applies to all new visits. You can also override this on a per-visit basis when creating or editing a visit.

Additional privacy controls:
• Diary sharing — Share or hide your travel diary independently of visit visibility
• Comment permissions — Choose who can comment on your visits: everyone, friends only, or nobody
• Content reporting — Report inappropriate content for moderation

All privacy settings can be changed at any time from Settings > Privacy.`}
            />
            
            <FAQItem
              id="photos"
              question="Where are all my photos?"
              answer={`Visit the 'My Photos' section on your Journey page! It shows all photos from:

• Landmark visits
• Country visits
• Custom visits

You can filter by country, year, or type.`}
            />
            
            <FAQItem
              id="ranks"
              question="How does the rank system work?"
              answer={`Progress through 20 ranks as you earn points:

• Newcomer (0 pts) - Taking your first steps
• Wanderer (150 pts) - The world is calling
• Scout (400 pts) - Eyes on the horizon
• Explorer (800 pts) - Charting new territory
• Pathfinder (1,500 pts) - Finding hidden trails
• Adventurer (2,500 pts) - No border can stop you
• Voyager (4,000 pts) - Sailing uncharted waters
• Trailblazer (6,000 pts) - Blazing your own path
• Navigator (8,000 pts) - Guided by the stars
• Pioneer (10,000 pts) - Breaking new ground
• Globetrotter (12,000 pts) - The world knows your name
• Nomad King (14,000 pts) - Ruler of the open road
• Horizon Chaser (16,000 pts) - Always chasing the next sunrise
• Legend (18,000 pts) - A true travel legend
• Atlas (20,000 pts) - Carrying the world
• Titan (22,000 pts) - Forged in distant lands
• Sovereign (24,000 pts) - Master of every continent
• Mythic (26,000 pts) - Stories told around campfires
• Eternal (28,000 pts) - Your legacy echoes forever
• Transcendent (30,000 pts) - Beyond mortal. Beyond legendary.`}
            />
            
            <FAQItem
              id="delete"
              question="How do I delete my account?"
              answer="Go to Settings and tap 'Delete Account' at the bottom. Your account will be deactivated for 30 days before permanent deletion. If you change your mind, simply log in again within 30 days to reactivate your account and recover all your data."
            />
          </Surface>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Surface style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>{Constants.expoConfig?.version || '1.2.0'}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>March 2026</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Database</Text>
              <Text style={styles.infoValue}>1,500 landmarks, 100 destinations</Text>
            </View>
          </Surface>
        </View>

        {/* Contact Support - placed at the bottom, discreet */}
        <View style={[styles.section, { opacity: 0.7 }]}>
          <Surface style={styles.card}>
            <Text style={[styles.cardTitle, { fontSize: 14 }]}>Need Help?</Text>
            <Text style={styles.contactSubtitle}>Reach out to us at support@wandermark.app</Text>
          </Surface>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="compass" size={22} color="#fff" />
              <Text style={styles.ctaText}>Start Exploring</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  // Hero
  heroSection: {
    marginBottom: theme.spacing.md,
  },
  heroGradient: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(32, 178, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(32, 178, 170, 0.2)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: theme.spacing.md,
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
  },
  // Stats
  statsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },
  // Sections
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  cardSubtitle: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.md,
  },
  // FAQ
  faqItem: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  faqAnswer: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    paddingLeft: theme.spacing.xs,
  },
  // Contact
  contactSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  // Steps
  stepContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  stepNumber: {
    marginRight: theme.spacing.md,
  },
  stepNumberGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  stepDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  // Feature Cards
  featureCard: {
    marginBottom: theme.spacing.sm,
  },
  featureCardSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  featureDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  // Expandable
  expandableCard: {
    marginBottom: theme.spacing.sm,
  },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  expandableTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  expandableContent: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  expandableText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  // Info Card
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  infoLabel: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  // CTA
  ctaSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  ctaButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
