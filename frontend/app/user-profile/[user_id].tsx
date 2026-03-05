import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Alert, StatusBar, Share } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import { useAuth } from '../../contexts/AuthContext';
import RankBadge from '../../components/RankBadge';
import { getUserRank } from '../../utils/rankSystem';
import { DefaultAvatar } from '../../components/DefaultAvatar';
import { PersistentTabBar } from '../../components/PersistentTabBar';
import ReportButton from '../../components/ReportButton';
import { shareProfile } from '../../utils/shareUtils';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem('auth_token');
  return await SecureStore.getItemAsync('auth_token');
};

interface UserProfile {
  user_id: string;
  name: string;
  username?: string;
  picture?: string;
  bio?: string;
  location?: string;
  is_premium: boolean;
  points: number;
  leaderboard_points: number;
  friendship_status: 'none' | 'friends' | 'pending_sent' | 'pending_received';
  friendship_id?: string;
  is_own_profile: boolean;
  stats: { total_visits: number; countries_visited: number; continents_visited: number; friends_count: number };
  recent_visits: { visit_id: string; landmark_id: string; landmark_name: string; visited_at: string; photo_url?: string }[];
}

export default function UserProfileScreen() {
  const { user_id } = useLocalSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 24);

  useEffect(() => { loadProfile(); }, [user_id]);
  useEffect(() => { if (profile) loadActivity(); }, [profile]);

  const loadProfile = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/users/${user_id}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProfile(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadActivity = async () => {
    setActivitiesLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/users/${user_id}/activity?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (e) {
      console.error('Error loading activity:', e);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    await shareProfile(
      profile.name,
      profile.stats.total_visits,
      profile.stats.countries_visited,
      profile.points || 0
    );
  };

  const handleFriendAction = async () => {
    if (!profile) return;
    setActionLoading(true);
    const token = await getToken();
    try {
      if (profile.friendship_status === 'none') {
        const res = await fetch(`${BACKEND_URL}/api/friends/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ friend_username: profile.username }),
        });
        if (res.ok) { Alert.alert('Sent!', 'Friend request sent'); loadProfile(); }
        else { const e = await res.json(); Alert.alert('Error', e.detail); }
      } else if (profile.friendship_status === 'pending_received') {
        const res = await fetch(`${BACKEND_URL}/api/friends/${profile.friendship_id}/accept`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) { Alert.alert('Accepted!', 'You are now friends'); loadProfile(); }
      } else if (profile.friendship_status === 'friends') {
        Alert.alert('Remove Friend', `Remove ${profile.name} as friend?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: async () => {
            await fetch(`${BACKEND_URL}/api/friends/${profile.friendship_id}`, {
              method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
            });
            loadProfile();
          }},
        ]);
      }
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const friendButtonLabel = () => {
    if (!profile) return '';
    switch (profile.friendship_status) {
      case 'none': return 'Add Friend';
      case 'pending_sent': return 'Request Sent';
      case 'pending_received': return 'Accept Request';
      case 'friends': return 'Friends';
    }
  };

  const friendButtonIcon = (): any => {
    if (!profile) return 'person-add';
    switch (profile.friendship_status) {
      case 'none': return 'person-add-outline';
      case 'pending_sent': return 'time-outline';
      case 'pending_received': return 'checkmark-circle-outline';
      case 'friends': return 'people';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.center}>
          <Ionicons name="person-outline" size={48} color={theme.colors.textLight} />
          <Text style={styles.emptyText}>User not found</Text>
        </View>
      </View>
    );
  }

  const rank = getUserRank(profile.points || 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} data-testid="profile-back-btn">
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar + Name */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            {profile.picture ? (
              <Image source={{ uri: profile.picture }} style={styles.avatar} />
            ) : (
              <DefaultAvatar name={profile.name} size={80} />
            )}
            <View style={styles.nameCol}>
              <View style={styles.nameRow}>
                <Text style={styles.name} data-testid="profile-name">{profile.name}</Text>
                {profile.is_premium && <Ionicons name="diamond" size={16} color="#1E8A8A" />}
              </View>
              {profile.username && <Text style={styles.username}>@{profile.username}</Text>}
              {profile.bio && <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>}
              {profile.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.location}>{profile.location}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Rank */}
          <View style={styles.rankRow}>
            <RankBadge rank={rank} size="medium" />
            <Text style={styles.pointsText}>{profile.points?.toLocaleString() || 0} points</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow} data-testid="profile-stats">
          {[
            { label: 'Visits', value: profile.stats.total_visits, icon: 'pin' },
            { label: 'Countries', value: profile.stats.countries_visited, icon: 'flag' },
            { label: 'Continents', value: profile.stats.continents_visited, icon: 'earth' },
            { label: 'Friends', value: profile.stats.friends_count, icon: 'people' },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Ionicons name={s.icon as any} size={18} color={theme.colors.primary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        {!profile.is_own_profile && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                profile.friendship_status === 'friends' && styles.actionBtnFriends,
                profile.friendship_status === 'pending_sent' && styles.actionBtnPending,
              ]}
              onPress={handleFriendAction}
              disabled={actionLoading || profile.friendship_status === 'pending_sent'}
              data-testid="friend-action-btn"
            >
              <Ionicons name={friendButtonIcon()} size={18} color={
                profile.friendship_status === 'friends' ? theme.colors.primary : '#fff'
              } />
              <Text style={[
                styles.actionBtnText,
                profile.friendship_status === 'friends' && styles.actionBtnTextFriends,
              ]}>{friendButtonLabel()}</Text>
            </TouchableOpacity>

            {profile.friendship_status === 'friends' && (
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => router.push(`/messages/${profile.user_id}?name=${encodeURIComponent(profile.name)}`)}
                data-testid="message-btn"
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                <Text style={styles.messageBtnText}>Message</Text>
              </TouchableOpacity>
            )}
            <ReportButton contentType="user" contentId={profile.user_id} size={18} color={theme.colors.textLight} />
            <TouchableOpacity onPress={handleShareProfile} style={{ padding: 4 }} data-testid="share-profile-btn">
              <Ionicons name="share-outline" size={18} color={theme.colors.textLight} />
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Visits */}
        {profile.recent_visits.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Recent Visits</Text>
              <TouchableOpacity
                onPress={() => router.push(`/user-visits/${profile.user_id}?user_name=${encodeURIComponent(profile.name)}`)}
                data-testid="view-all-visits-btn"
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.primary }}>View All</Text>
              </TouchableOpacity>
            </View>
            {profile.recent_visits.map((v: any) => (
              <TouchableOpacity
                key={v.visit_id}
                style={styles.visitCard}
                onPress={() => router.push(`/visit-detail/${v.visit_id}`)}
                data-testid={`visit-${v.visit_id}`}
              >
                {v.photo_url ? (
                  <Image source={{ uri: v.photo_url }} style={styles.visitThumb} />
                ) : (
                  <View style={[styles.visitThumb, styles.visitThumbPlaceholder]}>
                    <Ionicons name="image-outline" size={20} color={theme.colors.textLight} />
                  </View>
                )}
                <View style={styles.visitInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.visitName} numberOfLines={1}>{v.landmark_name}</Text>
                    {v.has_diary && <Ionicons name="journal" size={14} color={theme.colors.primary} />}
                  </View>
                  <Text style={styles.visitDate}>
                    {v.country_name ? `${v.country_name} · ` : ''}{v.visited_at ? new Date(v.visited_at).toLocaleDateString() : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Activity Stream */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {activitiesLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 16 }} />
          ) : activities.length > 0 ? (
            activities.map((act: any) => (
              <View key={act.activity_id} style={styles.activityCard} data-testid={`activity-${act.activity_id}`}>
                <View style={styles.activityIconCol}>
                  <View style={[styles.activityDot, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Ionicons
                      name={act.activity_type === 'visit' ? 'location' : act.activity_type === 'country_visit' ? 'flag' : 'star'}
                      size={16} color={theme.colors.primary}
                    />
                  </View>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityDesc} numberOfLines={2}>{act.description}</Text>
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityDate}>
                      {act.created_at ? new Date(act.created_at).toLocaleDateString() : ''}
                    </Text>
                    {act.has_diary && <Ionicons name="journal" size={12} color={theme.colors.primary} style={{ marginLeft: 6 }} />}
                    {act.has_photos && <Ionicons name="camera" size={12} color={theme.colors.textSecondary} style={{ marginLeft: 6 }} />}
                    <View style={styles.activityStats}>
                      <Ionicons name="heart" size={12} color={act.is_liked ? '#e74c3c' : theme.colors.textLight} />
                      <Text style={styles.activityStatNum}>{act.like_count || 0}</Text>
                      <Ionicons name="chatbubble-outline" size={12} color={theme.colors.textLight} style={{ marginLeft: 6 }} />
                      <Text style={styles.activityStatNum}>{act.comments_count || 0}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 20 }}>
              No visible activity yet
            </Text>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      <PersistentTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { padding: 16 },
  profileCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginRight: 16 },
  nameCol: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  username: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  bio: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6, lineHeight: 18 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  location: { fontSize: 13, color: theme.colors.textSecondary },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  pointsText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, justifyContent: 'space-around', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statBox: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 14 },
  actionBtnFriends: { backgroundColor: `${theme.colors.primary}15`, borderWidth: 1.5, borderColor: theme.colors.primary },
  actionBtnPending: { backgroundColor: theme.colors.textLight, opacity: 0.7 },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  actionBtnTextFriends: { color: theme.colors.primary },
  messageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.secondary || '#2AA8B3', paddingVertical: 12, borderRadius: 14 },
  messageBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  visitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  visitThumb: { width: 48, height: 48, borderRadius: 10, marginRight: 12 },
  visitThumbPlaceholder: { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  visitInfo: { flex: 1 },
  visitName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  visitDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  activityCard: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  activityIconCol: { marginRight: 12, paddingTop: 2 },
  activityDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  activityContent: { flex: 1 },
  activityDesc: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  activityMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  activityDate: { fontSize: 12, color: theme.colors.textSecondary },
  activityStats: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  activityStatNum: { fontSize: 12, color: theme.colors.textLight, marginLeft: 3 },
});
