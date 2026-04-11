import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Dimensions, Platform, ActivityIndicator, FlatList, Animated,
  Alert, TextInput, KeyboardAvoidingView, Keyboard, Modal as RNModal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { safeGoBack } from '../../utils/navigation';
import { Surface, Portal, Dialog, Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import theme from '../../styles/theme';
import { BACKEND_URL } from '../../utils/config';
import { invalidateCacheGroup } from '../../utils/apiCache';
import { shareCustomVisit } from '../../utils/shareUtils';
import PhotoViewer from '../../components/PhotoViewer';
import UniversalHeader from '../../components/UniversalHeader';
import { useAuth } from '../../contexts/AuthContext';
import { getToken } from '../utils/token';

const { width } = Dimensions.get('window');
interface CustomVisit {
  user_created_visit_id: string;
  user_id: string;
  user_name: string;
  country_name: string;
  landmarks: Array<{ name: string; photo?: string | null }>;
  photos: string[];
  diary: string | null;
  share_diary: boolean;
  visibility: string;
  visited_at: string;
  created_at: string;
}

export default function CustomVisitDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { visit_id } = useLocalSearchParams();
  const [visit, setVisit] = useState<CustomVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDiaryDialog, setShowEditDiaryDialog] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [editDiary, setEditDiary] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const isOwner = user?.user_id === visit?.user_id;

  // Collect all photos: general + landmark photos
  const allPhotos: Array<{ url: string; label?: string }> = [];
  if (visit) {
    visit.photos?.forEach(p => allPhotos.push({ url: p }));
    visit.landmarks?.forEach(lm => {
      if (lm.photo) allPhotos.push({ url: lm.photo, label: lm.name });
    });
  }

  useEffect(() => {
    fetchVisit();
  }, [visit_id]);

  const fetchVisit = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/user-created-visits/${visit_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVisit(data);
        setEditDiary(data.diary || '');
      } else {
        Alert.alert('Error', 'Could not load visit');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/user-created-visits/${visit_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        invalidateCacheGroup('visit');
        Alert.alert('Deleted', 'Custom visit has been removed.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/journey') },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Could not delete visit');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSaveDiary = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/user-created-visits/${visit_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ diary_notes: editDiary }),
      });
      if (res.ok) {
        setVisit(prev => prev ? { ...prev, diary: editDiary } : prev);
        setShowEditDiaryDialog(false);
      }
    } catch {
      Alert.alert('Error', 'Could not update diary');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets) {
        setUploadingPhotos(true);
        const newPhotos = result.assets
          .filter(a => a.base64)
          .map(a => `data:image/jpeg;base64,${a.base64}`);
        const existing = visit?.photos || [];
        const all = [...existing, ...newPhotos].slice(0, 10);
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/user-created-visits/${visit_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ photos: all }),
        });
        if (res.ok) {
          setVisit(prev => prev ? { ...prev, photos: all } : prev);
          Alert.alert('Success', 'Photos added!');
        }
      }
    } catch {
      Alert.alert('Error', 'Could not add photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]?.base64) {
        setUploadingPhotos(true);
        const newPhoto = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const existing = visit?.photos || [];
        const all = [...existing, newPhoto].slice(0, 10);
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/user-created-visits/${visit_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ photos: all }),
        });
        if (res.ok) {
          setVisit(prev => prev ? { ...prev, photos: all } : prev);
          Alert.alert('Success', 'Photo added!');
        }
      }
    } catch {
      Alert.alert('Error', 'Could not take photo');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleToggleVisibility = async () => {
    const options = ['public', 'friends', 'private'];
    const current = visit?.visibility || 'public';
    const next = options[(options.indexOf(current) + 1) % options.length];
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/user-created-visits/${visit_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ visibility: next }),
      });
      if (res.ok) {
        setVisit(prev => prev ? { ...prev, visibility: next } : prev);
      }
    } catch {
      Alert.alert('Error', 'Could not update visibility');
    }
  };

  const handleToggleShareDiary = async () => {
    const newVal = !(visit?.share_diary ?? true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/user-created-visits/${visit_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ share_diary: newVal }),
      });
      if (res.ok) {
        setVisit(prev => prev ? { ...prev, share_diary: newVal } : prev);
      }
    } catch {
      Alert.alert('Error', 'Could not update diary sharing');
    }
  };

  const visibilityIcon = (v: string) => {
    if (v === 'private') return 'lock-closed';
    if (v === 'friends') return 'people';
    return 'earth';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={48} color={theme.colors.textLight} />
        <Text style={styles.errorText}>Visit not found</Text>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const visitDate = new Date(visit.visited_at || visit.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <UniversalHeader title="Custom visit" onBack={() => safeGoBack(router)} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Hero / Photo carousel */}
        {allPhotos.length > 0 ? (
          <View style={styles.photoSection}>
            <FlatList
              data={allPhotos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => `photo-${i}`}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => { setFullscreenIndex(index); setShowFullscreen(true); }}
                >
                  <Image source={{ uri: item.url }} style={styles.heroImage} />
                  {item.label && (
                    <View style={styles.photoLabel}>
                      <Text style={styles.photoLabelText}>{item.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
            <View style={styles.photoCount}>
              <Ionicons name="images" size={14} color="#fff" />
              <Text style={styles.photoCountText}>{allPhotos.length}</Text>
            </View>
          </View>
        ) : (
          <LinearGradient colors={['#1E8A8A', '#2A6A6A']} style={styles.heroNoPhoto}>
            <Ionicons name="airplane" size={48} color="rgba(255,255,255,0.5)" />
            <Text style={styles.heroNoPhotoText}>No photos yet</Text>
          </LinearGradient>
        )}

        {/* Title & meta */}
        <View style={styles.titleSection}>
          <Text style={styles.countryName}>{visit.country_name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textLight} />
            <Text style={styles.metaText}>{visitDate}</Text>
            {isOwner && (
              <TouchableOpacity onPress={handleToggleVisibility} style={styles.visibilityBadge}>
                <Ionicons name={visibilityIcon(visit.visibility)} size={14} color={theme.colors.primary} />
                <Text style={styles.visibilityText}>{visit.visibility}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Landmarks */}
        {visit.landmarks && visit.landmarks.length > 0 && (
          <Surface style={styles.card}>
            <Text style={styles.cardTitle}>Places Visited</Text>
            {visit.landmarks.map((lm, i) => (
              <View key={`lm-${i}`} style={styles.landmarkRow}>
                {lm.photo ? (
                  <TouchableOpacity onPress={() => {
                    const idx = allPhotos.findIndex(p => p.url === lm.photo);
                    if (idx >= 0) { setFullscreenIndex(idx); setShowFullscreen(true); }
                  }}>
                    <Image source={{ uri: lm.photo }} style={styles.landmarkThumb} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.landmarkThumb, styles.landmarkThumbPlaceholder]}>
                    <Ionicons name="location" size={20} color={theme.colors.textLight} />
                  </View>
                )}
                <Text style={styles.landmarkName}>{lm.name}</Text>
              </View>
            ))}
          </Surface>
        )}

        {/* Diary */}
        {(visit.diary || isOwner) && (
          <Surface style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Travel Diary</Text>
              {isOwner && (
                <View style={styles.diaryActions}>
                  <TouchableOpacity onPress={handleToggleShareDiary} style={styles.shareDiaryToggle}>
                    <Ionicons
                      name={visit.share_diary !== false ? 'eye' : 'eye-off'}
                      size={18}
                      color={visit.share_diary !== false ? theme.colors.primary : theme.colors.textLight}
                    />
                    <Text style={[styles.shareDiaryText, visit.share_diary !== false && { color: theme.colors.primary }]}>
                      {visit.share_diary !== false ? 'Shared' : 'Hidden'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setEditDiary(visit.diary || ''); setShowEditDiaryDialog(true); }}
                    style={styles.editBtn}
                  >
                    <Ionicons name="pencil" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {visit.diary ? (
              <Text style={styles.diaryText}>{visit.diary}</Text>
            ) : (
              <TouchableOpacity onPress={() => setShowEditDiaryDialog(true)}>
                <Text style={styles.diaryPlaceholder}>Tap to add diary notes...</Text>
              </TouchableOpacity>
            )}
          </Surface>
        )}

        {/* Owner actions — inline add photo + separate delete */}
        {isOwner && allPhotos.length > 0 && (
          <TouchableOpacity onPress={handleAddPhotos} style={styles.addPhotoButton} disabled={uploadingPhotos}>
            {uploadingPhotos ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={{ fontSize: 14, color: theme.colors.primary, fontWeight: '600' }}>Add Photos</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isOwner && allPhotos.length === 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginHorizontal: 16, marginBottom: 8 }}>
            <TouchableOpacity onPress={handleAddPhotos} style={styles.addPhotoButton} disabled={uploadingPhotos}>
              <Ionicons name="images-outline" size={20} color={theme.colors.primary} />
              <Text style={{ fontSize: 14, color: theme.colors.primary, fontWeight: '600' }}>Add Photos</Text>
            </TouchableOpacity>
          </View>
        )}

        {isOwner && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => shareCustomVisit(visit.name, visit.country_name || '', visit.points_earned || 0)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 }}
              data-testid="share-custom-visit-btn"
            >
              <Ionicons name="share-social-outline" size={16} color={theme.colors.primary} />
              <Text style={{ fontSize: 13, color: theme.colors.primary }}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDeleteDialog(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 }}
            >
              <Ionicons name="trash-outline" size={16} color="#E53935" />
              <Text style={{ fontSize: 13, color: '#E53935' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Custom Visit</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this custom visit? This cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onPress={handleDelete} loading={deleting} textColor="#E53935">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit diary dialog */}
      <RNModal
        visible={showEditDiaryDialog}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditDiaryDialog(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowEditDiaryDialog(false); }}>
                    <Text style={{ fontSize: 15, color: theme.colors.textSecondary }}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text }}>Edit Diary</Text>
                  <TouchableOpacity 
                    onPress={() => { Keyboard.dismiss(); handleSaveDiary(); }}
                    disabled={saving}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.primary }}>{saving ? 'Saving...' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.diaryInput, { maxHeight: 250 }]}
                  value={editDiary}
                  onChangeText={setEditDiary}
                  placeholder="Write about your experience..."
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </RNModal>

      {/* Fullscreen photo viewer */}
      {showFullscreen && (
        <PhotoViewer
          photos={allPhotos.map(p => p.url)}
          initialIndex={fullscreenIndex}
          visible={showFullscreen}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { fontSize: 16, color: theme.colors.textLight, marginTop: 12 },
  backBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.colors.primary, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  photoSection: { position: 'relative' },
  heroImage: { width, height: 280, resizeMode: 'cover' },
  photoLabel: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  photoLabelText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  photoCount: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  photoCountText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroNoPhoto: { height: 200, justifyContent: 'center', alignItems: 'center' },
  heroNoPhotoText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginTop: 8 },
  titleSection: { padding: theme.spacing.md },
  countryName: { fontSize: 26, fontWeight: '800', color: theme.colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  metaText: { fontSize: 14, color: theme.colors.textLight },
  visibilityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  visibilityText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary, textTransform: 'capitalize' },
  card: { marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md, borderRadius: theme.roundness * 1.5, padding: theme.spacing.md, backgroundColor: theme.colors.surface, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  landmarkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  landmarkThumb: { width: 44, height: 44, borderRadius: 8, marginRight: 12 },
  landmarkThumbPlaceholder: { backgroundColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' },
  landmarkName: { fontSize: 15, fontWeight: '500', color: theme.colors.text, flex: 1 },
  diaryActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareDiaryToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shareDiaryText: { fontSize: 12, fontWeight: '500', color: theme.colors.textLight },
  editBtn: { padding: 4 },
  diaryText: { fontSize: 15, color: theme.colors.text, lineHeight: 22 },
  diaryPlaceholder: { fontSize: 15, color: theme.colors.textLight, fontStyle: 'italic' },
  addPhotoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 },
  actionBtn: { alignItems: 'center', padding: 12 },
  actionBtnText: { fontSize: 12, fontWeight: '500', color: theme.colors.text, marginTop: 4 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  uploadingText: { fontSize: 13, color: theme.colors.textLight },
  diaryInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 12, fontSize: 15, minHeight: 120, color: theme.colors.text, textAlignVertical: 'top' },
});
