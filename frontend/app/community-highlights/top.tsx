import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import UniversalHeader from '../../components/UniversalHeader';
import { getToken } from '../../utils/token';
import MediaCard from '../../components/MediaCard';
import ReportModal from '../../components/ReportModal';
import ShareTopMonthCard from '../../components/ShareTopMonthCard';

const { width } = Dimensions.get('window');
const COLS = 2;
const GRID_GAP = 12;
const CARD_WIDTH = (width - 16 * 2 - GRID_GAP) / COLS;

export default function CommunityHighlightsTopScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const load = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/community-highlights/top?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, []);

  const goToVisit = (item: any) => {
    if (item.source === 'landmark') {
      router.push(`/visit-detail/${item.visit_id}`);
    } else {
      router.push(`/country-visit-detail/${item.visit_id}`);
    }
  };

  const handleLongPress = (item: any) => {
    Alert.alert(
      'Report this photo?',
      `You're about to report the photo from ${item.landmark_name || 'this place'}. Our team will review it within 24-48 hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => setReportTarget({
            id: item.visit_id,
            name: item.landmark_name || 'Community photo',
          }),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <UniversalHeader title="Top 10 all-time" showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <Text style={styles.intro}>
          The community's most-loved photos, ranked purely by all-time likes.
        </Text>

        {/* Share monthly card CTA */}
        <TouchableOpacity
          style={styles.shareMonthBtn}
          onPress={() => setShareOpen(true)}
          activeOpacity={0.88}
          data-testid="share-top-month-cta"
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accentSand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareMonthIcon}
          >
            <Ionicons name="share-social" size={18} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareMonthTitle}>Share Top 10 of the month</Text>
            <Text style={styles.shareMonthSub}>
              Post the monthly leaderboard to Instagram, TikTok & more
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={48} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>As the community shares more photos, the best ones will rise to the top.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map((item) => (
              <MediaCard
                key={`${item.source}-${item.visit_id}`}
                photoUrl={item.photo_url}
                title={item.landmark_name || 'Unknown place'}
                subtitle={item.country_name}
                userName={item.user_name}
                userPicture={item.user_picture}
                isCustom={item.source === 'custom'}
                likesCount={item.likes_count}
                commentsCount={item.comments_count}
                rankBadge={item.rank}
                onPress={() => goToVisit(item)}
                onLongPress={() => handleLongPress(item)}
                width={CARD_WIDTH}
                aspect={1.2}
                testID={`top-item-${item.rank}`}
              />
            ))}
          </View>
        )}

        <Text style={styles.footerHint}>
          Tip: long-press a card to report inappropriate content.
        </Text>
      </ScrollView>

      <ReportModal
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        reportType="photo"
        targetId={reportTarget?.id || ''}
        targetName={reportTarget?.name || 'Community photo'}
      />

      <ShareTopMonthCard
        visible={shareOpen}
        onDismiss={() => setShareOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  intro: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  footerHint: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textLight,
    fontStyle: 'italic',
  },
  shareMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginBottom: 18,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  shareMonthIcon: {
    width: 42, height: 42,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  shareMonthTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.2 },
  shareMonthSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, fontWeight: '500' },
});
