import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Button, Divider, Switch, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Stats {
  total_visits: number;
  countries_visited: number;
  continents_visited: number;
  friends_count: number;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${BACKEND_URL}/api/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Profile</Text>
        </LinearGradient>

        <Surface style={styles.profileCard}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.defaultProfileImage]}>
              <Ionicons name="person-outline" size={48} color={theme.colors.textSecondary} />
            </View>
          )}
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={[styles.premiumBadge, {
            backgroundColor: user?.is_premium ? theme.colors.premium + '20' : theme.colors.surfaceTinted
          }]}>
            {user?.is_premium ? (
              <>
                <Ionicons name="star" size={16} color={theme.colors.premium} />
                <Text style={[styles.premiumText, { color: theme.colors.premium }]}>Premium Member</Text>
              </>
            ) : (
              <>
                <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.freemiumText}>Free Member</Text>
              </>
            )}
          </View>
        </Surface>

        {stats && (
          <Surface style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Ionicons name="flag-outline" size={32} color={theme.colors.primary} />
                <Text style={styles.statNumber}>{stats.total_visits}</Text>
                <Text style={styles.statLabel}>Total Visits</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="map-outline" size={32} color={theme.colors.secondary} />
                <Text style={styles.statNumber}>{stats.countries_visited}</Text>
                <Text style={styles.statLabel}>Countries</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="earth-outline" size={32} color={theme.colors.accent} />
                <Text style={styles.statNumber}>{stats.continents_visited}</Text>
                <Text style={styles.statLabel}>Continents</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="people-outline" size={32} color={theme.colors.accentWarm} />
                <Text style={styles.statNumber}>{stats.friends_count}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
            </View>
          </Surface>
        )}

        <Surface style={styles.menuCard}>
          <List.Item
            title="Friends"
            description="Manage your friend connections"
            left={props => <List.Icon {...props} icon="account-group-outline" color={theme.colors.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.textLight} />}
            onPress={() => router.push('/friends')}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Settings"
            description="App preferences"
            left={props => <List.Icon {...props} icon="cog-outline" color={theme.colors.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.textLight} />}
            onPress={() => {}}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />
        </Surface>

        <Button
          mode="outlined"
          onPress={handleLogout}
          icon="logout"
          style={styles.logoutButton}
          textColor={theme.colors.error}
          buttonColor={theme.colors.surface}
        >
          Logout
        </Button>

        <Text style={styles.versionText}>WanderList v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: '#fff',
  },
  profileCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing.md,
  },
  defaultProfileImage: {
    backgroundColor: theme.colors.surfaceTinted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
  },
  premiumText: {
    marginLeft: theme.spacing.xs,
    ...theme.typography.labelSmall,
    fontWeight: '600',
  },
  freemiumText: {
    marginLeft: theme.spacing.xs,
    ...theme.typography.labelSmall,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  statsCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceTinted,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  statNumber: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  menuCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  listItemTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  listItemDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  divider: {
    backgroundColor: theme.colors.border,
  },
  logoutButton: {
    margin: theme.spacing.md,
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  versionText: {
    textAlign: 'center',
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xl,
  },
});
