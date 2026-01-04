import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Country {
  country_id: string;
  name: string;
}

export default function SuggestLandmarkScreen() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [name, setName] = useState('');
  const [countryId, setCountryId] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${BACKEND_URL}/api/countries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCountries(data);
        if (data.length > 0) {
          setCountryId(data[0].country_id);
        }
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const handleSubmit = async () => {
    if (!name || !countryId || !description || !imageUrl) {
      Alert.alert('Missing Fields', 'Please fill in all fields');
      return;
    }

    setSubmitting(true);

    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${BACKEND_URL}/api/landmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          country_id: countryId,
          description,
          image_url: imageUrl
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Landmark suggestion submitted!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to submit suggestion');
      }
    } catch (error) {
      console.error('Error submitting landmark:', error);
      Alert.alert('Error', 'Failed to submit suggestion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suggest Landmark</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Surface style={styles.formCard}>
            <Text style={styles.infoText}>
              Suggest a landmark that you think should be added to WanderList!
            </Text>

            <TextInput
              label="Landmark Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Country</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={countryId}
                  onValueChange={setCountryId}
                  style={styles.picker}
                >
                  {countries.map(country => (
                    <Picker.Item
                      key={country.country_id}
                      label={country.name}
                      value={country.country_id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.input}
            />

            <TextInput
              label="Image URL"
              value={imageUrl}
              onChangeText={setImageUrl}
              mode="outlined"
              placeholder="https://example.com/image.jpg"
              keyboardType="url"
              autoCapitalize="none"
              style={styles.input}
            />

            {imageUrl && (
              <Image
                source={{ uri: imageUrl }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            )}

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
              icon="check"
            >
              Submit Suggestion
            </Button>
          </Surface>
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
  formCard: {
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    marginBottom: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
});
