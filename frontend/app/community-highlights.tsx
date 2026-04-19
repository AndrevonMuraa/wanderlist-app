import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import UniversalHeader from '../components/UniversalHeader';
import { getToken } from '../utils/token';
import { useAuth } from '../contexts/AuthContext';
import CommentsModal from '../components/CommentsModal';

const algorithmExplanation =
  'A rotating spotlight picked by our community algorithm — based on likes and how fresh the photo is. A new highlight is chosen every time you open the app.';

export default function CommunityHighlightsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [highlight, setHighlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

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

  return (
    <View style={styles.container}>
      <UniversalHeader title="Community highlight" showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* Hero image */}
        <TouchableOpacity activeOpacity={0.95} onPress={goToVisit} data-testid="highlight-hero-image">
          <View style={styles.heroWrap}>
            <Image source={{ uri: highlight.photo_url }} style={styles.hero} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.95)']}
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

        {/* User row */}
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => highlight.user_id && router.push(`/user-profile/${highlight.user_id}`)}
          activeOpacity={0.8}
          data-testid="highlight-user-row"
        >
          {highlight.user_picture ? (
            <Image source={{ uri: highlight.user_picture }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, styles.userAvatarFallback]}>
              <Ionicons name="person" size={22} color="#FFF" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userLabel}>Shared by</Text>
            <Text style={styles.userName}>{highlight.user_name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textLight} />
        </TouchableOpacity>

        {/* Actions bar */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={[styles.actionBtn, highlight.is_liked && styles.actionBtnActive]}
            onPress={handleLike}
            disabled={!highlight.activity_id}
            data-testid="highlight-like-btn"
          >
            <Ionicons name={highlight.is_liked ? 'heart' : 'heart-outline'} size={22} color={highlight.is_liked ? '#FF4B6E' : theme.colors.text} />
            <Text style={[styles.actionLabel, highlight.is_liked && { color: '#FF4B6E' }]}>
              {highlight.likes_count} {highlight.likes_count === 1 ? 'like' : 'likes'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => highlight.activity_id && setCommentsOpen(true)}
            disabled={!highlight.activity_id}
            data-testid="highlight-comment-btn"
          >
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.text} />
            <Text style={styles.actionLabel}>
              {highlight.comments_count} {highlight.comments_count === 1 ? 'comment' : 'comments'}
            </Text>
          </TouchableOpacity>
        </View>

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
          activeOpacity={0.7}
          data-testid="view-top-10-link"
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.top10Title}>Curious about the all-time greats?</Text>
            <Text style={styles.top10Sub}>See the top 10 most liked community photos →</Text>
          </View>
          <Ionicons name="trophy" size={24} color={theme.colors.accent} />
        </TouchableOpacity>
      </ScrollView>

      <CommentsModal
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        activityId={highlight?.activity_id || null}
        commentsCount={highlight?.comments_count || 0}
        currentUserId={user?.user_id || ''}
        onCommentsChange={(n) => setHighlight((prev: any) => ({ ...prev, comments_count: n }))}
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

  heroWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    aspectRatio: 0.8,
    backgroundColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  hero: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    justifyContent: 'flex-end',
    padding: 20,
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
  country: { color: 'rgba(255,255,255,0.82)', fontSize: 15, marginTop: 4, fontWeight: '500' },

  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.surface, marginHorizontal: 16, marginTop: 16,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    ...theme.shadows?.card,
  },
  userAvatar: { width: 42, height: 42, borderRadius: 21 },
  userAvatarFallback: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  userLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  userName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginTop: 2 },

  actionsBar: {
    flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 12,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: theme.colors.surface,
    ...theme.shadows?.card,
  },
  actionBtnActive: { backgroundColor: '#FFF0F3' },
  actionLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },

  infoCard: {
    backgroundColor: theme.colors.surfaceTinted, marginHorizontal: 16, marginTop: 20,
    padding: 14, borderRadius: 12,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  infoText: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },

  top10Link: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: theme.colors.surface, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  top10Title: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  top10Sub: { fontSize: 12, color: theme.colors.primary, marginTop: 2, fontWeight: '600' },
});
