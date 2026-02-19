import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, ActivityIndicator, Surface, FAB, Searchbar, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Landmark {
  landmark_id: string;
  name: string;
  country_name: string;
  continent: string;
  description: string;
  image_url: string;
  category: string;
  upvotes: number;
}

export default function UserLandmarksScreen() {
  const { user } = useAuth();
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchLandmarks();
  }, []);

  const fetchLandmarks = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(
        `${BACKEND_URL}/api/landmarks?category=user_suggested`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLandmarks(data);
      }
    } catch (error) {
      console.error('Error fetching user landmarks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLandmarks();
  };

  const renderLandmark = ({ item }: { item: Landmark }) => (
    <TouchableOpacity
      onPress={() => router.push(`/landmark-detail/${item.landmark_id}`)}
      activeOpacity={0.7}
    >
      <Surface style={styles.landmarkCard}>
        <Image
          source={{ uri: item.image_url }}
          style={styles.landmarkImage}
        />
        <View style={styles.landmarkContent}>
          <Text style={styles.landmarkName}>{item.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.metaText}>{item.country_name}</Text>
          </View>
          <Text style={styles.landmarkDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.upvoteRow}>
            <Ionicons name="heart" size={16} color="#d32f2f" />
            <Text style={styles.upvoteText}>{item.upvotes} upvotes</Text>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>User-Suggested</Text>
          <Text style={styles.headerSubtitle}>Community landmarks</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color="#6200ee" />
        <Text style={styles.infoText}>
          These landmarks are suggested by the community. Upvote your favorites!
        </Text>
      </View>

      <FlatList
        data={landmarks}
        renderItem={renderLandmark}
        keyExtractor={(item) => item.landmark_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="add-circle" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No user-suggested landmarks yet</Text>
            <Text style={styles.emptySubtext}>Be the first to suggest one!</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          if (user?.is_premium) {
            router.push('/suggest-landmark');
          } else {
            Alert.alert(
              'Premium Feature',
              'Suggesting landmarks is a Premium feature. Upgrade to Premium to suggest your favorite places!',
              [
                { text: 'Maybe Later', style: 'cancel' },
                { text: 'Learn More', onPress: () => {} }
              ]
            );
          }
        }}
        label="Suggest"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#6200ee',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0d0ff',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#333',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  landmarkCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  landmarkImage: {
    width: '100%',
    height: 180,
  },
  landmarkContent: {
    padding: 16,
  },
  landmarkName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  landmarkDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  upvoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upvoteText: {
    fontSize: 14,
    color: '#d32f2f',
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6200ee',
  },
});
