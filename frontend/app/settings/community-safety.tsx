import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme, { gradients } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { HeaderBranding } from '../../components/BrandedGlobeIcon';

interface ItemRow {
  icon: any;
  iconColor: string;
  title: string;
  body: string;
  cta?: { label: string; onPress: () => void };
}

interface SectionDef {
  icon: any;
  iconColor: string;
  title: string;
  subtitle: string;
  items: ItemRow[];
}

export default function CommunitySafetyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, gradientColors } = useTheme();
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  const sections: SectionDef[] = [
    {
      icon: 'hand-right',
      iconColor: '#3B82F6',
      title: 'Tools you can use',
      subtitle: 'Take control of your experience',
      items: [
        {
          icon: 'flag',
          iconColor: '#EF4444',
          title: 'Report content or users',
          body: 'See something inappropriate? Tap the ••• menu on any photo, comment, visit, or profile to report it. Our moderators review every report. False reports are rate-limited.',
          cta: { label: 'See community guidelines', onPress: () => router.push('/terms-of-service?section=guidelines' as any) },
        },
        {
          icon: 'ban',
          iconColor: '#F97316',
          title: 'Block other users',
          body: "Block someone to prevent them from seeing your content, messaging you, or appearing in your feed. Blocking is private — they're not notified.",
        },
        {
          icon: 'lock-closed',
          iconColor: '#6366F1',
          title: 'Private and friends-only posts',
          body: 'Choose visibility per post: Public, Friends only, or Private (only you). Default visibility can be set in Privacy settings.',
          cta: { label: 'Open Privacy settings', onPress: () => router.push('/settings/privacy' as any) },
        },
        {
          icon: 'mail',
          iconColor: '#3B82F6',
          title: 'Contact a moderator',
          body: "Need help with something a report can't fix? Send a moderator a direct message via the in-app support inbox. We typically respond within 48 hours.",
        },
      ],
    },
    {
      icon: 'shield-checkmark',
      iconColor: '#10B981',
      title: 'How we protect the community',
      subtitle: 'Human moderation, transparent rules',
      items: [
        {
          icon: 'shield',
          iconColor: '#8B5CF6',
          title: 'Trained moderators',
          body: 'Reports are reviewed by humans, not algorithms. Our team can hide content (soft-delete), warn users, or temporarily suspend accounts that violate our community guidelines.',
        },
        {
          icon: 'warning',
          iconColor: '#F59E0B',
          title: 'Strike system',
          body: 'Three warnings within 90 days triggers an automatic 7-day suspension. Five warnings ever triggers a 30-day suspension. Severe violations can result in immediate account termination.',
        },
        {
          icon: 'eye-off',
          iconColor: '#F59E0B',
          title: 'Hidden content',
          body: 'Content that breaks our rules is hidden from public view. The original poster is notified and shown a clear reason. They can appeal via the moderator support inbox.',
        },
        {
          icon: 'shield-checkmark',
          iconColor: '#10B981',
          title: 'Trusted Traveler badge',
          body: 'Members with 90+ days of clean contribution and verified visits earn a Trusted Traveler badge. Their reports are prioritized in our moderation queue, helping us catch bad behaviour faster.',
          cta: { label: 'See your status', onPress: () => router.push('/(tabs)/profile' as any) },
        },
      ],
    },
    {
      icon: 'key',
      iconColor: '#0EA5E9',
      title: 'Your data and account',
      subtitle: 'Control what we keep, and how',
      items: [
        {
          icon: 'key',
          iconColor: '#0EA5E9',
          title: 'Account control',
          body: 'Change your password, manage email, or delete your account permanently at any time. We never sell your data. Read our full privacy policy for details.',
          cta: { label: 'Account settings', onPress: () => router.push('/settings/account' as any) },
        },
        {
          icon: 'document-text',
          iconColor: '#6B7280',
          title: 'Privacy policy & Terms',
          body: "Our policies in plain English. We collect only what's needed to make WanderMark work, store data securely, and never share location with advertisers.",
          cta: { label: 'Read policies', onPress: () => router.push('/privacy-policy' as any) },
        },
        {
          icon: 'alert-circle',
          iconColor: '#EF4444',
          title: 'Emergency reporting',
          body: "If you encounter something that endangers anyone's safety — including child safety concerns or imminent threats — email us immediately at safety@wandermark.app. We respond within 24 hours.",
          cta: {
            label: 'Email safety team',
            onPress: () => Linking.openURL('mailto:safety@wandermark.app?subject=Safety%20concern').catch(() => {}),
          },
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header — matches /settings/privacy */}
      <LinearGradient
        colors={gradientColors}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              testID="safety-back"
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Community Safety</Text>
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          WanderMark gives you full control over your experience. Every photo, post, and interaction is governed by transparent rules and tools designed to keep the community safe.
        </Text>

        {sections.map((section) => (
          <View key={section.title} style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconCircle, { backgroundColor: section.iconColor + '15' }]}>
                <Ionicons name={section.icon} size={22} color={section.iconColor} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{section.subtitle}</Text>
              </View>
            </View>

            <View style={[styles.itemList, { backgroundColor: colors.background }]}>
              {section.items.map((item, idx) => (
                <View
                  key={item.title}
                  style={[
                    styles.itemRow,
                    idx < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                  testID={`safety-card-${item.title}`}
                >
                  <View style={[styles.itemIcon, { backgroundColor: item.iconColor + '15' }]}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.itemBody, { color: colors.textSecondary }]}>{item.body}</Text>
                    {item.cta && (
                      <TouchableOpacity onPress={item.cta.onPress} style={styles.itemCta}>
                        <Text style={[styles.itemCtaText, { color: colors.primary }]}>{item.cta.label} →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          We take community safety seriously. If you ever feel unsafe, please reach out — we&apos;re here to help.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  brandingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 40, paddingHorizontal: 16, gap: 16 },
  intro: { fontSize: 13, lineHeight: 19, paddingHorizontal: 4 },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  sectionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  itemList: { borderRadius: 12, marginHorizontal: 12, marginBottom: 12, padding: 4 },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  itemBody: { fontSize: 12.5, lineHeight: 18 },
  itemCta: { marginTop: 8 },
  itemCtaText: { fontSize: 13, fontWeight: '700' },
  footer: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 8, paddingHorizontal: 12 },
});
