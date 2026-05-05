import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme, { gradients } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { BACKEND_URL } from '../../utils/config';
import { HeaderBranding } from '../../components/BrandedGlobeIcon';
import UniversalHeader from '../../components/UniversalHeader';
import { getToken } from '../../utils/token';
interface Visit {
  visit_id: string;
  landmark_id: string;
  landmark_name: string;
  country_name?: string;
  visited_at: string;
  photo_url?: string;
  has_diary: boolean;
  points_earned: number;
  visibility: string;
}

export default function UserVisitsScreen() {
  const { user_id, user_name } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, gradientColors } = useTheme();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchVisits = async (skip = 0) => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/users/${user_id}/visits?skip=${skip}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (skip === 0) {
          setVisits(data.visits);
        } else {
          setVisits((prev) => [...prev, ...data.visits]);
        }
        setTotal(data.total);
      }
    } catch (e) {
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchVisits(); }, [user_id]);

  const loadMore = () => {
    if (visits.length < total && !loadingMore) {
      setLoadingMore(true);
      fetchVisits(visits.length);
    }
  };

  const VISIBILITY_ICONS: Record<string, { icon: string; color: string }> = {
    public: { icon: 'globe-outline', color: '#27ae60' },
    friends: { icon: 'people-outline', color: '#3498db' },
    private: { icon: 'lock-closed-outline', color: '#e74c3c' },
  };

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  const renderVisit = ({ item }: { item: Visit }) => {
    const vis = VISIBILITY_ICONS[item.visibility] || VISIBILITY_ICONS.public;
    return (
      <TouchableOpacity
        style={[styles.visitCard, { backgroundColor: colors.surface }]}
        onPress={() => router.push(`/visit-detail/${item.visit_id}`)}
        activeOpacity={0.7}
        testID={`user-visit-${item.visit_id}`}
      >
        {item.photo_url && (
          <View style={styles.photoContainer}>
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="image" size={24} color={colors.primary} />
            </View>
          </View>
        )}
        <View style={styles.visitInfo}>
          <Text style={[styles.visitLandmark, { color: colors.text }]} numberOfLines={1}>{item.landmark_name}</Text>
          <Text style={[styles.visitCountry, { color: colors.textSecondary }]}>{item.country_name}</Text>
          <View style={styles.visitMeta}>
            <Text style={[styles.visitDate, { color: colors.textLight }]}>
              {new Date(item.visited_at).toLocaleDateString()}
            </Text>
            {item.has_diary && <Ionicons name="journal" size={14} color={colors.primary} style={{ marginLeft: 8 }} />}
            <Ionicons name={vis.icon as any} size={14} color={vis.color} style={{ marginLeft: 8 }} />
          </View>
        </View>
        <View style={styles.pointsBadge}>
          <Text style={[styles.pointsText, { color: colors.primary }]}>+{item.points_earned}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID="user-visits-screen">
      <UniversalHeader
        title={`${user_name || 'User'}'s Visits`}
        subtitle={`${total} visits`}
        onBack={() => router.back()}
      />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(v) => v.visit_id}
          renderItem={renderVisit}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={48} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No visible visits</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 40 },
  visitCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14,
    marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  photoContainer: { marginRight: 12 },
  photoPlaceholder: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  visitInfo: { flex: 1 },
  visitLandmark: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  visitCountry: { fontSize: 13, marginBottom: 4 },
  visitMeta: { flexDirection: 'row', alignItems: 'center' },
  visitDate: { fontSize: 12 },
  pointsBadge: { marginLeft: 8 },
  pointsText: { fontSize: 14, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16 },
});
