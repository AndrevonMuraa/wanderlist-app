import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Alert, StatusBar } from 'react-native';
import { Text, ActivityIndicator, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme, { gradients } from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import { useAuth } from '../../contexts/AuthContext';
import RankBadge from '../../components/RankBadge';
import { getUserRank } from '../../utils/rankSystem';
import { DefaultAvatar } from '../../components/DefaultAvatar';
import { PersistentTabBar } from '../../components/PersistentTabBar';
import ReportButton from '../../components/ReportButton';
import { getToken } from '../utils/token';
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
  destinations_explored?: { country_id: string; country_name: string; landmarks_visited: number }[];
}

export default function UserProfileScreen() {
  const { user_id } = useLocalSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 24);

  useEffect(() => { loadProfile(); }, [user_id]);

  const loadProfile = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/users/${user_id}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProfile(await res.json());
    } catch (e) { }
    finally { setLoading(false); }
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
    } catch (e) { }
    finally { setActionLoading(false); }
  };

  const friendButtonConfig = () => {
    if (!profile) return { label: '', icon: 'person-add' as any, style: 'primary' };
    switch (profile.friendship_status) {
      case 'none': return { label: 'Add Friend', icon: 'person-add-outline' as any, style: 'primary' };
      case 'pending_sent': return { label: 'Request Sent', icon: 'time-outline' as any, style: 'pending' };
      case 'pending_received': return { label: 'Accept Request', icon: 'checkmark-circle-outline' as any, style: 'accept' };
      case 'friends': return { label: 'Friends', icon: 'people' as any, style: 'friends' };
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

  const rank = getUserRank(profile.leaderboard_points || 0);
  const btn = friendButtonConfig();

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
        <Text style={styles.headerTitle}>{profile.name}</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Surface style={styles.profileCard}>
          <View style={styles.avatarRow}>
            {profile.picture ? (
              <Image source={{ uri: profile.picture }} style={styles.avatar} />
            ) : (
              <DefaultAvatar name={profile.name} size={72} />
            )}
            <View style={styles.nameCol}>
              <Text style={styles.name} data-testid="profile-name">{profile.name}</Text>
              {profile.username && <Text style={styles.username}>@{profile.username}</Text>}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                {profile.is_premium && (
                  <View style={styles.proBadge}>
                    <Ionicons name="diamond" size={12} color="#1E8A8A" />
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => router.push('/ranks')} activeOpacity={0.7}>
                  <View style={[styles.rankPill, { backgroundColor: rank.color + '15' }]}>
                    <View style={{ width: 18, height: 18 }}>
                      <RankBadge rank={rank} size="tiny" />
                    </View>
                    <Text style={[styles.rankPillText, { color: rank.color }]}>{rank.name}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          {profile.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.location}>{profile.location}</Text>
            </View>
          )}
        </Surface>

        {/* Stats */}
        <Surface style={styles.statsCard} data-testid="profile-stats">
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="location" size={20} color="#E87850" />
              <Text style={styles.statValue}>{profile.stats.total_visits}</Text>
              <Text style={styles.statLabel}>Landmarks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="flag" size={20} color="#4DB8D8" />
              <Text style={styles.statValue}>{profile.stats.countries_visited}</Text>
              <Text style={styles.statLabel}>Destinations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="earth" size={20} color="#4CAF50" />
              <Text style={styles.statValue}>{profile.stats.continents_visited}</Text>
              <Text style={styles.statLabel}>Continents</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.statValue}>{(profile.points || 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
        </Surface>

        {/* Actions */}
        {!profile.is_own_profile && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                btn.style === 'friends' && styles.actionBtnFriends,
                btn.style === 'pending' && styles.actionBtnPending,
                btn.style === 'accept' && styles.actionBtnAccept,
              ]}
              onPress={handleFriendAction}
              disabled={actionLoading || profile.friendship_status === 'pending_sent'}
              data-testid="friend-action-btn"
            >
              <Ionicons name={btn.icon} size={18} color={btn.style === 'friends' ? theme.colors.primary : '#fff'} />
              <Text style={[styles.actionBtnText, btn.style === 'friends' && { color: theme.colors.primary }]}>
                {btn.label}
              </Text>
            </TouchableOpacity>

            {profile.friendship_status === 'friends' && (
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => router.push(`/messages/${profile.user_id}?name=${encodeURIComponent(profile.name)}`)}
                data-testid="message-btn"
              >
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}
            <ReportButton contentType="user" contentId={profile.user_id} size={18} color={theme.colors.textLight} />
          </View>
        )}

        {/* Destinations Explored */}
        {(profile.destinations_explored || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Destinations Explored</Text>
            {(profile.destinations_explored || []).map((d: any) => (
              <TouchableOpacity
                key={d.country_id}
                style={styles.destCard}
                onPress={() => router.push(`/landmarks/${d.country_id}?name=${encodeURIComponent(d.country_name)}`)}
                activeOpacity={0.7}
              >
                <View style={styles.destIconWrap}>
                  <Ionicons name="flag" size={18} color="#4DB8D8" />
                </View>
                <View style={styles.destInfo}>
                  <Text style={styles.destName}>{d.country_name}</Text>
                  {d.landmarks_visited > 0 && (
                    <Text style={styles.destMeta}>{d.landmarks_visited} landmark{d.landmarks_visited !== 1 ? 's' : ''} visited</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        )}

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
  profileCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, marginRight: 16 },
  nameCol: { flex: 1 },
  name: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  username: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 1 },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1E8A8A15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  proBadgeText: { fontSize: 11, fontWeight: '700', color: '#1E8A8A' },
  rankPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  rankPillText: { fontSize: 11, fontWeight: '700' },
  bio: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 12, lineHeight: 18 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  location: { fontSize: 12, color: theme.colors.textSecondary },
  statsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 17, fontWeight: '800', color: theme.colors.text, marginTop: 4 },
  statLabel: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '500', marginTop: 1 },
  statDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 14,
  },
  actionBtnFriends: { backgroundColor: theme.colors.primary + '15', borderWidth: 1.5, borderColor: theme.colors.primary },
  actionBtnPending: { backgroundColor: theme.colors.textLight, opacity: 0.7 },
  actionBtnAccept: { backgroundColor: '#4CAF50' },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  messageBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#2AA8B3', justifyContent: 'center', alignItems: 'center',
  },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 10 },
  destCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface, padding: 12, borderRadius: 14, marginBottom: 8,
    ...theme.shadows.sm,
  },
  destIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#E0F4F4',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  destInfo: { flex: 1 },
  destName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  destMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
});
