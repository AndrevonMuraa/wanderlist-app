import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Platform, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import theme, { gradients, spacing, borderRadius, typography } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import { BACKEND_URL } from '../../utils/config';
import { PersistentTabBar } from '../../components/PersistentTabBar';

import { HeaderBranding } from '../../components/BrandedGlobeIcon';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows, gradientColors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { clearCache, isOnline, pendingVisitsCount, lastSyncTime } = useOffline();
  const [defaultPrivacy, setDefaultPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  
  // Check if user is admin or moderator
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';

  const handleChangePassword = () => {
    Alert.prompt(
      'Change Password',
      'Enter your current password:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (currentPassword?: string) => {
            if (!currentPassword) return;
            Alert.prompt(
              'New Password',
              'Enter your new password (min 6 characters):',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Change',
                  onPress: async (newPassword?: string) => {
                    if (!newPassword || newPassword.length < 6) {
                      Alert.alert('Error', 'Password must be at least 6 characters');
                      return;
                    }
                    try {
                      const token = Platform.OS === 'web' 
                        ? localStorage.getItem('auth_token')
                        : await SecureStore.getItemAsync('auth_token');
                      const response = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          current_password: currentPassword,
                          new_password: newPassword,
                        }),
                      });
                      if (response.ok) {
                        Alert.alert('Success', 'Password changed successfully');
                      } else {
                        const error = await response.json();
                        Alert.alert('Error', error.detail || 'Failed to change password');
                      }
                    } catch {
                      Alert.alert('Error', 'Network error. Please try again.');
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ],
      'secure-text'
    );
  };


  const handleClearCache = () => {
    Alert.alert(
      'Clear Offline Cache',
      'This will remove all cached data. You will need to be online to reload your journey data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive', 
          onPress: async () => {
            await clearCache();
            Alert.alert('Success', 'Offline cache cleared');
          }
        },
      ]
    );
  };
  
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
        const data = await response.json();
        setDefaultPrivacy(data.default_privacy || 'public');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with gradient - matching standard app header style */}
      <LinearGradient
        colors={gradientColors}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding }]}
      >
        {/* Row: Back Button + Title Left, Branding Right */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={'#fff'} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: '#fff' }]}>{t('settings.title')}</Text>
          </View>
          <TouchableOpacity 
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <HeaderBranding size={18} textColor={"#2A2A2A"} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.privacy')}</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{t('settings.whoCanSee')}</Text>
            </View>
          </View>
          
          <View style={[styles.settingsList, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/settings/privacy')}
              activeOpacity={0.7}
              data-testid="privacy-settings-link"
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(39, 174, 96, 0.1)' }]}>
                  <Ionicons name="shield-checkmark" size={18} color="#27ae60" />
                </View>
                <View style={styles.settingTexts}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Privacy & Visibility</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Default: {defaultPrivacy === 'public' ? 'Public' : defaultPrivacy === 'friends' ? 'Friends Only' : 'Private'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="notifications" size={22} color={colors.accent} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('notifications.title')}</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{t('notifications.pushNotifications')}</Text>
            </View>
          </View>
          
          <View style={[styles.settingsList, { backgroundColor: colors.background }]}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/notification-settings')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                  <Ionicons name="phone-portrait-outline" size={18} color="#3498db" />
                </View>
                <View style={styles.settingTexts}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>{t('notifications.pushNotifications')}</Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>{t('notifications.likesDesc')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(149, 165, 166, 0.15)' }]}>
              <Ionicons name="person" size={22} color="#7f8c8d" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.account')}</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Manage your account</Text>
            </View>
          </View>
          
          <View style={[styles.accountList, { backgroundColor: colors.background }]}>
            {/* Admin Panel - Only visible to admins/moderators */}
            {isAdmin && (
              <>
                <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity 
                  style={styles.accountItem}
                  onPress={() => router.push('/admin')}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                      <Ionicons name="shield-checkmark" size={18} color="#8b5cf6" />
                    </View>
                    <Text style={[styles.accountLabel, { color: colors.text }]}>Admin Panel</Text>
                  </View>
                  <View style={[styles.adminBadge, { backgroundColor: '#8b5cf6' }]}>
                    <Text style={styles.adminBadgeText}>{user?.role?.toUpperCase()}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              </>
            )}
            
            {user?.has_password !== false && (
              <>
                <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
                
                <TouchableOpacity 
                  style={styles.accountItem}
                  onPress={handleChangePassword}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: 'rgba(241, 196, 15, 0.1)' }]}>
                      <Ionicons name="key-outline" size={18} color="#f1c40f" />
                    </View>
                    <Text style={[styles.accountLabel, { color: colors.text }]}>{t('settings.changePassword')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              </>
            )}
            
            <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
            
            <TouchableOpacity 
              style={styles.accountItem}
              onPress={handleClearCache}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(149, 165, 166, 0.15)' }]}>
                  <Ionicons name="cloud-offline-outline" size={18} color="#95a5a6" />
                </View>
                <Text style={[styles.accountLabel, { color: colors.text }]}>Clear Offline Cache</Text>
              </View>
              {pendingVisitsCount > 0 && (
                <View style={[styles.cacheBadge, { backgroundColor: '#f59e0b' }]}>
                  <Text style={styles.cacheBadgeText}>{pendingVisitsCount} pending</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
            
            <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
            
            <TouchableOpacity 
              style={styles.accountItem}
              onPress={() => {
                Alert.alert(
                  'Delete Account',
                  'Your account will be deactivated and permanently deleted after 30 days. If you change your mind, simply log in again within 30 days to reactivate.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Deactivate', 
                      style: 'destructive', 
                      onPress: async () => {
                        try {
                          const token = await getToken();
                          const response = await fetch(`${BACKEND_URL}/api/auth/account`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (response.ok) {
                            if (Platform.OS === 'web') {
                              localStorage.removeItem('auth_token');
                            } else {
                              await SecureStore.deleteItemAsync('auth_token');
                            }
                            Alert.alert(
                              'Account Deactivated',
                              'Your account has been deactivated and will be permanently deleted in 30 days. Log in again to reactivate.',
                              [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
                            );
                          } else {
                            Alert.alert('Error', 'Failed to deactivate account. Please try again.');
                          }
                        } catch (error) {
                          Alert.alert('Error', 'Something went wrong. Please try again.');
                        }
                      }
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}>
                  <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                </View>
                <Text style={[styles.accountLabel, { color: '#e74c3c' }]}>{t('settings.deleteAccount')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="document-text" size={22} color={colors.primary} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.about')}</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{t('settings.privacyPolicy')}</Text>
            </View>
          </View>
          
          <View style={[styles.accountList, { backgroundColor: colors.background }]}>
            <TouchableOpacity 
              style={styles.accountItem}
              onPress={() => router.push('/privacy-policy')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(46, 204, 113, 0.1)' }]}>
                  <Ionicons name="shield-checkmark" size={18} color="#2ecc71" />
                </View>
                <Text style={[styles.accountLabel, { color: colors.text }]}>{t('settings.privacyPolicy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
            
            <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
            
            <TouchableOpacity 
              style={styles.accountItem}
              onPress={() => router.push('/terms-of-service')}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                  <Ionicons name="reader" size={18} color="#3498db" />
                </View>
                <Text style={[styles.accountLabel, { color: colors.text }]}>{t('settings.termsOfService')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.textLight }]}>WanderMark v1.1.0</Text>
          <Text style={[styles.copyrightText, { color: colors.textLight }]}>© 2026 WanderMark. All rights reserved.</Text>
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandingTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
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
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  cacheBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  cacheBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
