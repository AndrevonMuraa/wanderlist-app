import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { BACKEND_URL } from '../../utils/config';
import { getToken } from '../../utils/token';
import UniversalHeader from '../../components/UniversalHeader';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const handleChangePassword = () => {
    Alert.prompt(
      'Change password',
      'Enter your new password (min 8 characters):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async (newPassword) => {
            if (!newPassword || newPassword.length < 8) {
              Alert.alert('Error', 'Password must be at least 8 characters');
              return;
            }
            try {
              const token = await getToken();
              const res = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ new_password: newPassword }),
              });
              if (res.ok) {
                Alert.alert('Success', 'Password changed successfully');
              } else {
                Alert.alert('Error', 'Failed to change password');
              }
            } catch {
              Alert.alert('Error', 'Something went wrong');
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
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
                  'Account deactivated',
                  'Your account has been deactivated and will be permanently deleted in 30 days. Log in again to reactivate.',
                  [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
                );
              } else {
                Alert.alert('Error', 'Failed to deactivate account. Please try again.');
              }
            } catch {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <UniversalHeader title="Account settings" />
      
      <View style={{ padding: 16, gap: 12 }}>
        {/* Change Password */}
        {user?.has_password !== false && (
          <Surface style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.row} onPress={handleChangePassword} activeOpacity={0.7}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(241, 196, 15, 0.1)' }]}>
                <Ionicons name="key-outline" size={18} color="#f1c40f" />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Change password</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>Update your account password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </Surface>
        )}

        {/* Delete Account */}
        <Surface style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(231, 76, 60, 0.08)' }]}>
              <Ionicons name="trash-outline" size={18} color="#e74c3c" />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: '#e74c3c' }]}>Delete account</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>Deactivate and schedule deletion</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </Surface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 14, overflow: 'hidden', ...theme.shadows.card },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowDesc: { fontSize: 12, marginTop: 2 },
});
