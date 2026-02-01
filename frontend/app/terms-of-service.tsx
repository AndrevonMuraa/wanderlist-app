import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import theme, { gradients } from '../styles/theme';
import { HeaderBranding } from '../components/BrandedGlobeIcon';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);
  const lastUpdated = 'January 20, 2026';
  const effectiveDate = 'January 20, 2026';

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
            <Text style={styles.headerTitle}>Terms of Service</Text>
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
              <Ionicons name="document-text" size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Terms of Service</Text>
              <Text style={styles.lastUpdated}>Effective: {effectiveDate}</Text>
            </View>
          </View>
          
          <Text style={styles.introText}>
            Please read these Terms of Service ("Terms") carefully before using the WanderList mobile application ("App") operated by WanderList ("we", "us", or "our").
          </Text>
          
          <View style={styles.highlightBox}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.highlightText}>
              By accessing or using the App, you agree to be bound by these Terms. If you disagree with any part, you may not access the App.
            </Text>
          </View>
        </Surface>

        {/* Account Registration */}
        <Surface style={styles.card}>
          <Section title="1. Account Registration">
            <Text style={styles.paragraph}>
              To use certain features of WanderList, you must register for an account. When you register, you agree to:
            </Text>
            <BulletPoint text="Provide accurate, current, and complete information" />
            <BulletPoint text="Maintain and update your information to keep it accurate" />
            <BulletPoint text="Maintain the security of your password and account" />
            <BulletPoint text="Accept responsibility for all activities under your account" />
            <BulletPoint text="Notify us immediately of any unauthorized access" />
            
            <Text style={[styles.paragraph, { marginTop: 12 }]}>
              You must be at least 13 years old to create an account. By creating an account, you represent that you meet this age requirement.
            </Text>
          </Section>
        </Surface>

        {/* Acceptable Use */}
        <Surface style={styles.card}>
          <Section title="2. Acceptable Use">
            <Text style={styles.paragraph}>
              You agree to use WanderList only for lawful purposes. You agree NOT to:
            </Text>
            <BulletPoint text="Upload false or misleading information" />
            <BulletPoint text="Upload content that infringes on intellectual property rights" />
            <BulletPoint text="Upload inappropriate, offensive, or harmful content" />
            <BulletPoint text="Harass, abuse, or harm other users" />
            <BulletPoint text="Attempt to gain unauthorized access to other accounts" />
            <BulletPoint text="Use the App for any commercial purposes without permission" />
            <BulletPoint text="Reverse engineer or attempt to extract source code" />
            <BulletPoint text="Use automated systems to access the App" />
            <BulletPoint text="Interfere with or disrupt the App or servers" />
          </Section>
        </Surface>

        {/* User Content */}
        <Surface style={styles.card}>
          <Section title="3. User Content">
            <Text style={styles.paragraph}>
              You retain ownership of content you submit (photos, notes, tips). By uploading content, you grant us a worldwide, non-exclusive, royalty-free license to:
            </Text>
            <BulletPoint text="Display your content based on your privacy settings" />
            <BulletPoint text="Store and back up your content" />
            <BulletPoint text="Use anonymized data to improve our services" />
            
            <Text style={[styles.paragraph, { marginTop: 12 }]}>
              You are solely responsible for your content. By uploading, you represent that you have the right to do so and that your content does not violate any laws or third-party rights.
            </Text>
          </Section>
        </Surface>

        {/* Content Moderation - NEW */}
        <Surface style={styles.card}>
          <Section title="4. Content Moderation & Reporting">
            <Text style={styles.subTitle}>Community Guidelines</Text>
            <Text style={styles.paragraph}>
              WanderList is committed to maintaining a safe and respectful community. All user-generated content, including photos, diary entries, and tips, must comply with our guidelines.
            </Text>
            
            <Text style={[styles.subTitle, { marginTop: 16 }]}>Prohibited Content</Text>
            <BulletPoint text="Inappropriate, offensive, or explicit material" />
            <BulletPoint text="Harassment, hate speech, or bullying" />
            <BulletPoint text="Spam or misleading information" />
            <BulletPoint text="Copyright-infringing content" />
            <BulletPoint text="Photos that do not depict the claimed landmark" />
            <BulletPoint text="Fake or fabricated visits" />
            
            <Text style={[styles.subTitle, { marginTop: 16 }]}>Reporting</Text>
            <Text style={styles.paragraph}>
              Users can report inappropriate content or behavior using the report feature. Reports are reviewed by our moderation team within 24-48 hours. False reports may result in account restrictions.
            </Text>
            
            <Text style={[styles.subTitle, { marginTop: 16 }]}>Enforcement</Text>
            <Text style={styles.paragraph}>
              Violations may result in content removal, temporary suspension, or permanent account termination depending on severity and frequency.
            </Text>
          </Section>
        </Surface>

        {/* Subscription & Payments */}
        <Surface style={styles.card}>
          <Section title="5. Subscriptions & Payments">
            <Text style={styles.subTitle}>WanderList Pro</Text>
            <Text style={styles.paragraph}>
              WanderList Pro is a premium subscription that unlocks additional features including premium landmarks, custom visits, and extended photo limits.
            </Text>
            
            <Text style={[styles.subTitle, { marginTop: 16 }]}>Pricing</Text>
            <BulletPoint text="Monthly: $3.99/month" />
            <BulletPoint text="Annual: $29.99/year (save 37%)" />
            
            <Text style={[styles.subTitle, { marginTop: 16 }]}>Billing</Text>
            <Text style={styles.paragraph}>
              Subscriptions are billed through your App Store or Google Play account. Your subscription will automatically renew unless cancelled at least 24 hours before the end of the current period.
            </Text>
            
            <Text style={[styles.subTitle, { marginTop: 16 }]}>Cancellation</Text>
            <Text style={styles.paragraph}>
              You can cancel your subscription at any time through your device's subscription settings. After cancellation, you will continue to have access until the end of your current billing period.
            </Text>
          </Section>
        </Surface>

        {/* Points & Rewards */}
        <Surface style={styles.card}>
          <Section title="6. Points, Rewards & Fair Play">
            <Text style={styles.paragraph}>
              WanderList awards points for visiting landmarks. Points are:
            </Text>
            <BulletPoint text="For entertainment and gamification purposes only" />
            <BulletPoint text="Not redeemable for cash or prizes" />
            <BulletPoint text="Non-transferable between accounts" />
            <BulletPoint text="Subject to adjustment if awarded in error" />
            
            <Text style={[styles.subTitle, { marginTop: 16 }]}>Anti-Cheat Policy</Text>
            <Text style={styles.paragraph}>
              To ensure fair competition on leaderboards:
            </Text>
            <BulletPoint text="Visits require photo proof to earn leaderboard points" />
            <BulletPoint text="Photos are subject to verification and review" />
            <BulletPoint text="Suspicious activity patterns are monitored" />
            <BulletPoint text="Fraudulent visits will be removed and points deducted" />
            <BulletPoint text="Repeated violations result in leaderboard ban or account termination" />
            
            <Text style={[styles.paragraph, { marginTop: 12 }]}>
              We reserve the right to modify the points system at any time. Leaderboard rankings are based on leaderboard points (visits with photos) to ensure fair competition.
            </Text>
          </Section>
        </Surface>

        {/* Intellectual Property */}
        <Surface style={styles.card}>
          <Section title="7. Intellectual Property">
            <Text style={styles.paragraph}>
              The WanderList App, including its original content, features, and functionality, is owned by WanderList and protected by international copyright, trademark, and other intellectual property laws.
            </Text>
            <Text style={[styles.paragraph, { marginTop: 12 }]}>
              The WanderList name, logo, and all related names, logos, and slogans are trademarks of WanderList. You may not use these marks without our prior written permission.
            </Text>
          </Section>
        </Surface>

        {/* Privacy */}
        <Surface style={styles.card}>
          <Section title="8. Privacy">
            <Text style={styles.paragraph}>
              Your privacy is important to us. Our Privacy Policy describes how we collect, use, and share your information. By using WanderList, you consent to our collection and use of information as described in our Privacy Policy.
            </Text>
            <TouchableOpacity 
              style={styles.inlineLink}
              onPress={() => router.push('/privacy-policy')}
            >
              <Ionicons name="shield-checkmark" size={18} color={theme.colors.primary} />
              <Text style={styles.inlineLinkText}>View Privacy Policy</Text>
            </TouchableOpacity>
          </Section>
        </Surface>

        {/* Disclaimers */}
        <Surface style={styles.card}>
          <Section title="9. Disclaimers">
            <Text style={styles.paragraph}>
              THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT THAT:
            </Text>
            <BulletPoint text="The App will be uninterrupted or error-free" />
            <BulletPoint text="Defects will be corrected" />
            <BulletPoint text="The App is free of viruses or harmful components" />
            <BulletPoint text="The results from using the App will meet your requirements" />
            
            <Text style={[styles.paragraph, { marginTop: 12 }]}>
              Landmark information is provided for entertainment purposes. Always verify travel information through official sources before visiting any location.
            </Text>
          </Section>
        </Surface>

        {/* Limitation of Liability */}
        <Surface style={styles.card}>
          <Section title="10. Limitation of Liability">
            <Text style={styles.paragraph}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WANDERLIST SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING:
            </Text>
            <BulletPoint text="Loss of profits, data, or goodwill" />
            <BulletPoint text="Service interruption or computer damage" />
            <BulletPoint text="Cost of substitute services" />
            <BulletPoint text="Any other intangible losses" />
            
            <Text style={[styles.paragraph, { marginTop: 12 }]}>
              Our total liability shall not exceed the amount you paid us in the twelve months preceding the claim.
            </Text>
          </Section>
        </Surface>

        {/* Termination */}
        <Surface style={styles.card}>
          <Section title="11. Termination">
            <Text style={styles.paragraph}>
              We may terminate or suspend your account immediately, without prior notice, for any reason, including breach of these Terms. Upon termination:
            </Text>
            <BulletPoint text="Your right to use the App will immediately cease" />
            <BulletPoint text="You may request deletion of your data" />
            <BulletPoint text="Certain provisions of these Terms will survive termination" />
          </Section>
        </Surface>

        {/* Changes to Terms */}
        <Surface style={styles.card}>
          <Section title="11. Changes to Terms">
            <Text style={styles.paragraph}>
              We reserve the right to modify these Terms at any time. We will notify you of any changes by updating the "Effective" date. Your continued use of the App after changes constitutes acceptance of the new Terms.
            </Text>
          </Section>
        </Surface>

        {/* Governing Law */}
        <Surface style={styles.card}>
          <Section title="12. Governing Law">
            <Text style={styles.paragraph}>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which WanderList operates, without regard to conflict of law provisions.
            </Text>
          </Section>
        </Surface>

        {/* Contact */}
        <Surface style={styles.card}>
          <Section title="13. Contact Us">
            <Text style={styles.paragraph}>
              If you have questions about these Terms, please contact us:
            </Text>
            <View style={styles.contactBox}>
              <Ionicons name="mail" size={20} color={theme.colors.primary} />
              <Text style={styles.contactText}>legal@wanderlist.app</Text>
            </View>
          </Section>
        </Surface>

        {/* Privacy Link */}
        <TouchableOpacity 
          style={styles.linkCard}
          onPress={() => router.push('/privacy-policy')}
          activeOpacity={0.7}
        >
          <View style={styles.linkContent}>
            <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
            <Text style={styles.linkText}>View Privacy Policy</Text>
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
    marginBottom: 16,
  },
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primary + '10',
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginLeft: 10,
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
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: 8,
  },
  inlineLinkText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 8,
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
