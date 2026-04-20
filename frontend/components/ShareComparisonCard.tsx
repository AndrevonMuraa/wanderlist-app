import React, { useRef, useState } from 'react';
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

interface Visit {
  visit_id: string;
  photos?: string[];
  diary_notes?: string;
}
interface Side {
  user_id: string;
  name?: string;
  username?: string;
  picture?: string;
  visits?: Visit[];
  photo_count?: number;
}
interface Landmark {
  landmark_id: string;
  name?: string;
  country_name?: string;
  continent?: string;
}

interface ShareComparisonCardProps {
  visible: boolean;
  onDismiss: () => void;
  landmark: Landmark;
  me: Side;
  friend: Side;
}

function firstName(n?: string, fallback = '?') {
  if (!n) return fallback;
  return n.split(' ')[0];
}

/**
 * Shareable "We've both been here" card — used from the Compare screen
 * to export a friend-overlap memory card for Instagram Stories, etc.
 */
export default function ShareComparisonCard({
  visible, onDismiss, landmark, me, friend,
}: ShareComparisonCardProps) {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const handle = user?.username ? `@${user.username}` : null;

  // Combined photo mosaic (up to 4 photos: 2 from each if available, else fill)
  const mePhotos = me.visits?.[0]?.photos || [];
  const friendPhotos = friend.visits?.[0]?.photos || [];
  const mosaic: { uri: string; side: 'me' | 'friend' }[] = [];
  for (let i = 0; i < 2; i++) {
    if (mePhotos[i]) mosaic.push({ uri: mePhotos[i], side: 'me' });
    if (friendPhotos[i]) mosaic.push({ uri: friendPhotos[i], side: 'friend' });
  }
  // Backfill if one side was empty
  if (mosaic.length < 4) {
    const backfill = [...mePhotos, ...friendPhotos].slice(mosaic.length, 4);
    mosaic.push(...backfill.map((uri, i) => ({
      uri,
      side: (mePhotos.includes(uri) ? 'me' : 'friend') as 'me' | 'friend',
    })));
  }
  const mosaicSlice = mosaic.slice(0, 4);

  const meLabel = firstName(me.name, 'You');
  const friendLabel = firstName(friend.name, 'Friend');
  const totalPhotos = (me.photo_count || 0) + (friend.photo_count || 0);

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
      // Fire-and-forget analytics ping
      getToken().then((token) => {
        fetch(`${BACKEND_URL}/api/shares`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ share_type: 'compare', period: landmark.landmark_id }),
        }).catch(() => {});
      }).catch(() => {});
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `We've both been to ${landmark.name || 'here'}`,
      });
      onDismiss();
    } catch {
      Alert.alert('Error', 'Could not share. Please try again.');
    } finally { setSharing(false); }
  };

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
            <Text style={styles.modalTitle}>Share this memory</Text>
            <TouchableOpacity onPress={onDismiss} data-testid="share-comparison-close">
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* === Shareable card === */}
          <View ref={cardRef} collapsable={false} style={styles.cardOuter}>
            <LinearGradient
              colors={['#0C1629', '#1a2a47', '#C9A961']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              locations={[0, 0.55, 1]}
              style={styles.card}
            >
              {/* Decorative orbs */}
              <View style={styles.decorOrb1} />
              <View style={styles.decorOrb2} />

              {/* Brand */}
              <View style={styles.brandRow}>
                <View style={styles.brandLogo}>
                  <Text style={styles.brandLogoText}>W</Text>
                </View>
                <Text style={styles.brandText}>WANDERMARK</Text>
              </View>

              {/* Kicker */}
              <View style={styles.kickerRow}>
                <Ionicons name="people" size={12} color="#FFD700" />
                <Text style={styles.kickerText}>We&rsquo;ve both been here</Text>
              </View>

              {/* Landmark */}
              <Text style={styles.landmarkName} numberOfLines={2}>
                {landmark.name || 'Unknown place'}
              </Text>
              {(landmark.country_name || landmark.continent) && (
                <Text style={styles.landmarkSub} numberOfLines={1}>
                  {[landmark.country_name, landmark.continent].filter(Boolean).join(' · ')}
                </Text>
              )}
              <View style={styles.titleLine} />

              {/* Two people row */}
              <View style={styles.peopleRow}>
                <View style={styles.personBlock}>
                  {me.picture ? (
                    <Image source={{ uri: me.picture }} style={styles.personAvatar} />
                  ) : (
                    <View style={[styles.personAvatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>{meLabel.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.personName} numberOfLines={1}>{meLabel}</Text>
                  <Text style={styles.personMeta}>
                    {me.photo_count || 0} {me.photo_count === 1 ? 'photo' : 'photos'}
                  </Text>
                </View>

                <View style={styles.connector}>
                  <View style={styles.connectorLine} />
                  <View style={styles.connectorDot}>
                    <Ionicons name="heart" size={14} color="#FF4B6E" />
                  </View>
                  <View style={styles.connectorLine} />
                </View>

                <View style={styles.personBlock}>
                  {friend.picture ? (
                    <Image source={{ uri: friend.picture }} style={styles.personAvatar} />
                  ) : (
                    <View style={[styles.personAvatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>{friendLabel.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.personName} numberOfLines={1}>{friendLabel}</Text>
                  <Text style={styles.personMeta}>
                    {friend.photo_count || 0} {friend.photo_count === 1 ? 'photo' : 'photos'}
                  </Text>
                </View>
              </View>

              {/* Photo mosaic */}
              {mosaicSlice.length > 0 ? (
                <View style={styles.mosaic}>
                  {mosaicSlice.map((p, idx) => (
                    <View key={idx} style={styles.mosaicSlot}>
                      <Image source={{ uri: p.uri }} style={styles.mosaicPhoto} />
                      <View style={[
                        styles.mosaicBadge,
                        p.side === 'me'
                          ? { backgroundColor: 'rgba(54,169,191,0.92)' }
                          : { backgroundColor: 'rgba(201,169,97,0.92)' },
                      ]}>
                        <Text style={styles.mosaicBadgeText}>
                          {p.side === 'me' ? meLabel : friendLabel}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noPhotos}>
                  <Ionicons name="camera-outline" size={26} color="rgba(255,255,255,0.72)" />
                  <Text style={styles.noPhotosText}>A shared memory</Text>
                </View>
              )}

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Ionicons name="image" size={11} color="#FFD700" />
                  <Text style={styles.statPillText}>{totalPhotos} total photos</Text>
                </View>
                <View style={styles.statPill}>
                  <Ionicons name="people" size={11} color="#FFD700" />
                  <Text style={styles.statPillText}>2 travellers</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <View style={styles.footerLine} />
                <Text style={styles.footerText}>See where your friends have been</Text>
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
            data-testid="share-comparison-button"
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
    top: -70, right: -70,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  decorOrb2: {
    position: 'absolute',
    bottom: -50, left: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(201,169,97,0.14)',
  },

  // Brand
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  brandLogo: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandLogoText: { fontSize: 13, fontWeight: '800', color: theme.colors.primary },
  brandText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.82)', letterSpacing: 3 },

  // Kicker
  kickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
    marginBottom: 10,
  },
  kickerText: {
    fontSize: 10, fontWeight: '800', color: '#FFD700',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  landmarkName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.6,
    marginTop: 2,
  },
  landmarkSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  titleLine: {
    width: 48, height: 3, borderRadius: 2,
    backgroundColor: '#FFD700',
    marginTop: 12, marginBottom: 18,
  },

  // People row
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  personBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  personAvatar: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.95)',
  },
  avatarFallback: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  personName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  personMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },

  connector: {
    alignItems: 'center',
    width: 40,
    gap: 2,
  },
  connectorLine: {
    width: '100%', height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  connectorDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 2,
  },

  // Mosaic
  mosaic: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  mosaicSlot: {
    width: '49%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mosaicPhoto: { width: '100%', height: '100%' },
  mosaicBadge: {
    position: 'absolute',
    bottom: 6, left: 6,
    paddingHorizontal: 7, paddingVertical: 2.5,
    borderRadius: 100,
    maxWidth: '80%',
  },
  mosaicBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },

  noPhotos: {
    alignItems: 'center', padding: 24, gap: 6, marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  noPhotosText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  // Stats pills
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 100,
  },
  statPillText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11, fontWeight: '700',
  },

  // Footer
  footer: { alignItems: 'center', marginTop: 18 },
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
