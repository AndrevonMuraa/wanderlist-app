import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
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

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);
  const lastUpdated = 'January 20, 2026';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const BulletPoint = ({ text }: { text: string }) => (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );

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
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Privacy Policy</Text>
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

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <Surface style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Your Privacy Matters</Text>
              <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>
            </View>
          </View>
          
          <Text style={styles.introText}>
            WanderMark ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
          </Text>
        </Surface>

        {/* Information We Collect */}
        <Surface style={styles.card}>
          <Section title="1. Information We Collect">
            <Text style={styles.subTitle}>Personal Information</Text>
            <Text style={styles.paragraph}>
              When you create an account, we collect:
            </Text>
            <BulletPoint text="Email address" />
            <BulletPoint text="Password (encrypted)" />
            <BulletPoint text="Profile name and photo (optional)" />
            <BulletPoint text="Bio and location (optional)" />

            <Text style={[styles.subTitle, { marginTop: 16 }]}>Usage Data</Text>
            <Text style={styles.paragraph}>
              We automatically collect:
            </Text>
            <BulletPoint text="Landmarks you visit and mark as complete" />
            <BulletPoint text="Photos you upload with visits" />
            <BulletPoint text="Travel diary notes and tips" />
            <BulletPoint text="Points, achievements, and progress" />
            <BulletPoint text="Activity on leaderboards and social features" />

            <Text style={[styles.subTitle, { marginTop: 16 }]}>Device Information</Text>
            <BulletPoint text="Device type and operating system" />
            <BulletPoint text="App version" />
            <BulletPoint text="Crash reports and performance data" />
          </Section>
        </Surface>

        {/* How We Use Information */}
        <Surface style={styles.card}>
          <Section title="2. How We Use Your Information">
            <Text style={styles.paragraph}>We use the information we collect to:</Text>
            <BulletPoint text="Provide and maintain the WanderMark service" />
            <BulletPoint text="Track your travel progress and achievements" />
            <BulletPoint text="Display leaderboards and social features" />
            <BulletPoint text="Enable friend connections and messaging" />
            <BulletPoint text="Send notifications about your activity" />
            <BulletPoint text="Improve and personalize your experience" />
            <BulletPoint text="Analyze usage patterns to enhance features" />
            <BulletPoint text="Respond to customer support requests" />
          </Section>
        </Surface>

        {/* Information Sharing */}
        <Surface style={styles.card}>
          <Section title="3. Information Sharing">
            <Text style={styles.paragraph}>
              We do not sell your personal information. We may share information:
            </Text>
            <BulletPoint text="With other users based on your privacy settings (public, friends, private)" />
            <BulletPoint text="On leaderboards (display name and points only)" />
            <BulletPoint text="With service providers who assist in operating our app" />
            <BulletPoint text="When required by law or to protect our rights" />
            <BulletPoint text="In connection with a merger or acquisition" />
          </Section>
        </Surface>

        {/* Your Privacy Controls */}
        <Surface style={styles.card}>
          <Section title="4. Your Privacy Controls">
            <Text style={styles.paragraph}>
              You have control over your information:
            </Text>
            <BulletPoint text="Set default privacy (public, friends-only, or private)" />
            <BulletPoint text="Choose visibility for each visit individually" />
            <BulletPoint text="Edit or delete your profile information" />
            <BulletPoint text="Delete your account and all associated data" />
            <BulletPoint text="Manage friend connections" />
            <BulletPoint text="Control notification preferences" />
          </Section>
        </Surface>

        {/* Data Storage & Security */}
        <Surface style={styles.card}>
          <Section title="5. Data Storage & Security">
            <Text style={styles.paragraph}>
              We implement appropriate technical and organizational security measures to protect your information. Your data is stored securely on cloud servers with encryption in transit and at rest.
            </Text>
            <Text style={[styles.paragraph, { marginTop: 12 }]}>
              While we strive to protect your information, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </Text>
          </Section>
        </Surface>

        {/* Photos & Camera */}
        <Surface style={styles.card}>
          <Section title="6. Photos & Camera Access">
            <Text style={styles.paragraph}>
              WanderMark requests camera and photo library access to:
            </Text>
            <BulletPoint text="Take photos of landmarks you visit" />
            <BulletPoint text="Select existing photos from your gallery" />
            <BulletPoint text="Add a profile picture" />
            
            <Text style={[styles.paragraph, { marginTop: 12 }]}>
              Photos you upload are stored securely and their visibility is controlled by your privacy settings. You can delete uploaded photos at any time.
            </Text>
          </Section>
        </Surface>

        {/* Children's Privacy */}
        <Surface style={styles.card}>
          <Section title="7. Children's Privacy">
            <Text style={styles.paragraph}>
              WanderMark is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </Text>
          </Section>
        </Surface>

        {/* Third-Party Services */}
        <Surface style={styles.card}>
          <Section title="8. Third-Party Services">
            <Text style={styles.paragraph}>
              Our app may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies.
            </Text>
            <Text style={[styles.paragraph, { marginTop: 12 }]}>
              We may use the following third-party services:
            </Text>
            <BulletPoint text="Apple Sign-In and email-based authentication" />
            <BulletPoint text="Analytics services to improve our app" />
            <BulletPoint text="Cloud storage for data and photos" />
          </Section>
        </Surface>

        {/* Changes to Policy */}
        <Surface style={styles.card}>
          <Section title="9. Changes to This Policy">
            <Text style={styles.paragraph}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </Text>
            <Text style={[styles.paragraph, { marginTop: 12 }]}>
              We encourage you to review this Privacy Policy periodically for any changes. Continued use of the app after changes indicates acceptance of the updated policy.
            </Text>
          </Section>
        </Surface>

        {/* Contact Us */}
        <Surface style={styles.card}>
          <Section title="10. Contact Us">
            <Text style={styles.paragraph}>
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </Text>
            <View style={styles.contactBox}>
              <Ionicons name="mail" size={20} color={theme.colors.primary} />
              <Text style={styles.contactText}>privacy@wandermark.app</Text>
            </View>
          </Section>
        </Surface>

        {/* Terms Link */}
        <TouchableOpacity 
          style={styles.linkCard}
          onPress={() => router.push('/terms-of-service')}
          activeOpacity={0.7}
        >
          <View style={styles.linkContent}>
            <Ionicons name="document-text" size={24} color={theme.colors.primary} />
            <Text style={styles.linkText}>View Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  introText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 14,
    color: theme.colors.primary,
    marginRight: 8,
    fontWeight: '600',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  contactText: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 10,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 12,
  },
  bottomSpacer: {
    height: 20,
  },
});
