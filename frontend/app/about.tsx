import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';

const { width } = Dimensions.get('window');

export default function AboutScreen() {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

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
          <Ionicons name={icon as any} size={32} color={color} />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription}>{description}</Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={28} color={color} />
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
          <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
          <Text style={styles.stepTitle}>{title}</Text>
        </View>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  );

  const TierCard = ({
    name,
    price,
    features,
    isPopular,
    color,
  }: {
    name: string;
    price: string;
    features: string[];
    isPopular?: boolean;
    color: string;
  }) => (
    <Surface style={[styles.tierCard, isPopular && styles.tierCardPopular]}>
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}
      <Text style={[styles.tierName, { color }]}>{name}</Text>
      <Text style={styles.tierPrice}>{price}</Text>
      <View style={styles.tierFeatures}>
        {features.map((feature, index) => (
          <View key={index} style={styles.tierFeature}>
            <Ionicons name="checkmark-circle" size={16} color={color} />
            <Text style={styles.tierFeatureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About WanderList</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['rgba(32, 178, 170, 0.1)', 'transparent']}
            style={styles.heroGradient}
          >
            <View style={styles.heroIcon}>
              <Ionicons name="earth" size={64} color={theme.colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Explore the World,{'\n'}One Landmark at a Time</Text>
            <Text style={styles.heroSubtitle}>
              Your personal travel companion for discovering and conquering the world's most amazing landmarks
            </Text>
          </LinearGradient>
        </View>

        {/* What is WanderList? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is WanderList?</Text>
          <Surface style={styles.card}>
            <Text style={styles.cardText}>
              WanderList is a <Text style={styles.highlight}>gamified travel exploration app</Text> that transforms your journey into an exciting adventure. Discover 480 landmarks across 48 countries, track your progress, compete with friends, and unlock achievements as you explore the world.
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>480</Text>
                <Text style={styles.statLabel}>Total Landmarks</Text>
                <View style={styles.statBreakdown}>
                  <Text style={styles.statBreakdownText}>380 Official</Text>
                  <View style={styles.statBreakdownDot} />
                  <Text style={[styles.statBreakdownText, styles.premiumText]}>100 Premium</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>48</Text>
                <Text style={styles.statLabel}>Countries</Text>
                <View style={styles.statBreakdown}>
                  <Text style={styles.statBreakdownText}>Across 5 continents</Text>
                </View>
              </View>
            </View>
          </Surface>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Surface style={styles.card}>
            <HowItWorksStep
              number={1}
              icon="compass"
              title="Explore Landmarks"
              description="Browse through 480 carefully curated landmarks across the globe. From the Eiffel Tower to Machu Picchu, discover the world's wonders."
            />
            <HowItWorksStep
              number={2}
              icon="location"
              title="Visit & Check In"
              description="Mark landmarks as visited. Add photos, write travel diaries, and share tips with the community."
            />
            <HowItWorksStep
              number={3}
              icon="star"
              title="Earn Points & Badges"
              description="Collect points for each visit. Unlock badges and achievements as you reach milestones and complete countries."
            />
            <HowItWorksStep
              number={4}
              icon="people"
              title="Connect & Compete"
              description="Add friends, share your journey on the activity feed, and climb the leaderboard to become a legendary explorer."
            />
          </Surface>
        </View>

        {/* Interactive Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore Features</Text>
          <Text style={styles.sectionSubtitle}>Tap any card to try it out!</Text>

          <FeatureCard
            icon="map"
            title="Discover Landmarks"
            description="Explore 480 landmarks organized by continent and country"
            color={theme.colors.primary}
            onPress={() => router.push('/continents')}
          />

          <FeatureCard
            icon="analytics"
            title="Track Your Progress"
            description="Visual progress tracking with completion percentages and stats"
            color="#FFA726"
            onPress={() => router.push('/(tabs)/journey')}
          />

          <FeatureCard
            icon="people-circle"
            title="Social Hub"
            description="Connect with friends, share visits, and see their adventures"
            color="#9C27B0"
            onPress={() => router.push('/(tabs)/social')}
          />

          <FeatureCard
            icon="trophy"
            title="Badges & Achievements"
            description="Unlock 16 different badges by reaching milestones"
            color="#FF6B6B"
            onPress={() => router.push('/(tabs)/profile')}
          />

          <FeatureCard
            icon="search"
            title="Advanced Search"
            description="Filter landmarks by continent, category, visited status, and more"
            color="#00BCD4"
            onPress={() => router.push('/search')}
          />

          <FeatureCard
            icon="diamond"
            title="Premium Landmarks"
            description="Access 100+ exclusive premium landmarks around the world"
            color="#FFD700"
            onPress={() => router.push('/continents')}
          />
        </View>

        {/* Core Mechanics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core Mechanics</Text>
          
          <TouchableOpacity
            style={styles.expandableCard}
            onPress={() => toggleSection('points')}
            activeOpacity={0.8}
          >
            <Surface style={styles.card}>
              <View style={styles.expandableHeader}>
                <View style={styles.expandableHeaderLeft}>
                  <Ionicons name="star" size={24} color="#FFD700" />
                  <Text style={styles.expandableTitle}>Points System</Text>
                </View>
                <Ionicons
                  name={expandedSection === 'points' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.textLight}
                />
              </View>
              {expandedSection === 'points' && (
                <View style={styles.expandableContent}>
                  <Text style={styles.expandableText}>
                    <Text style={styles.bold}>Landmark Visits:</Text>{'\n'}
                    • Official Landmarks: 10 points per visit{'\n'}
                    • Premium Landmarks: 25 points per visit{'\n\n'}
                    <Text style={styles.bold}>Completion Bonuses:</Text>{'\n'}
                    • Country Completion: 50 bonus points{'\n'}
                    • Continent Completion: 200 bonus points{'\n\n'}
                    • <Text style={styles.bold}>Leaderboard:</Text> Compete globally or with friends{'\n'}
                    • <Text style={styles.bold}>Rankings:</Text> Climb the ranks to become a legend
                  </Text>

                  {/* Points Milestones Progress */}
                  <View style={styles.pointsMilestonesSection}>
                    <Text style={styles.pointsMilestonesTitle}>Points Milestones</Text>
                    
                    <View style={styles.milestoneRow}>
                      <View style={styles.milestoneInfo}>
                        <Ionicons name="trophy" size={16} color="#CD7F32" />
                        <Text style={styles.milestoneText}>100 pts</Text>
                      </View>
                      <View style={styles.milestoneProgressBar}>
                        <View style={[styles.milestoneProgressFill, { width: '20%', backgroundColor: '#CD7F32' }]} />
                      </View>
                      <Text style={styles.milestoneLabel}>Point Starter</Text>
                    </View>

                    <View style={styles.milestoneRow}>
                      <View style={styles.milestoneInfo}>
                        <Ionicons name="trophy" size={16} color="#C0C0C0" />
                        <Text style={styles.milestoneText}>500 pts</Text>
                      </View>
                      <View style={styles.milestoneProgressBar}>
                        <View style={[styles.milestoneProgressFill, { width: '40%', backgroundColor: '#C0C0C0' }]} />
                      </View>
                      <Text style={styles.milestoneLabel}>Point Collector</Text>
                    </View>

                    <View style={styles.milestoneRow}>
                      <View style={styles.milestoneInfo}>
                        <Ionicons name="trophy" size={16} color="#FFD700" />
                        <Text style={styles.milestoneText}>1,000 pts</Text>
                      </View>
                      <View style={styles.milestoneProgressBar}>
                        <View style={[styles.milestoneProgressFill, { width: '60%', backgroundColor: '#FFD700' }]} />
                      </View>
                      <Text style={styles.milestoneLabel}>Point Master</Text>
                    </View>

                    <View style={styles.milestoneRow}>
                      <View style={styles.milestoneInfo}>
                        <Ionicons name="trophy" size={16} color={theme.colors.primary} />
                        <Text style={styles.milestoneText}>5,000 pts</Text>
                      </View>
                      <View style={styles.milestoneProgressBar}>
                        <View style={[styles.milestoneProgressFill, { width: '100%', backgroundColor: theme.colors.primary }]} />
                      </View>
                      <Text style={styles.milestoneLabel}>Point Legend</Text>
                    </View>

                    <Text style={styles.pointsExplanation}>
                      💡 Earn badges automatically when you reach these milestones!
                    </Text>
                  </View>
                </View>
              )}
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.expandableCard}
            onPress={() => toggleSection('badges')}
            activeOpacity={0.8}
          >
            <Surface style={styles.card}>
              <View style={styles.expandableHeader}>
                <View style={styles.expandableHeaderLeft}>
                  <Ionicons name="ribbon" size={24} color="#FF6B6B" />
                  <Text style={styles.expandableTitle}>Badge System</Text>
                </View>
                <Ionicons
                  name={expandedSection === 'badges' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.textLight}
                />
              </View>
              {expandedSection === 'badges' && (
                <View style={styles.expandableContent}>
                  <Text style={styles.expandableText}>
                    <Text style={styles.bold}>16 Badges to Unlock:</Text>{'\n'}
                    • Milestone badges (10, 25, 50, 100, 250, 500 visits){'\n'}
                    • Country completion badges{'\n'}
                    • Points achievement badges (100, 500, 1K, 5K){'\n'}
                    • Social badges (5, 10, 25 friends){'\n\n'}
                    Badges are automatically awarded as you progress!
                  </Text>
                </View>
              )}
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.expandableCard}
            onPress={() => toggleSection('social')}
            activeOpacity={0.8}
          >
            <Surface style={styles.card}>
              <View style={styles.expandableHeader}>
                <View style={styles.expandableHeaderLeft}>
                  <Ionicons name="people" size={24} color={theme.colors.primary} />
                  <Text style={styles.expandableTitle}>Social Features</Text>
                </View>
                <Ionicons
                  name={expandedSection === 'social' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.textLight}
                />
              </View>
              {expandedSection === 'social' && (
                <View style={styles.expandableContent}>
                  <Text style={styles.expandableText}>
                    • <Text style={styles.bold}>Activity Feed:</Text> See friends' visits and milestones{'\n'}
                    • <Text style={styles.bold}>Like & Comment:</Text> Engage with the community{'\n'}
                    • <Text style={styles.bold}>Rich Visits:</Text> Share photos, diaries, and tips{'\n'}
                    • <Text style={styles.bold}>Messaging:</Text> Chat with friends (Basic+){'\n'}
                    • <Text style={styles.bold}>Leaderboards:</Text> Friends and global rankings
                  </Text>
                </View>
              )}
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.expandableCard}
            onPress={() => toggleSection('progress')}
            activeOpacity={0.8}
          >
            <Surface style={styles.card}>
              <View style={styles.expandableHeader}>
                <View style={styles.expandableHeaderLeft}>
                  <Ionicons name="analytics" size={24} color="#00BCD4" />
                  <Text style={styles.expandableTitle}>Progress Tracking</Text>
                </View>
                <Ionicons
                  name={expandedSection === 'progress' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.textLight}
                />
              </View>
              {expandedSection === 'progress' && (
                <View style={styles.expandableContent}>
                  <Text style={styles.expandableText}>
                    • <Text style={styles.bold}>Overall Progress:</Text> Track your global exploration{'\n'}
                    • <Text style={styles.bold}>Continental Breakdown:</Text> Progress per continent{'\n'}
                    • <Text style={styles.bold}>Country Completion:</Text> Finish all landmarks in a country{'\n'}
                    • <Text style={styles.bold}>Visual Stats:</Text> Apple Watch-style progress rings{'\n'}
                    • <Text style={styles.bold}>Streaks:</Text> Track your visit streaks
                  </Text>
                </View>
              )}
            </Surface>
          </TouchableOpacity>
        </View>

        {/* Subscription Tiers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <Text style={styles.sectionSubtitle}>Start free, upgrade anytime</Text>

          <TierCard
            name="Free"
            price="$0"
            features={[
              '10 visits per month',
              'Up to 5 friends',
              'Friends leaderboard only',
              'Access to 380 official landmarks',
              'Basic progress tracking',
            ]}
            color="#9E9E9E"
          />

          <TierCard
            name="Basic"
            price="$4.99/mo"
            features={[
              'Unlimited visits',
              'Up to 25 friends',
              'Friend messaging',
              'Full leaderboard access',
              'All official landmarks',
              'Rich visit sharing',
            ]}
            isPopular
            color={theme.colors.primary}
          />

          <TierCard
            name="Premium"
            price="$9.99/mo"
            features={[
              'Everything in Basic',
              'Unlimited friends',
              'Access to 100 premium landmarks',
              '25 points per premium visit',
              'Global leaderboard',
              'Priority support',
            ]}
            color="#FFD700"
          />
        </View>

        {/* Why Use WanderList? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Use WanderList?</Text>
          <Surface style={styles.card}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Stay Motivated</Text>
                <Text style={styles.benefitText}>
                  Gamification keeps you excited about exploring new places
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Track Your Adventures</Text>
                <Text style={styles.benefitText}>
                  Never forget where you've been with comprehensive tracking
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Share with Friends</Text>
                <Text style={styles.benefitText}>
                  Connect with fellow travelers and share your experiences
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Discover New Places</Text>
                <Text style={styles.benefitText}>
                  Curated list of 480 must-see landmarks around the world
                </Text>
              </View>
            </View>
          </Surface>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/continents')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="compass" size={24} color="#fff" />
              <Text style={styles.ctaText}>Start Exploring Now</Text>
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: theme.spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: '#fff',
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  // Hero Section
  heroSection: {
    marginBottom: theme.spacing.lg,
  },
  heroGradient: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  heroIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(32, 178, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 3,
    borderColor: 'rgba(32, 178, 170, 0.2)',
  },
  heroTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontSize: 28,
    lineHeight: 36,
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  // Sections
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  cardText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: theme.spacing.md,
  },
  highlight: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  bold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 32,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  statBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs / 2,
    gap: 4,
  },
  statBreakdownText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  statBreakdownDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.textLight,
  },
  premiumText: {
    color: '#FFD700',
    fontWeight: '600',
  },
  // How It Works Steps
  stepContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  stepNumber: {
    marginRight: theme.spacing.md,
  },
  stepNumberGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    ...theme.typography.h2,
    color: '#fff',
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  stepTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  stepDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  // Feature Cards
  featureCard: {
    marginBottom: theme.spacing.md,
  },
  featureCardSurface: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
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
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs / 2,
  },
  featureDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  // Expandable Cards
  expandableCard: {
    marginBottom: theme.spacing.md,
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  expandableTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  expandableContent: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  expandableText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  // Points Milestones Styles
  pointsMilestonesSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pointsMilestonesTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  milestoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  milestoneText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  milestoneProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  milestoneLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    width: 100,
    fontSize: 11,
  },
  pointsExplanation: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  // Tier Cards
  tierCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
    position: 'relative',
  },
  tierCardPopular: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  popularBadgeText: {
    ...theme.typography.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1,
  },
  tierName: {
    ...theme.typography.h2,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  tierPrice: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  tierFeatures: {
    gap: theme.spacing.sm,
  },
  tierFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tierFeatureText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  // Benefits
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  benefitContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  benefitTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs / 2,
  },
  benefitText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  // CTA Section
  ctaSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  ctaButton: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md + 4,
    gap: theme.spacing.md,
  },
  ctaText: {
    ...theme.typography.h3,
    color: '#fff',
    fontWeight: '700',
  },
});
