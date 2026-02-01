import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { HeaderBranding } from '../components/BrandedGlobeIcon';

const { width } = Dimensions.get('window');

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleFAQ = (faq: string) => {
    setExpandedFAQ(expandedFAQ === faq ? null : faq);
  };

  const handleSendSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) {
      Alert.alert('Missing Information', 'Please fill in both subject and message.');
      return;
    }

    setSendingSupport(true);
    try {
      // For now, just show success - in production this would send to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert(
        'Message Sent! ✅',
        'Thank you for contacting us. We\'ll get back to you within 24-48 hours.',
        [{ text: 'OK', onPress: () => { setSupportSubject(''); setSupportMessage(''); } }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSendingSupport(false);
    }
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
    isNew,
  }: {
    icon: string;
    title: string;
    description: string;
    color: string;
    onPress: () => void;
    isNew?: boolean;
  }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.featureCard}>
      <Surface style={styles.featureCardSurface}>
        <View style={[styles.featureIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon as any} size={28} color={color} />
        </View>
        <View style={styles.featureContent}>
          <View style={styles.featureTitleRow}>
            <Text style={styles.featureTitle}>{title}</Text>
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </LinearGradient>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Surface style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>520</Text>
                <Text style={styles.statLabel}>Landmarks</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>48</Text>
                <Text style={styles.statLabel}>Countries</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>5</Text>
                <Text style={styles.statLabel}>Continents</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>6,580</Text>
                <Text style={styles.statLabel}>Total Points</Text>
              </View>
            </View>
          </Surface>
        </View>

        {/* Help & Support Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Help & Support</Text>
          </View>

          {/* FAQ */}
          <Surface style={styles.card}>
            <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
            
            <FAQItem
              id="points"
              question="How does the points system work?"
              answer="You earn points for visiting landmarks: 10 points for official landmarks, 25 points for premium landmarks. There are two types of points:\n\n• Personal Points: Earned for all visits (with or without photos)\n• Leaderboard Points: Only earned when you upload photos with your visit\n\nThis encourages sharing your travel memories while still rewarding all visits!"
            />
            
            <FAQItem
              id="custom"
              question="How do I add places not in the app?"
              answer="Use 'Custom Visits' to record trips to places not in our database! You can:\n\n• Add any country name\n• Add up to 10 landmarks with individual photos\n• Add up to 10 general country photos\n• Write diary notes\n\nFind it on the Journey page under 'Custom Visits' or on the Explore page at the bottom."
            />
            
            <FAQItem
              id="privacy"
              question="Who can see my visits?"
              answer="You control your privacy! Each visit can be set to:\n\n🌐 Public - Everyone can see\n👥 Friends - Only your friends\n🔒 Private - Only you\n\nChange this when creating a visit or edit it later."
            />
            
            <FAQItem
              id="photos"
              question="Where can I see all my photos?"
              answer="Visit the 'My Photos' section on your Journey page! It shows all photos from:\n\n• Landmark visits\n• Country visits\n• Custom visits\n\nYou can filter by country, year, or type."
            />
            
            <FAQItem
              id="milestones"
              question="What are the milestone badges?"
              answer="Earn badges as you explore:\n\n🗺️ Explorer - 10 landmarks\n🧗 Adventurer - 25 landmarks\n🌍 Globetrotter - 50 landmarks\n✈️ World Traveler - 100 landmarks\n🧭 Seasoned Traveler - 200 landmarks\n🏆 Legend - 350 landmarks\n👑 Ultimate Explorer - 500 landmarks"
            />
            
            <FAQItem
              id="delete"
              question="How do I delete my account?"
              answer="To delete your account, please contact us using the form below with subject 'Account Deletion Request'. We'll process your request within 48 hours and permanently delete all your data."
            />
          </Surface>
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <Surface style={styles.card}>
            <Text style={styles.cardTitle}>Contact Support</Text>
            <Text style={styles.cardSubtitle}>We typically respond within 24-48 hours</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Subject (e.g., Bug Report, Feature Request)"
              placeholderTextColor={theme.colors.textLight}
              value={supportSubject}
              onChangeText={setSupportSubject}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your issue or question..."
              placeholderTextColor={theme.colors.textLight}
              value={supportMessage}
              onChangeText={setSupportMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            
            <TouchableOpacity
              style={[styles.sendButton, (!supportSubject.trim() || !supportMessage.trim()) && styles.sendButtonDisabled]}
              onPress={handleSendSupport}
              disabled={sendingSupport || !supportSubject.trim() || !supportMessage.trim()}
            >
              <LinearGradient
                colors={supportSubject.trim() && supportMessage.trim() ? [theme.colors.primary, theme.colors.secondary] : ['#ccc', '#aaa']}
                style={styles.sendButtonGradient}
              >
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.sendButtonText}>
                  {sendingSupport ? 'Sending...' : 'Send Message'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
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
              description="Browse 520 landmarks across 48 countries and 5 continents."
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
              title="Earn Points & Badges"
              description="Collect points for visits. Upload photos for leaderboard points!"
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
            icon="images"
            title="Photo Collection"
            description="All your travel photos in one beautiful gallery"
            color="#FF6B6B"
            onPress={() => router.push('/photo-collection')}
            isNew
          />

          <FeatureCard
            icon="airplane"
            title="Custom Visits"
            description="Record trips to places not in our database"
            color="#1E8A8A"
            onPress={() => router.push('/(tabs)/journey')}
            isNew
          />

          <FeatureCard
            icon="flag"
            title="Country Visits"
            description="Record entire country experiences with photos & diaries"
            color={theme.colors.primary}
            onPress={() => router.push('/my-country-visits')}
          />

          <FeatureCard
            icon="trophy"
            title="Achievements"
            description="Unlock badges as you reach travel milestones"
            color="#FFD700"
            onPress={() => router.push('/achievements')}
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
                    <Text style={styles.bold}>Personal Points</Text> (always earned):{'\n'}
                    • Official Landmarks: 10 pts{'\n'}
                    • Premium Landmarks: 25 pts{'\n'}
                    • Country Visit: 50 pts{'\n\n'}
                    <Text style={styles.bold}>Leaderboard Points</Text> (with photos):{'\n'}
                    • Same values, but only when you upload photos{'\n'}
                    • Compete fairly with verified visits!
                  </Text>
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
                  <Ionicons name="ribbon" size={22} color="#FF6B6B" />
                  <Text style={styles.expandableTitle}>Badge System</Text>
                </View>
                <Ionicons
                  name={expandedSection === 'badges' ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={theme.colors.textLight}
                />
              </View>
              {expandedSection === 'badges' && (
                <View style={styles.expandableContent}>
                  <Text style={styles.expandableText}>
                    <Text style={styles.bold}>Visit Milestones:</Text>{'\n'}
                    10 → 25 → 50 → 100 → 200 → 350 → 500{'\n\n'}
                    <Text style={styles.bold}>Points Milestones:</Text>{'\n'}
                    100 → 500 → 1,000 → 5,000 pts{'\n\n'}
                    <Text style={styles.bold}>Social Badges:</Text>{'\n'}
                    5 → 10 → 25 friends{'\n\n'}
                    Badges are awarded automatically! 🎉
                  </Text>
                </View>
              )}
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
                    Control who sees each visit:{'\n\n'}
                    🌐 <Text style={styles.bold}>Public</Text> - Everyone{'\n'}
                    👥 <Text style={styles.bold}>Friends</Text> - Only friends{'\n'}
                    🔒 <Text style={styles.bold}>Private</Text> - Only you{'\n\n'}
                    Set privacy when creating visits or change anytime.
                  </Text>
                </View>
              )}
            </Surface>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Surface style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>January 2026</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Database</Text>
              <Text style={styles.infoValue}>520 landmarks, 48 countries</Text>
            </View>
          </Surface>
        </View>

        {/* CTA */}
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
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textLight,
    marginTop: 2,
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
  // Contact Form
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
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
  newBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
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
