import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, RefreshControl, ActivityIndicator,
  Animated, Platform, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import UniversalHeader from '../components/UniversalHeader';
import { getToken } from '../utils/token';
import { useAuth } from '../contexts/AuthContext';
import CommentsModal from '../components/CommentsModal';
import ReportModal from '../components/ReportModal';

const algorithmExplanation =
  'A rotating spotlight picked by our community algorithm — based on likes and how fresh the photo is. A new highlight is chosen every time you open the app.';

export default function CommunityHighlightsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [highlight, setHighlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Parallax scroll
  const scrollY = useRef(new Animated.Value(0)).current;

  // Like button spring animation
  const likeScale = useRef(new Animated.Value(1)).current;
  const bumpLike = () => {
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.25, useNativeDriver: true, speed: 40, bounciness: 14 }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
    ]).start();
  };

  const load = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/community-highlight`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setHighlight(data.highlight || null);
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

  const handleLike = async () => {
    if (!highlight?.activity_id) return;
    bumpLike();
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const token = await getToken();
      const method = highlight.is_liked ? 'DELETE' : 'POST';
      const response = await fetch(`${BACKEND_URL}/api/activities/${highlight.activity_id}/like`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setHighlight((prev: any) => ({
          ...prev,
          is_liked: !prev.is_liked,
          likes_count: prev.likes_count + (prev.is_liked ? -1 : 1),
        }));
      }
    } catch {}
  };

  const openComments = () => {
    if (!highlight?.activity_id) return;
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    setCommentsOpen(true);
  };

  const goToVisit = () => {
    if (!highlight) return;
    if (highlight.source === 'landmark') {
      router.push(`/visit-detail/${highlight.visit_id}`);
    } else {
      router.push(`/country-visit-detail/${highlight.visit_id}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="Community highlight" showBack />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!highlight) {
    return (
      <View style={styles.container}>
        <UniversalHeader title="Community highlight" showBack />
        <View style={styles.empty}>
          <Ionicons name="sparkles-outline" size={48} color={theme.colors.textLight} />
          <Text style={styles.emptyTitle}>No highlight yet</Text>
          <Text style={styles.emptyText}>Visit landmarks and share photos to help us build this community spotlight.</Text>
        </View>
      </View>
    );
  }

  // Parallax: image scales up and shifts down on overscroll/pull
  const heroScale = scrollY.interpolate({
    inputRange: [-200, 0, 300],
    outputRange: [1.25, 1, 1],
    extrapolate: 'clamp',
  });
  const heroTranslate = scrollY.interpolate({
    inputRange: [-200, 0, 300],
    outputRange: [-60, 0, 90],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <UniversalHeader title="Community highlight" showBack />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ paddingBottom: 56 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero image — Window Card DNA + parallax + matte frame */}
        <TouchableOpacity activeOpacity={0.95} onPress={goToVisit} data-testid="highlight-hero-image">
          <View style={styles.heroWrap}>
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                { transform: [{ scale: heroScale }, { translateY: heroTranslate }] },
              ]}
            >
              <Image source={{ uri: highlight.photo_url }} style={styles.hero} resizeMode="cover" />
            </Animated.View>

            {/* Matte inner frame — penthouse window edge */}
            <View pointerEvents="none" style={styles.heroInnerFrame} />

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.92)']}
              locations={[0, 0.5, 1]}
              style={styles.heroGradient}
            >
              <View style={styles.badgeRow}>
                <View style={styles.featuredBadge}>
                  <Ionicons name="sparkles" size={12} color="#FFF" />
                  <Text style={styles.featuredBadgeText}>Featured</Text>
                </View>
                {highlight.source === 'custom' && (
                  <View style={styles.customBadge}>
                    <Ionicons name="compass" size={11} color="#FFF" />
                    <Text style={styles.customBadgeText}>Custom trip</Text>
                  </View>
                )}
              </View>
              <Text style={styles.landmark} numberOfLines={2}>
                {highlight.landmark_name || 'Unknown place'}
              </Text>
              {highlight.country_name && (
                <Text style={styles.country}>{highlight.country_name}</Text>
              )}
            </LinearGradient>
          </View>
        </TouchableOpacity>

        {/* Floating glass action bar */}
        <View style={styles.glassActionBarWrap}>
          <View style={styles.glassActionBar}>
            <Pressable
              onPress={handleLike}
              disabled={!highlight.activity_id}
              style={({ pressed }) => [styles.glassPill, pressed && styles.glassPillPressed]}
              data-testid="highlight-like-btn"
            >
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons
                  name={highlight.is_liked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={highlight.is_liked ? '#FF4B6E' : theme.colors.text}
                />
              </Animated.View>
              <Text style={[styles.glassPillText, highlight.is_liked && { color: '#FF4B6E' }]}>
                {highlight.likes_count}
              </Text>
            </Pressable>

            <View style={styles.pillDivider} />

            <Pressable
              onPress={openComments}
              disabled={!highlight.activity_id}
              style={({ pressed }) => [styles.glassPill, pressed && styles.glassPillPressed]}
              data-testid="highlight-comment-btn"
            >
              <Ionicons name="chatbubble-outline" size={18} color={theme.colors.text} />
              <Text style={styles.glassPillText}>{highlight.comments_count}</Text>
            </Pressable>

            <View style={styles.pillDivider} />

            <Pressable
              onPress={() => {
                if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
                setReportOpen(true);
              }}
              style={({ pressed }) => [styles.glassPillIcon, pressed && styles.glassPillPressed]}
              data-testid="highlight-report-btn"
            >
              <Ionicons name="flag-outline" size={17} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        </View>

      <TouchableOpacity
        style={styles.userRow}
        onPress={() => highlight.user_id && router.push(`/user-profile/${highlight.user_id}`)}
        activeOpacity={0.85}
        data-testid="highlight-user-row"
      >
          {highlight.user_picture ? (
            <View style={styles.avatarGlowWrap}>
              <Image source={{ uri: highlight.user_picture }} style={styles.userAvatar} />
            </View>
          ) : (
            <View style={styles.avatarGlowWrap}>
              <View style={[styles.userAvatar, styles.userAvatarFallback]}>
                <Ionicons name="person" size={22} color="#FFF" />
              </View>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userLabel}>Shared by</Text>
            <Text style={styles.userName}>{highlight.user_name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textLight} />
        </TouchableOpacity>

        {/* Why this? */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.infoTitle}>Why this photo?</Text>
          </View>
          <Text style={styles.infoText}>{algorithmExplanation}</Text>
        </View>

        {/* Top 10 link — subtle, discoverable */}
        <TouchableOpacity
          style={styles.top10Link}
          onPress={() => router.push('/community-highlights/top')}
          activeOpacity={0.85}
          data-testid="view-top-10-link"
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accentSand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.top10Icon}
          >
            <Ionicons name="trophy" size={20} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.top10Title}>Curious about the all-time greats?</Text>
            <Text style={styles.top10Sub}>See the top 10 most liked community photos →</Text>
          </View>
        </TouchableOpacity>
      </Animated.ScrollView>

      <CommentsModal
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        activityId={highlight?.activity_id || null}
        commentsCount={highlight?.comments_count || 0}
        currentUserId={user?.user_id || ''}
        onCommentsChange={(n) => setHighlight((prev: any) => ({ ...prev, comments_count: n }))}
      />

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        reportType="photo"
        targetId={highlight?.visit_id || ''}
        targetName={highlight?.landmark_name || 'Community photo'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },

  // Hero — Window Card DNA
  heroWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 24,
    overflow: 'hidden',
    aspectRatio: 0.8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
  hero: { width: '100%', height: '100%' },
  heroInnerFrame: {
    position: 'absolute',
    top: 4, left: 4, right: 4, bottom: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    zIndex: 1,
  },
  heroGradient: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    justifyContent: 'flex-end',
    padding: 22,
    zIndex: 2,
  },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  featuredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
  },
  featuredBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  customBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(201, 169, 97, 0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
  },
  customBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  landmark: { color: '#FFF', fontSize: 30, fontWeight: '700', letterSpacing: -0.5, lineHeight: 34 },
  country: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 4, fontWeight: '500' },

  // Floating glass action bar
  glassActionBarWrap: {
    marginHorizontal: 16,
    marginTop: -22, // float over the hero
    alignItems: 'center',
    zIndex: 10,
  },
  glassActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(232, 220, 200, 0.6)',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
  },
  glassPillIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 100,
  },
  glassPillPressed: {
    backgroundColor: 'rgba(232, 220, 200, 0.35)',
  },
  glassPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  pillDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(232, 220, 200, 0.6)',
  },

  // User row — Window Card DNA
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16, marginTop: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    ...theme.shadows.card,
  },
  avatarGlowWrap: {
    shadowColor: theme.colors.accentSand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 3,
  },
  userAvatar: { width: 44, height: 44, borderRadius: 22 },
  userAvatarFallback: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  userLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  userName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginTop: 2 },

  // Info
  infoCard: {
    backgroundColor: theme.colors.surfaceTinted,
    marginHorizontal: 16, marginTop: 16,
    padding: 14, borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  infoText: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },

  // Top 10
  top10Link: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: theme.colors.surface,
    padding: 16, borderRadius: 18,
    borderWidth: 1, borderColor: theme.colors.borderSand,
    ...theme.shadows.card,
  },
  top10Icon: {
    width: 42, height: 42,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  top10Title: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  top10Sub: { fontSize: 12, color: theme.colors.primary, marginTop: 2, fontWeight: '600' },
});
