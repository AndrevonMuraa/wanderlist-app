import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../contexts/AuthContext';

export default function AutoLoginScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('Logging you in...');

  useEffect(() => {
    autoLogin();
  }, [token]);

  const autoLogin = async () => {
    try {
      if (!token || typeof token !== 'string') {
        setStatus('Invalid login link');
        setTimeout(() => router.replace('/(auth)/login'), 2000);
        return;
      }

      // Store the token
      if (Platform.OS === 'web') {
        localStorage.setItem('auth_token', token);
      } else {
        await SecureStore.setItemAsync('auth_token', token);
      }

      setStatus('Success! Redirecting...');

      // Refresh auth context
      if (refreshUser) {
        await refreshUser();
      }

      // Redirect to main app
      setTimeout(() => {
        router.replace('/(tabs)/journey');
      }, 1000);

    } catch (error) {
      console.error('Auto-login error:', error);
      setStatus('Login failed. Redirecting to login page...');
      setTimeout(() => router.replace('/(auth)/login'), 2000);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4DB8D8" />
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
