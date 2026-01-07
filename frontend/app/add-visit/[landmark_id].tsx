import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKEND_URL } from '../../utils/config';
import theme from '../../styles/theme';

import { MapView, Marker } from '../../components/MapComponents';

// Helper to get token (works on both web and native)
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync('auth_token');
  }
};

export default function AddVisitScreen() {
  const { landmark_id } = useLocalSearchParams();
  const [photoBase64, setPhotoBase64] = useState('');
  const [comments, setComments] = useState('');
  const [diaryNotes, setDiaryNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [landmark, setLandmark] = useState<any>(null);
  const [locationMarker, setLocationMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    requestPermissions();
    fetchLandmark();
  }, []);

  const fetchLandmark = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/landmarks/${landmark_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLandmark(data);
        
        // For Northern Lights, set default location to landmark location
        if (data.name === 'Northern Lights' && data.latitude && data.longitude) {
          setLocationMarker({
            latitude: data.latitude,
            longitude: data.longitude
          });
        }
      }
    } catch (error) {
      console.error('Error fetching landmark:', error);
    }
  };

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraPermission.status !== 'granted' || mediaPermission.status !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library permissions are required to add visit photos.'
      );
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setPhotoBase64(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setPhotoBase64(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const showImagePicker = () => {
    if (Platform.OS === 'web') {
      // For web, use simpler prompt
      pickImageFromGallery();
    } else {
      Alert.alert(
        'Add Photo',
        'Choose a source',
        [
          { text: 'Camera', onPress: pickImageFromCamera },
          { text: 'Gallery', onPress: pickImageFromGallery },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleSubmit = async (skipPhoto: boolean = false) => {
    // Allow submission without photo if explicitly skipped
    if (!skipPhoto && !photoBase64) {
      Alert.alert('Photo Required', 'Please add a photo as proof of your visit, or choose "Skip Photo" to log this visit without verification.');
      return;
    }

    // For Northern Lights, require location pin
    if (landmark?.name === 'Northern Lights' && !locationMarker) {
      Alert.alert('Location Required', 'Please pin the exact location where you observed the Northern Lights');
      return;
    }

    setSubmitting(true);

    try {
      const token = await getToken();
      
      // Prepare visit location data for Northern Lights
      let visit_location = null;
      if (landmark?.name === 'Northern Lights' && locationMarker) {
        visit_location = {
          latitude: locationMarker.latitude,
          longitude: locationMarker.longitude,
          region: 'Custom location' // Could add reverse geocoding here
        };
      }
      
      const response = await fetch(`${BACKEND_URL}/api/visits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          landmark_id,
          photo_base64: photoBase64 || null, // Send null if no photo
          comments,
          diary_notes: diaryNotes,
          visit_location
        })
      });

      if (response.ok) {
        const visitType = photoBase64 ? 'verified' : 'unverified';
        const message = photoBase64 
          ? 'Visit added successfully! This verified visit will count towards your global leaderboard ranking.'
          : 'Visit logged! Note: Unverified visits (without photo) only count towards your friends leaderboard, not the global leaderboard.';
        
        Alert.alert('Success', message, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to add visit');
      }
    } catch (error) {
      console.error('Error submitting visit:', error);
      Alert.alert('Error', 'Failed to add visit');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSkipPhoto = () => {
    Alert.alert(
      'Skip Photo?',
      'Visits without photos are unverified and won\'t count towards global leaderboards. They will only appear in your friends leaderboard.\n\nAre you sure you want to continue?',
      [
        { text: 'Add Photo', style: 'cancel' },
        { text: 'Skip Photo', onPress: () => handleSubmit(true), style: 'destructive' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Visit</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Surface style={styles.photoSection}>
            {photoBase64 ? (
              <TouchableOpacity onPress={showImagePicker} activeOpacity={0.8}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
                  style={styles.photoPreview}
                />
                <View style={styles.changePhotoButton}>
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={showImagePicker}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={48} color="#6200ee" />
                <Text style={styles.addPhotoText}>Add Photo Proof</Text>
                <Text style={styles.addPhotoSubtext}>Required</Text>
              </TouchableOpacity>
            )}
          </Surface>

          {/* Northern Lights Location Picker - Native Only */}
          {landmark?.name === 'Northern Lights' && Platform.OS !== 'web' && MapView && (
            <Surface style={styles.mapSection}>
              <Text style={styles.sectionTitle}>
                📍 Pin Your Observation Location
              </Text>
              <Text style={styles.sectionSubtext}>
                Tap on the map to mark exactly where you observed the Northern Lights
              </Text>
              
              {locationMarker && (
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: locationMarker.latitude,
                    longitude: locationMarker.longitude,
                    latitudeDelta: 10,
                    longitudeDelta: 10,
                  }}
                  onPress={(e) => {
                    setLocationMarker(e.nativeEvent.coordinate);
                  }}
                >
                  <Marker
                    coordinate={locationMarker}
                    title="Northern Lights Observation"
                    description="Tap map to move pin"
                    pinColor="#00ff00"
                  />
                </MapView>
              )}
              
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={16} color="#6200ee" />
                <Text style={styles.locationText}>
                  {locationMarker 
                    ? `Lat: ${locationMarker.latitude.toFixed(4)}, Lon: ${locationMarker.longitude.toFixed(4)}`
                    : 'No location selected'
                  }
                </Text>
              </View>
            </Surface>
          )}

          {/* Northern Lights Location Input - Web Fallback */}
          {landmark?.name === 'Northern Lights' && Platform.OS === 'web' && (
            <Surface style={styles.mapSection}>
              <Text style={styles.sectionTitle}>
                📍 Northern Lights Location
              </Text>
              <Text style={styles.sectionSubtext}>
                Enter the coordinates where you observed the Northern Lights
              </Text>
              <View style={styles.webLocationInputs}>
                <TextInput
                  label="Latitude"
                  value={locationMarker?.latitude?.toString() || ''}
                  onChangeText={(text) => {
                    const lat = parseFloat(text);
                    if (!isNaN(lat)) {
                      setLocationMarker(prev => ({
                        latitude: lat,
                        longitude: prev?.longitude || 0
                      }));
                    }
                  }}
                  keyboardType="numeric"
                  style={styles.webInput}
                  mode="outlined"
                />
                <TextInput
                  label="Longitude"
                  value={locationMarker?.longitude?.toString() || ''}
                  onChangeText={(text) => {
                    const lon = parseFloat(text);
                    if (!isNaN(lon)) {
                      setLocationMarker(prev => ({
                        latitude: prev?.latitude || 0,
                        longitude: lon
                      }));
                    }
                  }}
                  keyboardType="numeric"
                  style={styles.webInput}
                  mode="outlined"
                />
              </View>
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={16} color="#6200ee" />
                <Text style={styles.locationText}>
                  {locationMarker 
                    ? `Lat: ${locationMarker.latitude.toFixed(4)}, Lon: ${locationMarker.longitude.toFixed(4)}`
                    : 'No location entered'
                  }
                </Text>
              </View>
            </Surface>
          )}

          <Surface style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Comments</Text>
            <TextInput
              value={comments}
              onChangeText={setComments}
              placeholder="What did you think of this place?"
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.textInput}
            />

            <Text style={styles.sectionTitle}>Diary Notes</Text>
            <TextInput
              value={diaryNotes}
              onChangeText={setDiaryNotes}
              placeholder="Add personal memories, tips, or details..."
              mode="outlined"
              multiline
              numberOfLines={5}
              style={styles.textInput}
            />
          </Surface>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting || !photoBase64}
            style={styles.submitButton}
            icon="check"
          >
            Add Visit
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  photoSection: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  addPhotoButton: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  addPhotoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6200ee',
    marginTop: 12,
  },
  addPhotoSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  photoPreview: {
    width: '100%',
    height: 250,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changePhotoText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  inputSection: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  mapSection: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  map: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  webLocationInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  webInput: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    marginBottom: 16,
  },
  submitButton: {
    marginBottom: 32,
  },
});
