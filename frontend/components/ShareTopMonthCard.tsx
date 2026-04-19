import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { Text, Modal, Portal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';
import { useAuth } from '../contexts/AuthContext';

interface ShareTopMonthCardProps {
  visible: boolean;
  onDismiss: () => void;
}

interface Item {
  rank: number;
  visit_id: string;
  photo_url?: string;
  landmark_name?: string;
  country_name?: string;
  user_name: string;
  likes_count: number;
  source: 'landmark' | 'custom';
}

/**
 * Shareable "Top 10 of the month" card — rendered, captured with
 * react-native-view-shot, and shared via the native share sheet.
 */
export default function ShareTopMonthCard({ visible, onDismiss }: ShareTopMonthCardProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [period, setPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const handle = user?.username ? `@${user.username}` : null;

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/community-highlights/top?limit=10&scope=month`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          setItems(d.items || []);
          setPeriod(d.period || '');
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, [visible]);

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      setSharing(true);
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      // Fire-and-forget analytics ping — never blocks the share flow
      getToken().then((token) => {
        fetch(`${BACKEND_URL}/api/shares`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ share_type: 'top_month', period }),
        }).catch(() => {});
      }).catch(() => {});
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Top 10 community photos — ${period}`,
      });
      onDismiss();
    } catch {
      Alert.alert('Error', 'Could not share. Please try again.');
    } finally { setSharing(false); }
  };

  const podium = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share Top 10 of {period || 'this month'}</Text>
            <TouchableOpacity onPress={onDismiss} data-testid="share-top-month-close">
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="trophy-outline" size={36} color={theme.colors.textLight} />
              <Text style={styles.emptyTitle}>No photos yet this month</Text>
              <Text style={styles.emptySub}>
                Check back after the community shares more visits in {period}.
              </Text>
            </View>
          ) : (
            <>
              {/* === Shareable card === */}
              <View ref={cardRef} collapsable={false} style={styles.cardOuter}>
                <LinearGradient
                  colors={[theme.colors.primary, '#2E9AB5', theme.colors.accentSand]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  locations={[0, 0.55, 1]}
                  style={styles.card}
                >
                  {/* Decorative orbs */}
                  <View style={styles.decorOrb1} />
                  <View style={styles.decorOrb2} />

                  {/* Brand row */}
                  <View style={styles.brandRow}>
                    <View style={styles.brandLogo}>
                      <Text style={styles.brandLogoText}>W</Text>
                    </View>
                    <Text style={styles.brandText}>WANDERMARK</Text>
                  </View>

                  {/* Title */}
                  <Text style={styles.kicker}>Top 10 of the month</Text>
                  <Text style={styles.periodText}>{period}</Text>
                  <View style={styles.titleLine} />

                  {/* Podium row (top 3) */}
                  <View style={styles.podium}>
                    {podium.map((it) => (
                      <View key={it.visit_id} style={[styles.podiumCard, it.rank === 1 && styles.podiumCardFirst]}>
                        <View style={styles.podiumPhotoWrap}>
                          {it.photo_url ? (
                            <Image source={{ uri: it.photo_url }} style={styles.podiumPhoto} />
                          ) : (
                            <View style={[styles.podiumPhoto, styles.photoFallback]}>
                              <Ionicons name="image-outline" size={20} color="#FFF" />
                            </View>
                          )}
                          <LinearGradient
                            colors={['#FFD700', theme.colors.accentSand]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.rankGradBadge}
                          >
                            <Text style={styles.rankGradText}>#{it.rank}</Text>
                          </LinearGradient>
                        </View>
                        <Text style={styles.podiumName} numberOfLines={1}>
                          {it.landmark_name || 'Unknown'}
                        </Text>
                        <View style={styles.podiumLikeRow}>
                          <Ionicons name="heart" size={10} color="#FF4B6E" />
                          <Text style={styles.podiumLikeText}>{it.likes_count}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Rest list 4–10 */}
                  {rest.length > 0 && (
                    <View style={styles.restList}>
                      {rest.map((it) => (
                        <View key={it.visit_id} style={styles.restRow}>
                          <Text style={styles.restRank}>{String(it.rank).padStart(2, '0')}</Text>
                          {it.photo_url ? (
                            <Image source={{ uri: it.photo_url }} style={styles.restThumb} />
                          ) : (
                            <View style={[styles.restThumb, styles.photoFallback]} />
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.restName} numberOfLines={1}>
                              {it.landmark_name || 'Unknown'}
                            </Text>
                            {it.country_name && (
                              <Text style={styles.restCountry} numberOfLines={1}>{it.country_name}</Text>
                            )}
                          </View>
                          <View style={styles.restLikeRow}>
                            <Ionicons name="heart" size={11} color="#FFB8C2" />
                            <Text style={styles.restLikeText}>{it.likes_count}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Footer CTA */}
                  <View style={styles.footer}>
                    <View style={styles.footerLine} />
                    <Text style={styles.footerText}>Discover what the world loves</Text>
                    <Text style={styles.footerUrl}>wandermark.app</Text>
                    {handle && (
                      <View style={styles.attributionRow}>
                        <Ionicons name="person-circle-outline" size={11} color="rgba(255,255,255,0.55)" />
                        <Text style={styles.attributionText}>Shared by {handle}</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>

              {/* Share button */}
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShare}
                disabled={sharing}
                activeOpacity={0.88}
                data-testid="share-top-month-button"
              >
                <LinearGradient
                  colors={['#C9A961', '#E8DCC8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shareBtnGrad}
                >
                  {sharing ? (
                    <ActivityIndicator color="#1a1a2e" />
                  ) : (
                    <>
                      <Ionicons name="share-social" size={18} color="#1a1a2e" />
                      <Text style={styles.shareBtnText}>Share to social media</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.hint}>Instagram Stories, TikTok, WhatsApp & more</Text>
            </>
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 16,
    borderRadius: 24,
    padding: 18,
    maxHeight: '94%',
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: theme.colors.text,
    flexShrink: 1,
    marginRight: 12,
  },
  loading: { padding: 40, alignItems: 'center' },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderSand,
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  emptySub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },

  // === Card ===
  cardOuter: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: theme.colors.shadowWarm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  card: {
    width: '100%',
    padding: 22,
    overflow: 'hidden',
  },
  decorOrb1: {
    position: 'absolute',
    top: -60, right: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  decorOrb2: {
    position: 'absolute',
    bottom: -40, left: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },

  // Brand
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  brandLogo: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandLogoText: { fontSize: 13, fontWeight: '800', color: theme.colors.primary },
  brandText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.82)', letterSpacing: 3 },

  kicker: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  periodText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.6,
    marginTop: 2,
  },
  titleLine: {
    width: 48, height: 3, borderRadius: 2,
    backgroundColor: '#FFD700',
    marginTop: 10, marginBottom: 18,
  },

  // Podium
  podium: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  podiumCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  podiumCardFirst: {
    backgroundColor: 'rgba(255,215,0,0.22)',
    borderColor: 'rgba(255,215,0,0.55)',
  },
  podiumPhotoWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  podiumPhoto: { width: '100%', height: '100%' },
  photoFallback: { backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  rankGradBadge: {
    position: 'absolute',
    top: 6, left: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 100,
    minWidth: 28,
    alignItems: 'center',
  },
  rankGradText: { color: '#1a1a2e', fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  podiumName: {
    fontSize: 11, color: '#FFF', fontWeight: '700',
    textAlign: 'center', letterSpacing: -0.1,
  },
  podiumLikeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4,
  },
  podiumLikeText: { fontSize: 10, color: 'rgba(255,255,255,0.82)', fontWeight: '600' },

  // Rest list
  restList: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  restRank: {
    width: 22, fontSize: 12, fontWeight: '800',
    color: 'rgba(255,255,255,0.62)', letterSpacing: 0.2,
  },
  restThumb: {
    width: 32, height: 32, borderRadius: 8,
  },
  restName: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  restCountry: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 1 },
  restLikeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  restLikeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' },

  // Footer
  footer: { alignItems: 'center', marginTop: 16 },
  footerLine: {
    width: 36, height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 10,
  },
  footerText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500', letterSpacing: 0.3 },
  footerUrl: { fontSize: 11, fontWeight: '700', color: '#FFD700', marginTop: 3, letterSpacing: 0.6 },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  attributionText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Share btn
  shareBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  shareBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, gap: 10,
  },
  shareBtnText: { color: '#1a1a2e', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  hint: { fontSize: 12, textAlign: 'center', color: theme.colors.textSecondary },
});
