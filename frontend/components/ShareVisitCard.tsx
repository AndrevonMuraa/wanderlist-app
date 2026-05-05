import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Alert, Image } from 'react-native';
import { Text, ActivityIndicator, Modal, Portal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '../contexts/ThemeContext';

interface ShareVisitCardProps {
  visible: boolean;
  onDismiss: () => void;
  visitName: string;
  locationName: string;
  points: number;
  photoUrl?: string;
  diary?: string;
  visitType: 'landmark' | 'destination' | 'custom';
}

export default function ShareVisitCard({
  visible, onDismiss, visitName, locationName, points, photoUrl, diary, visitType,
}: ShareVisitCardProps) {
  const { colors } = useTheme();
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      setSharing(true);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your visit' });
      onDismiss();
    } catch {
      Alert.alert('Error', 'Could not share. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const typeIcon = visitType === 'landmark' ? 'location' : visitType === 'destination' ? 'flag' : 'compass';
  const typeColor = visitType === 'landmark' ? '#E87850' : visitType === 'destination' ? '#4DB8D8' : '#1E8A8A';

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Share your visit</Text>
          <TouchableOpacity onPress={onDismiss}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View ref={cardRef} collapsable={false} style={styles.cardOuter}>
          <LinearGradient
            colors={['#0c1220', '#162032', '#1a2840']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.3, y: 1 }}
            style={styles.card}
          >
            {/* Brand */}
            <View style={styles.brandRow}>
              <View style={[styles.brandLogo, { backgroundColor: typeColor }]}>
                <Text style={styles.brandLogoText}>W</Text>
              </View>
              <Text style={styles.brandText}>WANDERMARK</Text>
            </View>

            {/* Photo or Icon */}
            {photoUrl ? (
              <View style={styles.photoFrame}>
                <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
              </View>
            ) : (
              <View style={[styles.iconCircle, { borderColor: typeColor + '40' }]}>
                <Ionicons name={typeIcon as any} size={28} color={typeColor} />
              </View>
            )}

            {/* Visit Name */}
            <Text style={styles.visitName} numberOfLines={2}>{visitName}</Text>

            {/* Location + Type */}
            <View style={styles.pillRow}>
              <View style={[styles.pill, { backgroundColor: typeColor + '20' }]}>
                <Ionicons name={typeIcon as any} size={11} color={typeColor} />
                <Text style={[styles.pillText, { color: typeColor }]}>
                  {visitType === 'landmark' ? 'Landmark' : visitType === 'destination' ? 'Destination' : 'Custom'}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                <Ionicons name="navigate" size={11} color="rgba(255,255,255,0.6)" />
                <Text style={styles.pillTextLight}>{locationName}</Text>
              </View>
            </View>

            {/* Diary */}
            {diary && (
              <Text style={styles.diary} numberOfLines={2}>"{diary.substring(0, 120)}{diary.length > 120 ? '...' : ''}"</Text>
            )}

            {/* Points */}
            <View style={styles.pointsRow}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.pointsText}>+{points} points</Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerLine} />
              <Text style={styles.ctaUrl}>wandermark.app</Text>
            </View>
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.85}
          testID="share-visit-card-button"
        >
          <LinearGradient
            colors={['#2E9AB5', '#4DB8D8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareBtnGradient}
          >
            {sharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="share-social" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share to social media</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Instagram, WhatsApp, Facebook & more
        </Text>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardOuter: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  card: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
  },
  photoFrame: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 18,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  visitName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextLight: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  diary: {
    fontSize: 13,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
  },
  footer: {
    alignItems: 'center',
    gap: 10,
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ctaUrl: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(77,184,216,0.5)',
    letterSpacing: 0.5,
  },
  shareBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  shareBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
