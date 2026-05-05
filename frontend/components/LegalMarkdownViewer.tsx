import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient';
import { safeGoBack } from '../utils/navigation';
import theme, { gradients } from '../styles/theme';
import { HeaderBranding } from './BrandedGlobeIcon';
import {
  getLegalContent,
  refreshLegalContent,
  type LegalContent,
  type LegalDoc,
} from '../utils/legalContent';

interface Props {
  doc: LegalDoc;
  title: string;
  headerIcon: keyof typeof Ionicons.glyphMap;
  crossLinkLabel: string;
  crossLinkRoute: '/privacy-policy' | '/terms-of-service';
  crossLinkIcon: keyof typeof Ionicons.glyphMap;
}

export default function LegalMarkdownViewer({
  doc,
  title,
  headerIcon,
  crossLinkLabel,
  crossLinkRoute,
  crossLinkIcon,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight || 20;

  const [content, setContent] = useState<LegalContent | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLegalContent(doc).then((c) => {
      if (!cancelled) setContent(c);
    });
    return () => {
      cancelled = true;
    };
  }, [doc]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const c = await refreshLegalContent(doc);
      setContent(c);
    } finally {
      setRefreshing(false);
    }
  }, [doc]);

  const openLink = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
    return false;
  }, []);

  return (
    <View style={styles.container} testID={`legal-viewer-${doc}`}>
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => safeGoBack(router)}
              style={styles.backButton}
              testID={`legal-${doc}-back`}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Surface style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name={headerIcon} size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>{title}</Text>
              <SourceBadge content={content} />
            </View>
          </View>

          {content ? (
            <View testID={`legal-${doc}-content`}>
              <Markdown style={markdownStyles} onLinkPress={openLink}>
                {content.markdown}
              </Markdown>
            </View>
          ) : (
            <View style={styles.loadingBox} testID={`legal-${doc}-loading`}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          )}
        </Surface>

        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => router.push(crossLinkRoute)}
          activeOpacity={0.7}
          testID={`legal-${doc}-cross-link`}
        >
          <View style={styles.linkContent}>
            <Ionicons name={crossLinkIcon} size={24} color={theme.colors.primary} />
            <Text style={styles.linkText}>{crossLinkLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function SourceBadge({ content }: { content: LegalContent | null }) {
  if (!content) return null;
  const label =
    content.source === 'network'
      ? 'Live · just updated'
      : content.source === 'cache'
      ? content.fetchedAt
        ? `Last synced ${new Date(content.fetchedAt).toLocaleDateString()}`
        : 'Cached copy'
      : 'Bundled with app';
  return <Text style={styles.lastUpdated} testID="legal-source-badge">{label}</Text>;
}

const markdownStyles = StyleSheet.create({
  body: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  heading1: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 12,
  },
  heading2: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
  },
  heading3: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
  },
  strong: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  em: {
    fontStyle: 'italic',
  },
  list_item: {
    marginBottom: 4,
  },
  bullet_list_icon: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  ordered_list_icon: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  link: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  hr: {
    backgroundColor: theme.colors.border ?? '#E5E7EB',
    height: 1,
    marginVertical: 16,
  },
  table: {
    borderWidth: 1,
    borderColor: theme.colors.border ?? '#E5E7EB',
    borderRadius: 8,
    marginBottom: 12,
  },
  thead: {
    backgroundColor: theme.colors.primary + '12',
  },
  th: {
    padding: 8,
    fontWeight: '700',
    color: theme.colors.text,
  },
  td: {
    padding: 8,
    color: theme.colors.textSecondary,
  },
  code_inline: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
    borderRadius: 4,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
  },
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
  brandingContainer: { flexDirection: 'row', alignItems: 'center' },
  scrollView: { flex: 1 },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardHeaderText: { flex: 1 },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  lastUpdated: { fontSize: 12, color: theme.colors.textSecondary },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary },
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
  linkContent: { flexDirection: 'row', alignItems: 'center' },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 12,
  },
  bottomSpacer: { height: 20 },
});
