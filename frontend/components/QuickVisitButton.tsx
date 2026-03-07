import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Modal, TouchableOpacity, Image, FlatList, Alert, Platform, Dimensions,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { invalidateCacheGroup } from '../utils/apiCache';
import { successHaptic } from '../utils/haptics';

const { width: SCREEN_W } = Dimensions.get('window');

interface QuickVisitProps {
  /** If provided, skip the landmark picker and submit directly */
  landmarkId?: string;
  landmarkName?: string;
  /** List of landmarks to pick from (for country-level quick visit) */
  landmarks?: Array<{ landmark_id: string; name: string; is_locked?: boolean }>;
  /** Callback after successful visit */
  onSuccess: () => void;
  /** User's default privacy setting */
  defaultPrivacy?: string;
}

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem('auth_token');
  return SecureStore.getItemAsync('auth_token');
};

export default function QuickVisitButton({
  landmarkId,
  landmarkName,
  landmarks,
  onSuccess,
  defaultPrivacy = 'public',
}: QuickVisitProps) {
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState<{ id: string; name: string } | null>(
    landmarkId && landmarkName ? { id: landmarkId, name: landmarkName } : null
  );
  const [saving, setSaving] = useState(false);

  // Keep selectedLandmark in sync with props
  useEffect(() => {
    if (landmarkId && landmarkName) {
      setSelectedLandmark({ id: landmarkId, name: landmarkName });
    }
  }, [landmarkId, landmarkName]);

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Access', 'Please allow camera access in your device settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
    if (!result.canceled && result.assets?.[0]?.base64) {
      const photoData = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhoto(photoData);

      // If landmark is pre-selected, go directly to confirmation
      if (landmarkId && landmarkName) {
        setShowPicker(true);
      } else {
        // Show landmark picker
        setShowPicker(true);
      }
    }
  };

  const submitVisit = async () => {
    if (!photo || !selectedLandmark) return;

    setSaving(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/visits`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landmark_id: selectedLandmark.id,
          photos: [photo],
          diary_notes: '',
          share_diary: true,
          visibility: defaultPrivacy,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        invalidateCacheGroup('visit');
        await successHaptic();
        Alert.alert(
          'Quick Visit Saved!',
          `${selectedLandmark.name} recorded! +${result.points_earned || 0} points earned.`
        );
        setPhoto(null);
        setShowPicker(false);
        setSelectedLandmark(landmarkId && landmarkName ? { id: landmarkId, name: landmarkName } : null);
        onSuccess();
      } else {
        const err = await response.json();
        Alert.alert('Error', err.detail || 'Could not save visit');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    setPhoto(null);
    setShowPicker(false);
    setSelectedLandmark(landmarkId && landmarkName ? { id: landmarkId, name: landmarkName } : null);
  };

  const availableLandmarks = (landmarks || []).filter(lm => !lm.is_locked);

  return (
    <>
      {/* Camera FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={launchCamera}
        activeOpacity={0.85}
        data-testid="quick-visit-fab"
      >
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.fabInner}
        >
          <Ionicons name="camera" size={22} color="#C9A961" />
          <Text style={styles.fabLabel}>Quick Visit</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Confirmation / Picker Modal */}
      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={handleDismiss}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Quick Visit</Text>
              <TouchableOpacity onPress={handleDismiss} data-testid="quick-visit-dismiss">
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Photo Preview */}
            {photo && (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.retakeBtn} onPress={launchCamera}>
                  <Ionicons name="camera-reverse-outline" size={18} color="#fff" />
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pre-selected landmark confirmation */}
            {selectedLandmark && landmarkId ? (
              <View style={styles.selectedCard}>
                <Ionicons name="location" size={20} color={theme.colors.primary} />
                <Text style={styles.selectedName} numberOfLines={1}>{selectedLandmark.name}</Text>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              </View>
            ) : (
              /* Landmark picker list */
              <>
                <Text style={styles.pickLabel}>Select a landmark:</Text>
                <FlatList
                  data={availableLandmarks}
                  keyExtractor={(item) => item.landmark_id}
                  style={styles.pickerList}
                  renderItem={({ item }) => {
                    const isSelected = selectedLandmark?.id === item.landmark_id;
                    return (
                      <TouchableOpacity
                        style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                        onPress={() => setSelectedLandmark({ id: item.landmark_id, name: item.name })}
                        activeOpacity={0.7}
                        data-testid={`quick-pick-${item.landmark_id}`}
                      >
                        <Ionicons
                          name="location"
                          size={18}
                          color={isSelected ? '#fff' : theme.colors.primary}
                        />
                        <Text
                          style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color="#fff" />}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No available landmarks</Text>
                  }
                />
              </>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, (!selectedLandmark || saving) && styles.saveBtnDisabled]}
              onPress={submitVisit}
              disabled={!selectedLandmark || saving}
              activeOpacity={0.85}
              data-testid="quick-visit-save"
            >
              <LinearGradient
                colors={selectedLandmark ? [theme.colors.primary, theme.colors.secondary] : ['#ccc', '#bbb']}
                style={styles.saveBtnInner}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Visit</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* FAB */
  fab: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  fabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C9A961',
    letterSpacing: -0.2,
  },

  /* Overlay & Sheet */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },

  /* Photo preview */
  photoPreviewWrap: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retakeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Selected landmark card */
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },

  /* Landmark picker */
  pickLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  pickerList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  pickerItemActive: {
    backgroundColor: theme.colors.primary,
  },
  pickerItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  pickerItemTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textLight,
    paddingVertical: 20,
  },

  /* Save button */
  saveBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
