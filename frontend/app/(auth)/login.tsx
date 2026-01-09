import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Surface, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.replace('/(tabs)/explore');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await loginWithGoogle();
      // Note: On web, this will redirect away, so loading state doesn't matter
      // On mobile, the loading will be cleared when callback is handled
    } catch (err: any) {
      setError('Google login failed. Please try again.');
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
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="earth" size={56} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Welcome to WanderList</Text>
            <Text style={styles.subtitle}>Explore iconic landmarks across the world</Text>
          </View>

          <Surface style={styles.surface}>
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
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              buttonColor={theme.colors.primary}
              textColor="#fff"
            >
              Login
            </Button>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              mode="outlined"
              onPress={handleGoogleLogin}
              disabled={loading}
              icon="google"
              style={styles.googleButton}
              textColor={theme.colors.text}
              buttonColor={theme.colors.surface}
            >
              Continue with Google
            </Button>

            {/* Quick Test Login Button */}
            <TouchableOpacity
              onPress={async () => {
                setEmail('mobile@test.com');
                setPassword('test123');
                setLoading(true);
                try {
                  await login('mobile@test.com', 'test123');
                  router.replace('/(tabs)/explore');
                } catch (err: any) {
                  setError(err.message || 'Login failed');
                } finally {
                  setLoading(false);
                }
              }}
              style={styles.quickLoginButton}
              disabled={loading}
            >
              <Ionicons name="flash" size={20} color={theme.colors.accent} />
              <Text style={styles.quickLoginText}>Quick Test Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              style={styles.linkContainer}
            >
              <Text style={styles.linkText}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
          </Surface>
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
    ...theme.shadows.lg,
  },
  surface: {
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xxl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
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
    paddingVertical: theme.spacing.xs,
  },
  googleButton: {
    borderColor: theme.colors.border,
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.xs,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  linkContainer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  linkText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
