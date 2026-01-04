import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Button, ActivityIndicator } from 'react-native-paper';
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

export default function LandmarkDetailScreen() {
  const { landmark_id } = useLocalSearchParams();
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [upvoted, setUpvoted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchLandmark();
  }, []);

  const fetchLandmark = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${BACKEND_URL}/api/landmarks/${landmark_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLandmark(data);
      }
    } catch (error) {
      console.error('Error fetching landmark:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${BACKEND_URL}/api/landmarks/${landmark_id}/upvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUpvoted(data.upvoted);
        // Refresh landmark data
        fetchLandmark();
      }
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  const handleMarkAsVisited = () => {
    router.push(`/add-visit/${landmark_id}`);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (!landmark) {
    return (
      <View style={styles.centerContainer}>
        <Text>Landmark not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        <Image
          source={{ uri: landmark.image_url }}
          style={styles.heroImage}
        />

        <Surface style={styles.contentCard}>
          <Text style={styles.landmarkName}>{landmark.name}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.metaText}>{landmark.country_name}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="earth" size={16} color="#666" />
              <Text style={styles.metaText}>{landmark.continent}</Text>
            </View>
          </View>

          <Text style={styles.description}>{landmark.description}</Text>

          {landmark.category === 'user_suggested' && (
            <View style={styles.upvoteContainer}>
              <TouchableOpacity
                style={styles.upvoteButton}
                onPress={handleUpvote}
              >
                <Ionicons
                  name={upvoted ? 'heart' : 'heart-outline'}
                  size={24}
                  color={upvoted ? '#d32f2f' : '#666'}
                />
                <Text style={styles.upvoteText}>{landmark.upvotes} upvotes</Text>
              </TouchableOpacity>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleMarkAsVisited}
            icon="camera"
            style={styles.visitButton}
          >
            Mark as Visited
          </Button>
        </Surface>
      </ScrollView>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    height: 300,
  },
  contentCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  landmarkName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  upvoteContainer: {
    marginBottom: 16,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  upvoteText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  visitButton: {
    marginTop: 8,
  },
});
