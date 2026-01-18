import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Platform, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../styles/theme';
import { BACKEND_URL } from '../utils/config';
import { PersistentTabBar } from '../components/PersistentTabBar';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface PrivacyOption {
  value: 'public' | 'friends' | 'private';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  color: string;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    value: 'public',
    icon: 'globe-outline',
    label: 'Public',
    description: 'Everyone can see',
    color: '#27ae60',
  },
  {
    value: 'friends',
    icon: 'people-outline',
    label: 'Friends Only',
    description: 'Only friends can see',
    color: '#3498db',
  },
  {
    value: 'private',
    icon: 'lock-closed-outline',
    label: 'Private',
    description: 'Only you can see',
    color: '#e74c3c',
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [defaultPrivacy, setDefaultPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [pushNotifications, setPushNotifications] = useState(true);

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

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 24);

  return (
    <View style={styles.container}>
      {/* Header with gradient */}
      <LinearGradient
        colors={gradients.oceanToSand}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding + 10 }]}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight}>
          <Ionicons name="globe-outline" size={20} color="#fff" />
          <Text style={styles.headerBrand}>WanderList</Text>
        </View>
      </LinearGradient>
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(77, 184, 216, 0.1)' }]}>
              <Ionicons name="shield-checkmark" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Privacy</Text>
              <Text style={styles.sectionSubtitle}>Who can see your visits and activity</Text>
            </View>
          </View>
          
          <View style={styles.privacyOptions}>
            {PRIVACY_OPTIONS.map((option) => {
              const isSelected = defaultPrivacy === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.privacyOption,
                    isSelected && styles.privacyOptionSelected,
                    isSelected && { borderColor: option.color }
                  ]}
                  onPress={() => updatePrivacy(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.privacyIconCircle,
                    isSelected && { backgroundColor: option.color }
                  ]}>
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isSelected ? '#fff' : option.color}
                    />
                  </View>
                  <View style={styles.privacyContent}>
                    <Text style={[
                      styles.privacyLabel,
                      isSelected && { color: option.color, fontWeight: '700' }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.privacyDescription}>{option.description}</Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: option.color }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(201, 169, 97, 0.1)' }]}>
              <Ionicons name="notifications" size={22} color={theme.colors.accent} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              <Text style={styles.sectionSubtitle}>Stay updated on your journey</Text>
            </View>
          </View>
          
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                  <Ionicons name="phone-portrait-outline" size={18} color="#3498db" />
                </View>
                <View style={styles.settingTexts}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>Friend activity & achievements</Text>
                </View>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: '#E0E0E0', true: theme.colors.primary + '60' }}
                thumbColor={pushNotifications ? theme.colors.primary : '#f4f3f4'}
                ios_backgroundColor="#E0E0E0"
              />
            </View>
            
            <View style={styles.settingDivider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(155, 89, 182, 0.1)' }]}>
                  <Ionicons name="mail-outline" size={18} color="#9b59b6" />
                </View>
                <View style={styles.settingTexts}>
                  <Text style={styles.settingLabel}>Email Notifications</Text>
                  <Text style={styles.settingDescription}>Updates and travel tips</Text>
                </View>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{ false: '#E0E0E0', true: theme.colors.primary + '60' }}
                thumbColor={emailNotifications ? theme.colors.primary : '#f4f3f4'}
                ios_backgroundColor="#E0E0E0"
              />
            </View>
          </View>
        </View>

        {/* Language Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(46, 204, 113, 0.1)' }]}>
              <Ionicons name="language" size={22} color="#2ecc71" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Language</Text>
              <Text style={styles.sectionSubtitle}>App display language</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.languageOption} activeOpacity={0.7}>
            <View style={styles.settingItemLeft}>
              <View style={[styles.settingIcon, { backgroundColor: 'rgba(52, 73, 94, 0.1)' }]}>
                <Text style={styles.flagEmoji}>🇺🇸</Text>
              </View>
              <View style={styles.settingTexts}>
                <Text style={styles.settingLabel}>English</Text>
                <Text style={styles.settingDescription}>United States</Text>
              </View>
            </View>
            <View style={styles.selectedLanguage}>
              <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(149, 165, 166, 0.1)' }]}>
              <Ionicons name="person" size={22} color="#7f8c8d" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Account</Text>
              <Text style={styles.sectionSubtitle}>Manage your account details</Text>
            </View>
          </View>
          
          <View style={styles.accountList}>
            <TouchableOpacity 
              style={styles.accountItem}
              onPress={() => Alert.alert('Coming Soon', 'Email change feature coming soon')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                  <Ionicons name="at" size={18} color="#3498db" />
                </View>
                <Text style={styles.accountLabel}>Change Email</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
            </TouchableOpacity>
            
            <View style={styles.settingDivider} />
            
            <TouchableOpacity 
              style={styles.accountItem}
              onPress={() => Alert.alert('Coming Soon', 'Password change feature coming soon')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(241, 196, 15, 0.1)' }]}>
                  <Ionicons name="key-outline" size={18} color="#f1c40f" />
                </View>
                <Text style={styles.accountLabel}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
            </TouchableOpacity>
            
            <View style={styles.settingDivider} />
            
            <TouchableOpacity 
              style={styles.accountItem}
              onPress={() => {
                Alert.alert(
                  'Delete Account',
                  'This action cannot be undone. All your data will be permanently deleted.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => {} },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}>
                  <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                </View>
                <Text style={[styles.accountLabel, { color: '#e74c3c' }]}>Delete Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>WanderList v4.32</Text>
          <Text style={styles.copyrightText}>© 2025 WanderList. All rights reserved.</Text>
        </View>

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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  privacyOptions: {
    gap: 10,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  privacyOptionSelected: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  privacyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  privacyContent: {
    flex: 1,
  },
  privacyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  privacyDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsList: {
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTexts: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  settingDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 62,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: theme.colors.background,
    borderRadius: 14,
  },
  flagEmoji: {
    fontSize: 20,
  },
  selectedLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accountList: {
    backgroundColor: theme.colors.background,
    borderRadius: 14,
    overflow: 'hidden',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  accountLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  bottomSpacer: {
    height: 20,
  },
});
