import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Button, Divider, Switch, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <Surface style={styles.profileCard}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.defaultProfileImage]}>
              <Ionicons name="person" size={48} color="#666" />
            </View>
          )}
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.premiumBadge}>
            {user?.is_premium ? (
              <>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.premiumText}>Premium Member</Text>
              </>
            ) : (
              <>
                <Ionicons name="person" size={16} color="#666" />
                <Text style={styles.freemiumText}>Freemium Member</Text>
              </>
            )}
          </View>
        </Surface>

        {stats && (
          <Surface style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Ionicons name="flag" size={32} color="#6200ee" />
                <Text style={styles.statNumber}>{stats.total_visits}</Text>
                <Text style={styles.statLabel}>Total Visits</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="map" size={32} color="#6200ee" />
                <Text style={styles.statNumber}>{stats.countries_visited}</Text>
                <Text style={styles.statLabel}>Countries</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="earth" size={32} color="#6200ee" />
                <Text style={styles.statNumber}>{stats.continents_visited}</Text>
                <Text style={styles.statLabel}>Continents</Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="people" size={32} color="#6200ee" />
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
            left={props => <List.Icon {...props} icon="account-group" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/friends')}
          />
          <Divider />
          <List.Item
            title="Settings"
            description="App preferences"
            left={props => <List.Icon {...props} icon="cog" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </Surface>

        <Button
          mode="outlined"
          onPress={handleLogout}
          icon="logout"
          style={styles.logoutButton}
          textColor="#d32f2f"
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#6200ee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileCard: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    elevation: 2,
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  defaultProfileImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  premiumText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
  },
  freemiumText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  menuCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  logoutButton: {
    margin: 16,
    borderColor: '#d32f2f',
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginBottom: 32,
  },
});
