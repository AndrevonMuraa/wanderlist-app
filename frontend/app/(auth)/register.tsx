import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Surface, Title, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import theme from '../../styles/theme';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, loginWithGoogle, loginWithApple, isAppleSignInAvailable } = useAuth();
  const router = useRouter();

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError('Google sign-up failed. Please try again.');
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    if (Platform.OS !== 'ios') {
      setError('Apple Sign-In is only available on iOS devices');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await loginWithApple();
      router.replace('/(tabs)/explore');
    } catch (err: any) {
      if (err.message !== 'Apple Sign-In was cancelled') {
        setError('Apple sign-up failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !username || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    // Validate username format (alphanumeric and underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(email, password, name, username);
      router.replace('/(tabs)/explore');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <LinearGradient
            colors={[theme.colors.background, theme.colors.surfaceTinted]}
            style={styles.gradientBackground}
          >
            <View style={styles.logoContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="person-add-outline" size={64} color={theme.colors.primary} />
              </View>
              <Title style={styles.title}>Create Account</Title>
              <Text style={styles.subtitle}>Join WanderMark and start your journey</Text>
            </View>

            <Surface style={styles.surface}>
              <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.text}
              />

              <TextInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.text}
                placeholder="e.g., john_doe123"
              />

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.text}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.text}
              />

              <Button
                mode="contained"
                onPress={handleRegister}
                loading={loading}
                disabled={loading}
                style={styles.button}
                buttonColor={theme.colors.primary}
                textColor="#fff"
              >
                Sign Up
              </Button>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                mode="outlined"
                onPress={handleGoogleSignUp}
                disabled={loading}
                icon="google"
                style={styles.googleButton}
                textColor={theme.colors.text}
                buttonColor={theme.colors.surface}
              >
                Sign up with Google
              </Button>

              {/* Apple Sign-In Button */}
              {Platform.OS === 'ios' && isAppleSignInAvailable ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={8}
                  style={styles.appleButton}
                  onPress={handleAppleSignUp}
                />
              ) : Platform.OS !== 'ios' ? (
                <TouchableOpacity
                  style={styles.appleButton}
                  onPress={() => setError('Apple Sign-In is only available on iOS devices')}
                >
                  <Ionicons name="logo-apple" size={20} color="#fff" />
                  <Text style={styles.appleButtonText}>Sign up with Apple</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.linkContainer}
              >
                <Text style={styles.linkText}>Already have an account? Login</Text>
              </TouchableOpacity>
            </Surface>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
        style={{ backgroundColor: theme.colors.error }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  surface: {
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  button: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  linkContainer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  linkText: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
});
