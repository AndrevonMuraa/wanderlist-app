import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { safeGoBack } from '../../utils/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

interface SafetyCardProps {
  icon: any;
  iconColor: string;
  title: string;
  body: string;
  cta?: { label: string; onPress: () => void };
}

const SafetyCard: React.FC<SafetyCardProps> = ({ icon, iconColor, title, body, cta }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]} testID={`safety-card-${title}`}>
      <View style={[styles.iconCircle, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{body}</Text>
        {cta && (
          <TouchableOpacity onPress={cta.onPress} style={styles.ctaBtn}>
            <Text style={styles.ctaText}>{cta.label} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function CommunitySafetyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient colors={['#10B981', '#0F766E']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.headerBack} testID="safety-back">
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Community Safety</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={styles.headerSub}>How WanderMark keeps you safe</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          WanderMark gives you full control over your experience. Every photo, post, and interaction is governed by transparent rules and tools designed to keep the community safe.
        </Text>

        {/* TOOLS YOU CAN USE */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Tools you can use</Text>

        <SafetyCard
          icon="flag"
          iconColor="#EF4444"
          title="Report content or users"
          body="See something inappropriate? Tap the ⋯ menu on any photo, comment, visit, or profile to report it. Our moderators review every report. False reports are rate-limited."
          cta={{ label: 'See community guidelines', onPress: () => router.push('/terms-of-service?section=guidelines' as any) }}
        />

        <SafetyCard
          icon="ban"
          iconColor="#F97316"
          title="Block other users"
          body="Block someone to prevent them from seeing your content, messaging you, or appearing in your feed. Blocking is private — they're not notified."
        />

        <SafetyCard
          icon="lock-closed"
          iconColor="#6366F1"
          title="Private and friends-only posts"
          body="Choose visibility per post: Public, Friends only, or Private (only you). Default visibility can be set in Privacy settings."
          cta={{ label: 'Open Privacy settings', onPress: () => router.push('/settings/privacy' as any) }}
        />

        <SafetyCard
          icon="mail"
          iconColor="#3B82F6"
          title="Contact a moderator"
          body="Need help with something a report can't fix? Send a moderator a direct message via the in-app support inbox. We typically respond within 48 hours."
        />

        {/* HOW WE PROTECT */}
        <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 16 }]}>How we protect the community</Text>

        <SafetyCard
          icon="shield"
          iconColor="#8B5CF6"
          title="Trained moderators"
          body="Reports are reviewed by humans, not algorithms. Our team can hide content (soft-delete), warn users, or temporarily suspend accounts that violate our community guidelines."
        />

        <SafetyCard
          icon="warning"
          iconColor="#F59E0B"
          title="Strike system"
          body="Three warnings within 90 days triggers an automatic 7-day suspension. Five warnings ever triggers a 30-day suspension. Severe violations can result in immediate account termination."
        />

        <SafetyCard
          icon="eye-off"
          iconColor="#F59E0B"
          title="Hidden content"
          body="Content that breaks our rules is hidden from public view. The original poster is notified and shown a clear reason. They can appeal via the moderator support inbox."
        />

        <SafetyCard
          icon="shield-checkmark"
          iconColor="#10B981"
          title="Trusted Traveler badge"
          body="Members with 90+ days of clean contribution and verified visits earn a Trusted Traveler badge. Their reports are prioritized in our moderation queue, helping us catch bad behaviour faster."
          cta={{ label: 'See your status', onPress: () => router.push('/(tabs)/profile' as any) }}
        />

        {/* YOUR DATA */}
        <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 16 }]}>Your data and account</Text>

        <SafetyCard
          icon="key"
          iconColor="#0EA5E9"
          title="Account control"
          body="Change your password, manage email, or delete your account permanently at any time. We never sell your data. Read our full privacy policy for details."
          cta={{ label: 'Account settings', onPress: () => router.push('/settings/account' as any) }}
        />

        <SafetyCard
          icon="document-text"
          iconColor="#6B7280"
          title="Privacy policy & Terms"
          body="Our policies in plain English. We collect only what's needed to make WanderMark work, store data securely, and never share location with advertisers."
          cta={{ label: 'Read policies', onPress: () => router.push('/privacy-policy' as any) }}
        />

        <SafetyCard
          icon="alert-circle"
          iconColor="#EF4444"
          title="Emergency reporting"
          body="If you encounter something that endangers anyone's safety — including child safety concerns or imminent threats — email us immediately at safety@wandermark.app. We respond within 24 hours."
          cta={{
            label: 'Email safety team',
            onPress: () => Linking.openURL('mailto:safety@wandermark.app?subject=Safety%20concern').catch(() => {}),
          }}
        />

        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          We take community safety seriously. If you ever feel unsafe, please reach out — we&apos;re here to help.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBack: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 8, marginLeft: 4 },
  intro: { fontSize: 13, lineHeight: 19, paddingHorizontal: 4, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 4, marginBottom: 4 },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardBody: { fontSize: 13, lineHeight: 19 },
  ctaBtn: { marginTop: 10 },
  ctaText: { fontSize: 13, fontWeight: '700', color: '#10B981' },
  footer: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 16, paddingHorizontal: 12 },
});
