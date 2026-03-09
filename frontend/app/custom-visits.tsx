import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Platform, Alert } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL } from '../utils/config';
import { useAuth } from '../contexts/AuthContext';
import theme from '../styles/theme';
import { HeaderBranding } from '../components/BrandedGlobeIcon';
import AddUserCreatedVisitModal from '../components/AddUserCreatedVisitModal';
import { ProFeatureLock } from '../components/ProFeatureLock';

const { colors } = theme;

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem('auth_token');
  return await SecureStore.getItemAsync('auth_token');
};

interface UserCreatedVisit {
  user_created_visit_id: string;
  country_name: string;
  landmarks?: any[];
  photos?: string[];
  diary?: string;
  visited_at: string;
}

export default function CustomVisitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [visits, setVisits] = useState<UserCreatedVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showProLock, setShowProLock] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const fetchData = async () => {
    try {
      const token = await getToken();
      const [visitsRes, subRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/user-created-visits`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/subscription/status`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (visitsRes.ok) setVisits(await visitsRes.json());
      if (subRes.ok) {
        const sub = await subRes.json();
        setIsPro(sub.tier === 'pro' || sub.tier === 'basic_plus');
      }
    } catch (e) {
      console.error('Error fetching custom visits:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const renderVisit = ({ item }: { item: UserCreatedVisit }) => {
    const landmarkNames = item.landmarks?.map(lm => typeof lm === 'string' ? lm : lm.name).filter(Boolean) || [];
    const hasLandmarks = landmarkNames.length > 0;
    const landmarkPhotos = item.landmarks?.filter(lm => typeof lm === 'object' && lm.photo).length || 0;
    const totalPhotos = (item.photos?.length || 0) + landmarkPhotos;

    let title = item.country_name;
    let subtitle = '';
    if (hasLandmarks) {
      if (landmarkNames.length === 1) {
        title = landmarkNames[0];
        subtitle = item.country_name;
      } else {
        title = `${landmarkNames.length} places in ${item.country_name}`;
        subtitle = landmarkNames.slice(0, 3).join(', ') + (landmarkNames.length > 3 ? '...' : '');
      }
    }

    return (
      <TouchableOpacity
        style={styles.visitItem}
        onPress={() => router.push(`/custom-visit-detail/${item.user_created_visit_id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.visitIcon}>
          <Ionicons name={hasLandmarks ? "location" : "flag"} size={20} color={colors.accentTeal} />
        </View>
        <View style={styles.visitInfo}>
          <Text style={styles.visitName} numberOfLines={1}>{title}</Text>
          <Text style={styles.visitSubtext} numberOfLines={1}>
            {subtitle ? `${subtitle} · ` : ''}
            {new Date(item.visited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.visitMeta}>
          {totalPhotos > 0 && (
            <View style={styles.photoBadge}>
              <Ionicons name="images-outline" size={14} color={colors.textLight} />
              <Text style={styles.photoCount}>{totalPhotos}</Text>
            </View>
          )}
          {item.diary ? <Ionicons name="book-outline" size={14} color={colors.textLight} style={{ marginRight: 8 }} /> : null}
          <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#4DB8D8', '#1E8A8A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Custom Visits</Text>
          <HeaderBranding />
        </View>
      </LinearGradient>

      <FlatList
        data={visits}
        keyExtractor={item => item.user_created_visit_id}
        renderItem={renderVisit}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listDescription}>
              Record visits to places not in our database
            </Text>
            <Text style={styles.visitCount}>{visits.length} custom visit{visits.length !== 1 ? 's' : ''}</Text>
          </View>
        }
        ListEmptyComponent={
          <Surface style={styles.emptyCard}>
            <Ionicons name="airplane-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No custom visits yet</Text>
            <Text style={styles.emptySubtext}>Record visits to any destination worldwide</Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => isPro ? setShowModal(true) : setShowProLock(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Add Your First Visit</Text>
            </TouchableOpacity>
          </Surface>
        }
        ListFooterComponent={
          visits.length > 0 ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => isPro ? setShowModal(true) : setShowProLock(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Add Custom Visit</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <AddUserCreatedVisitModal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
        onSuccess={() => { setShowModal(false); fetchData(); }}
      />

      <ProFeatureLock
        visible={showProLock}
        onDismiss={() => setShowProLock(false)}
        feature="custom_visits"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  listContent: { padding: 16 },
  listHeader: { marginBottom: 16 },
  listDescription: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  visitCount: { fontSize: 13, color: colors.textLight, fontWeight: '600' },
  visitItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  visitIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentTeal + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  visitInfo: { flex: 1 },
  visitName: { fontSize: 15, fontWeight: '600', color: colors.text },
  visitSubtext: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  visitMeta: { flexDirection: 'row', alignItems: 'center' },
  photoBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginRight: 8, backgroundColor: colors.surfaceTinted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  photoCount: { fontSize: 12, color: colors.textLight },
  emptyCard: { alignItems: 'center', padding: 32, borderRadius: 16, marginTop: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: colors.textLight, marginTop: 4, textAlign: 'center' },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accentTeal, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  emptyAddBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentTeal, paddingVertical: 14, borderRadius: 12, marginTop: 20 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
