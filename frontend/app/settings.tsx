import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, Surface, List, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { PersistentTabBar } from '../components/PersistentTabBar';
import { PrivacySelector } from '../components/PrivacySelector';
import UniversalHeader from '../components/UniversalHeader';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

export default function SettingsScreen() {
  const router = useRouter();
  const [defaultPrivacy, setDefaultPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [language, setLanguage] = useState('en');

  // Navigate back to profile explicitly
  const handleBack = () => {
    router.push('/(tabs)/profile');
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const user = await response.json();
        setDefaultPrivacy(user.default_privacy || 'public');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updatePrivacy = async (value: 'public' | 'friends' | 'private') => {
    setDefaultPrivacy(value);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/auth/privacy`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ privacy: value }),
      });
      
      if (response.ok) {
        Alert.alert('Updated', `Default privacy set to ${value}`);
      } else {
        Alert.alert('Error', 'Failed to update privacy setting');
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
      Alert.alert('Error', 'Failed to update privacy setting');
    }
  };

  return (
    <View style={styles.container}>
      <UniversalHeader title="Settings" onBack={handleBack} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Privacy Settings */}
        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Privacy</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose who can see your visits and activity
          </Text>
          <View style={styles.privacyContainer}>
            <PrivacySelector selected={defaultPrivacy} onChange={updatePrivacy} />
          </View>
          <View style={styles.privacyLegend}>
            <View style={styles.legendItem}>
              <Ionicons name="globe" size={14} color="#27ae60" />
              <Text style={styles.legendText}>Public - Everyone can see</Text>
            </View>
            <View style={styles.legendItem}>
              <Ionicons name="people" size={14} color="#3498db" />
              <Text style={styles.legendText}>Friends - Only your friends</Text>
            </View>
            <View style={styles.legendItem}>
              <Ionicons name="lock-closed" size={14} color="#e74c3c" />
              <Text style={styles.legendText}>Private - Only you</Text>
            </View>
          </View>
        </Surface>

        {/* Notification Settings */}
        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={24} color={theme.colors.accent} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          
          <List.Item
            title="Push Notifications"
            description="Get notified about friend activity and achievements"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                color={theme.colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Email Notifications"
            description="Receive updates and tips via email"
            left={props => <List.Icon {...props} icon="email" />}
            right={() => (
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                color={theme.colors.primary}
              />
            )}
          />
        </Surface>

        {/* Language */}
        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="language" size={24} color={theme.colors.accentYellow} />
            <Text style={styles.sectionTitle}>Language</Text>
          </View>
          <List.Item
            title="English"
            description="App language"
            left={props => <List.Icon {...props} icon="earth" />}
            right={() => <Ionicons name="checkmark" size={24} color={theme.colors.primary} />}
          />
        </Surface>

        {/* Account */}
        <Surface style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={24} color={theme.colors.primaryLight} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <List.Item
            title="Change Email"
            left={props => <List.Icon {...props} icon="at" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Coming Soon', 'Email change feature coming soon')}
          />
          <Divider />
          <List.Item
            title="Change Password"
            left={props => <List.Icon {...props} icon="key" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Coming Soon', 'Password change feature coming soon')}
          />
          <Divider />
          <List.Item
            title="Delete Account"
            titleStyle={{ color: theme.colors.error }}
            left={props => <List.Icon {...props} icon="delete" color={theme.colors.error} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.error} />}
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'This action cannot be undone. Are you sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => {} },
                ]
              );
            }}
          />
        </Surface>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      <PersistentTabBar />
    </View>
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
    paddingTop: theme.spacing.md,
  },
  section: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  privacyContainer: {
    marginTop: theme.spacing.sm,
  },
  privacyLegend: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
