import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';

interface Friend {
  user_id: string;
  name?: string;
  username?: string;
  picture?: string;
}

interface Props {
  friends: Friend[];
  loading?: boolean;
  pendingCount?: number;
  selectedIds?: string[];
  onToggleSelect?: (userId: string) => void;
}

/**
 * "Your crew" — horizontal carousel of friend avatars. In select mode
 * (selectedIds provided), tap toggles selection instead of navigating.
 */
export default function FriendsCrew({ friends, loading, pendingCount = 0, selectedIds, onToggleSelect }: Props) {
  const router = useRouter();
  const selectMode = !!onToggleSelect;

  if (loading) {
    return <View style={styles.card}><ActivityIndicator color={theme.colors.primary} /></View>;
  }
  if (friends.length === 0) return null;

  return (
    <View style={styles.card} testID="friends-crew">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your crew</Text>
        <Text style={styles.count}>{friends.length} {friends.length === 1 ? 'friend' : 'friends'}</Text>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{pendingCount} new</Text>
          </View>
        )}
      </View>
      <Text style={styles.hint}>
        {selectMode ? 'Tap to select up to 4 for group stats' : 'Tap to see their journey'}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {friends.map((f) => {
          const selected = selectedIds?.includes(f.user_id);
          return (
            <TouchableOpacity
              key={f.user_id}
              style={styles.item}
              activeOpacity={0.85}
              onPress={() => {
                if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
                if (selectMode) onToggleSelect?.(f.user_id);
                else router.push(`/user-profile/${f.user_id}`);
              }}
              testID={`crew-avatar-${f.user_id}`}
            >
              <View style={[styles.avatarWrap, selected && styles.avatarWrapSelected]}>
                {f.picture ? (
                  <Image source={{ uri: f.picture }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{(f.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                {selected && (
                  <View style={styles.checkOverlay}>
                    <Ionicons name="checkmark-circle" size={22} color="#FFD700" />
                  </View>
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {(f.name || '').split(' ')[0] || '?'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.borderSand,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 4,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.3 },
  count: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  pendingBadge: {
    marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 100, backgroundColor: theme.colors.accentSand,
  },
  pendingText: { fontSize: 10, fontWeight: '800', color: '#1a1a2e', letterSpacing: 0.5 },
  hint: { fontSize: 11, color: theme.colors.textLight, marginTop: 3, marginBottom: 12, fontStyle: 'italic' },
  strip: { gap: 14, paddingRight: 6 },
  item: { alignItems: 'center', width: 72 },
  avatarWrap: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: theme.colors.borderSand,
    padding: 2,
    shadowColor: theme.colors.accentSand,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 3,
  },
  avatarWrapSelected: { borderColor: '#FFD700', borderWidth: 3, padding: 1 },
  avatar: { width: '100%', height: '100%', borderRadius: 32 },
  avatarFallback: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  checkOverlay: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#1a1a2e', borderRadius: 100,
  },
  name: {
    fontSize: 12, color: theme.colors.text, fontWeight: '600',
    marginTop: 8, maxWidth: 72, textAlign: 'center',
  },
});
