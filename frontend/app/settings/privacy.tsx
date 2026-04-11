import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { BACKEND_URL } from '../../utils/config';
import { HeaderBranding } from '../../components/BrandedGlobeIcon';
import { getToken } from '../utils/token';


interface PrivacyOption {
  value: 'public' | 'friends' | 'private';
  icon: string;
  label: string;
  description: string;
  color: string;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    value: 'public',
    icon: 'globe-outline',
    label: 'Public',
    description: 'Your visits, photos and diary entries are visible to everyone',
    color: '#27ae60',
  },
  {
    value: 'friends',
    icon: 'people-outline',
    label: 'Friends Only',
    description: 'Only your friends can see your visits and photos',
    color: '#3498db',
  },
  {
    value: 'private',
    icon: 'lock-closed-outline',
    label: 'Private',
    description: 'Only you can see your visits -- nothing shared',
    color: '#e74c3c',
  },
];

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, gradientColors } = useTheme();
  const [defaultPrivacy, setDefaultPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [commentPermission, setCommentPermission] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        setCommentPermission(user.comment_permission || 'everyone');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacy = async (value: 'public' | 'friends' | 'private') => {
    const performUpdate = async () => {
      setSaving(true);
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
          const data = await response.json();
          Alert.alert(
            'Privacy Updated',
            `Default set to ${value}. Updated ${data.updated_visits} visits and ${data.updated_activities} activities.`
          );
        } else {
          Alert.alert('Error', 'Failed to update privacy setting');
        }
      } catch (error) {
        console.error('Error updating privacy:', error);
        Alert.alert('Error', 'Failed to update privacy setting');
      } finally {
        setSaving(false);
      }
    };

    if (value === 'friends' || value === 'private') {
      Alert.alert(
        'Leaderboard Impact',
        'With this privacy setting, your visits will not earn verified points for the global leaderboard. Your total points for the friends leaderboard are not affected.\n\nThis will update ALL your existing content retroactively.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: performUpdate },
        ]
      );
    } else if (value === 'public' && defaultPrivacy !== 'public') {
      Alert.alert(
        'Welcome Back to Public!',
        'Your verified points from photo-documented visits will now count towards the global leaderboard again.\n\nThis will update ALL your existing content retroactively.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch to Public', onPress: performUpdate },
        ]
      );
    } else {
      performUpdate();
    }
  };

  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={gradientColors}
          start={gradients.horizontal.start}
          end={gradients.horizontal.end}
          style={[styles.header, { paddingTop: topPadding }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Privacy</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} data-testid="privacy-settings-screen">
      {/* Header */}
      <LinearGradient
        colors={gradientColors}
        start={gradients.horizontal.start}
        end={gradients.horizontal.end}
        style={[styles.header, { paddingTop: topPadding }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} data-testid="privacy-back-button">
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Privacy</Text>
          </View>
          <TouchableOpacity
            style={styles.brandingContainer}
            onPress={() => router.push('/about')}
            activeOpacity={0.7}
          >
            <HeaderBranding size={18} textColor="#2A2A2A" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Default Privacy Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Default Privacy</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Applied to all new visits automatically
              </Text>
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
                    { backgroundColor: colors.background },
                    isSelected && [styles.privacyOptionSelected, { backgroundColor: colors.surface, borderColor: option.color }],
                  ]}
                  onPress={() => updatePrivacy(option.value)}
                  activeOpacity={0.7}
                  disabled={saving}
                  data-testid={`privacy-option-${option.value}`}
                >
                  <View
                    style={[
                      styles.privacyIconCircle,
                      { backgroundColor: colors.background },
                      isSelected && { backgroundColor: option.color },
                    ]}
                  >
                    <Ionicons name={option.icon as any} size={20} color={isSelected ? '#fff' : option.color} />
                  </View>
                  <View style={styles.privacyContent}>
                    <Text style={[styles.privacyLabel, { color: colors.text }, isSelected && { color: option.color, fontWeight: '700' }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.privacyDescription, { color: colors.textSecondary }]}>{option.description}</Text>
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

        {/* Per-Item Override Explanation */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: '#3498db15' }]}>
              <Ionicons name="options" size={22} color="#3498db" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Per-Visit Privacy</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Override the default for individual visits
              </Text>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
            <View style={styles.infoRow}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                When recording a new visit, you can choose a different privacy level just for that visit.
              </Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="eye-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                You can also change the privacy of any existing visit from its detail page.
              </Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="refresh-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Changing the default above updates all existing visits retroactively.
              </Text>
            </View>
          </View>
        </View>

        {/* Leaderboard Impact */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: '#f39c1215' }]}>
              <Ionicons name="trophy" size={22} color="#f39c12" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Leaderboard & Points</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                How privacy affects your ranking
              </Text>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
            <View style={styles.infoRow}>
              <Ionicons name="globe-outline" size={20} color="#27ae60" />
              <Text style={[styles.infoText, { color: colors.text }]}>
                <Text style={{ fontWeight: '700' }}>Public</Text> visits with photos earn verified points for the global leaderboard.
              </Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={20} color="#3498db" />
              <Text style={[styles.infoText, { color: colors.text }]}>
                <Text style={{ fontWeight: '700' }}>Friends Only</Text> and <Text style={{ fontWeight: '700' }}>Private</Text> visits still earn total points, visible on the friends leaderboard.
              </Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="swap-horizontal" size={20} color="#8e44ad" />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Switching back to Public restores your verified points automatically.
              </Text>
            </View>
          </View>
        </View>

        {/* Comment Permission */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: '#8e44ad15' }]}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#8e44ad" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Who Can Comment</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Control who can comment on your shared content
              </Text>
            </View>
          </View>

          <View style={styles.privacyOptions}>
            {([
              { value: 'everyone' as const, icon: 'globe-outline', label: 'Everyone', desc: 'Anyone who can see your content can comment', color: '#27ae60' },
              { value: 'friends' as const, icon: 'people-outline', label: 'Friends Only', desc: 'Only friends can comment, even on public content', color: '#3498db' },
              { value: 'nobody' as const, icon: 'chatbubble-outline', label: 'Nobody', desc: 'Comments are disabled on all your content', color: '#e74c3c' },
            ]).map((opt) => {
              const isSelected = commentPermission === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.privacyOption,
                    { backgroundColor: colors.background },
                    isSelected && [styles.privacyOptionSelected, { backgroundColor: colors.surface, borderColor: opt.color }],
                  ]}
                  onPress={async () => {
                    setCommentPermission(opt.value);
                    try {
                      const token = await getToken();
                      await fetch(`${BACKEND_URL}/api/auth/comment-permission`, {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ comment_permission: opt.value }),
                      });
                    } catch (e) { console.error(e); }
                  }}
                  activeOpacity={0.7}
                  data-testid={`comment-perm-${opt.value}`}
                >
                  <View style={[styles.privacyIconCircle, { backgroundColor: colors.background }, isSelected && { backgroundColor: opt.color }]}>
                    <Ionicons name={opt.icon as any} size={20} color={isSelected ? '#fff' : opt.color} />
                  </View>
                  <View style={styles.privacyContent}>
                    <Text style={[styles.privacyLabel, { color: colors.text }, isSelected && { color: opt.color, fontWeight: '700' }]}>{opt.label}</Text>
                    <Text style={[styles.privacyDescription, { color: colors.textSecondary }]}>{opt.desc}</Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: opt.color }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
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
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  privacyOptions: {
    gap: 10,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  privacyOptionSelected: {
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
    marginBottom: 2,
  },
  privacyDescription: {
    fontSize: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    borderRadius: 14,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  infoDivider: {
    height: 1,
    marginVertical: 12,
    marginLeft: 32,
  },
});
