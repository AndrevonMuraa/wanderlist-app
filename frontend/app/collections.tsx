import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { PersistentTabBar } from '../components/PersistentTabBar';
import { lightHaptic, successHaptic } from '../utils/haptics';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

interface Collection {
  collection_id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  landmark_count: number;
  created_at: string;
}

const COLLECTION_ICONS = [
  { name: 'star', label: 'Star' },
  { name: 'heart', label: 'Heart' },
  { name: 'bookmark', label: 'Bookmark' },
  { name: 'flag', label: 'Flag' },
  { name: 'compass', label: 'Compass' },
  { name: 'map', label: 'Map' },
  { name: 'camera', label: 'Camera' },
  { name: 'airplane', label: 'Airplane' },
];

const COLLECTION_COLORS = [
  '#20B2AA', '#FF6B6B', '#4ECDC4', '#FFD93D',
  '#6C5CE7', '#00B894', '#FD79A8', '#A29BFE',
];

export default function CollectionsScreen() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  
  // Create collection form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('star');
  const [selectedColor, setSelectedColor] = useState('#20B2AA');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/collections`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCollections(data);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCollections();
  };

  const handleCreateCollection = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }

    setCreating(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/collections`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName,
          description: newDescription || undefined,
          icon: selectedIcon,
          color: selectedColor,
        }),
      });

      if (response.ok) {
        await successHaptic();
        setCreateModalVisible(false);
        setNewName('');
        setNewDescription('');
        setSelectedIcon('star');
        setSelectedColor('#20B2AA');
        await loadCollections();
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      Alert.alert('Error', 'Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCollection = (collection: Collection) => {
    Alert.alert(
      'Delete Collection',
      `Delete "${collection.name}"? This will remove all landmarks from this collection.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await fetch(`${BACKEND_URL}/api/collections/${collection.collection_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              await loadCollections();
            } catch (error) {
              console.error('Error deleting collection:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.header}
        >
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>My Collections</Text>
              <Text style={styles.headerSubtitle}>Organize your dream destinations</Text>
            </View>
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={20} color="#FFD700" />
            </View>
          </View>
        </LinearGradient>

        {/* Create Collection Button */}
        <TouchableOpacity
          onPress={async () => {
            await lightHaptic();
            setCreateModalVisible(true);
          }}
          activeOpacity={0.9}
          style={styles.createButtonContainer}
        >
          <LinearGradient
            colors={[theme.colors.accent, theme.colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButton}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Create New Collection</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Collections List */}
        {collections.length > 0 ? (
          collections.map((collection) => (
            <Surface key={collection.collection_id} style={styles.collectionCard}>
              <TouchableOpacity
                onPress={async () => {
                  await lightHaptic();
                  router.push(`/collection-detail/${collection.collection_id}`);
                }}
                activeOpacity={0.9}
              >
                <View style={styles.collectionHeader}>
                  <View style={[styles.collectionIcon, { backgroundColor: collection.color + '20' }]}>
                    <Ionicons name={collection.icon as any} size={32} color={collection.color} />
                  </View>
                  <View style={styles.collectionInfo}>
                    <Text style={styles.collectionName}>{collection.name}</Text>
                    {collection.description && (
                      <Text style={styles.collectionDescription} numberOfLines={2}>
                        {collection.description}
                      </Text>
                    )}
                    <View style={styles.collectionStats}>
                      <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.collectionCount}>
                        {collection.landmark_count} landmark{collection.landmark_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={async (e) => {
                      e.stopPropagation();
                      await lightHaptic();
                      handleDeleteCollection(collection);
                    }}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Surface>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="albums-outline" size={64} color={theme.colors.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No Collections Yet</Text>
            <Text style={styles.emptyMessage}>
              Create custom collections to organize your favorite landmarks by theme, region, or any way you like!
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Create Collection Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Collection</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Collection Name"
              placeholderTextColor={theme.colors.textLight}
              value={newName}
              onChangeText={setNewName}
              maxLength={50}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.colors.textLight}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            <Text style={styles.sectionLabel}>Choose Icon</Text>
            <View style={styles.iconGrid}>
              {COLLECTION_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon.name}
                  onPress={async () => {
                    await lightHaptic();
                    setSelectedIcon(icon.name);
                  }}
                  style={[
                    styles.iconOption,
                    selectedIcon === icon.name && styles.iconOptionSelected,
                  ]}
                >
                  <Ionicons
                    name={icon.name as any}
                    size={24}
                    color={selectedIcon === icon.name ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Choose Color</Text>
            <View style={styles.colorGrid}>
              {COLLECTION_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={async () => {
                    await lightHaptic();
                    setSelectedColor(color);
                  }}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleCreateCollection}
              disabled={creating || !newName.trim()}
              activeOpacity={0.9}
              style={styles.createCTAContainer}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                style={styles.createCTA}
              >
                <Text style={styles.createCTAText}>
                  {creating ? 'Creating...' : 'Create Collection'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PersistentTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 90,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  premiumBadge: {
    padding: theme.spacing.xs,
  },
  createButtonContainer: {
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  collectionCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  collectionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  collectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  collectionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  collectionCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl * 2,
    paddingTop: theme.spacing.xl * 3,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surfaceTinted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyMessage: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: theme.spacing.lg,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl * 2,
    borderTopRightRadius: theme.borderRadius.xl * 2,
    padding: theme.spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#fff',
    ...theme.shadows.md,
  },
  createCTAContainer: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
  },
  createCTA: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  createCTAText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
