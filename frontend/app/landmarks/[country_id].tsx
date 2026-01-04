import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Image, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Surface, FAB, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function LandmarksScreen() {
  const { country_id, name } = useLocalSearchParams();
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
        `${BACKEND_URL}/api/landmarks?country_id=${country_id}&category=official`,
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
      console.error('Error fetching landmarks:', error);
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
          <Text style={styles.landmarkDescription} numberOfLines={2}>
            {item.description}
          </Text>
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{name}</Text>
          <Text style={styles.headerSubtitle}>{landmarks.length} Landmarks</Text>
        </View>
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
            <Ionicons name="location" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No landmarks found</Text>
          </View>
        }
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
    marginRight: 16,
    padding: 8,
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
  listContainer: {
    padding: 16,
  },
  landmarkCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  landmarkImage: {
    width: '100%',
    height: 200,
  },
  landmarkContent: {
    padding: 16,
  },
  landmarkName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  landmarkDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
});
