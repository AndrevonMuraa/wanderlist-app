import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Alert, Image } from 'react-native';
import { Text, ActivityIndicator, Modal, Portal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

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
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your visit',
      });
      onDismiss();
    } catch {
      Alert.alert('Error', 'Could not share. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const typeIcon = visitType === 'landmark' ? 'location' : visitType === 'destination' ? 'flag' : 'compass';
  const typeColor = visitType === 'landmark' ? '#E87850' : visitType === 'destination' ? '#4DB8D8' : '#10b981';
  const typeLabel = visitType === 'landmark' ? 'Landmark' : visitType === 'destination' ? 'Destination' : 'Custom';

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
          {photoUrl ? (
            <View style={styles.cardWithPhoto}>
              <Image source={{ uri: photoUrl }} style={styles.cardPhoto} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.photoOverlay}
              >
                <View style={styles.brandRow}>
                  <View style={[styles.brandDot, { backgroundColor: typeColor }]} />
                  <Text style={styles.brandText}>WANDERMARK</Text>
                </View>
                <Text style={styles.visitNamePhoto} numberOfLines={2}>{visitName}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name={typeIcon as any} size={12} color={typeColor} />
                    <Text style={[styles.metaText, { color: typeColor }]}>{typeLabel}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Ionicons name="navigate" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.metaText}>{locationName}</Text>
                  </View>
                </View>
                {diary && (
                  <Text style={styles.diarySnippetPhoto} numberOfLines={2}>"{diary.substring(0, 120)}{diary.length > 120 ? '...' : ''}"</Text>
                )}
                <View style={styles.pointsRowPhoto}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.pointsTextPhoto}>+{points} points</Text>
                </View>
                <Text style={styles.ctaUrl}>wandermark.app</Text>
              </LinearGradient>
            </View>
          ) : (
            <LinearGradient
              colors={['#0c1220', '#162032', '#1a2840']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.3, y: 1 }}
              style={styles.cardNoPhoto}
            >
              <View style={styles.brandRow}>
                <View style={[styles.brandDot, { backgroundColor: typeColor }]} />
                <Text style={styles.brandText}>WANDERMARK</Text>
              </View>
              <View style={[styles.typeIconCircle, { borderColor: typeColor + '40' }]}>
                <Ionicons name={typeIcon as any} size={28} color={typeColor} />
              </View>
              <Text style={styles.visitNameNoPhoto} numberOfLines={2}>{visitName}</Text>
              <Text style={styles.locationNoPhoto}>{locationName}</Text>
              {diary && (
                <Text style={styles.diarySnippetNoPhoto} numberOfLines={3}>"{diary.substring(0, 150)}{diary.length > 150 ? '...' : ''}"</Text>
              )}
              <View style={styles.pointsRowNoPhoto}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.pointsTextNoPhoto}>+{points} points</Text>
              </View>
              <View style={styles.footerLine} />
              <Text style={styles.ctaTextNoPhoto}>Track your travels</Text>
              <Text style={styles.ctaUrl}>wandermark.app</Text>
            </LinearGradient>
          )}
        </View>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.85}
          data-testid="share-visit-card-button"
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
  // Card with photo
  cardWithPhoto: {
    width: '100%',
    height: 360,
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  visitNamePhoto: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  diarySnippetPhoto: {
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    lineHeight: 17,
  },
  pointsRowPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  pointsTextPhoto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD700',
  },
  // Card without photo
  cardNoPhoto: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  typeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  visitNameNoPhoto: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  locationNoPhoto: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  diarySnippetNoPhoto: {
    fontSize: 13,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  pointsRowNoPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  pointsTextNoPhoto: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  ctaTextNoPhoto: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  // Shared
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 3,
  },
  ctaUrl: {
    fontSize: 11,
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
