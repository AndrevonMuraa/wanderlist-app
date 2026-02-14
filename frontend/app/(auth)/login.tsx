import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Text, TextInput, Button, Surface, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import theme, { gradients } from '../../styles/theme';
import BrandedGlobeIcon from '../../components/BrandedGlobeIcon';
import OnboardingFlow, { shouldShowOnboarding } from '../../components/OnboardingFlow';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWebLoginInfo, setShowWebLoginInfo] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { login, loginWithApple, isAppleSignInAvailable } = useAuth();
  const router = useRouter();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const shouldShow = await shouldShowOnboarding();
    setShowOnboarding(shouldShow);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Show onboarding for first-time users
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

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
    // On web, show info modal instead of attempting OAuth (which will fail)
    if (Platform.OS === 'web') {
      setShowWebLoginInfo(true);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      await loginWithGoogle();
      // The OAuth flow will handle navigation after success
    } catch (err: any) {
      setError('Google login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await loginWithApple();
      router.replace('/(tabs)/explore');
    } catch (err: any) {
      if (err.message !== 'Apple Sign-In was cancelled') {
        // Show detailed error for debugging
        const errorMsg = err.message || 'Unknown error';
        setError(`Apple login: ${errorMsg}`);
      }
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
              <BrandedGlobeIcon size={90} showPin={true} showW={true} />
            </View>
            <Text style={styles.title}>Welcome to WanderMark</Text>
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

            {/* Apple Sign-In Button */}
            {Platform.OS === 'ios' && isAppleSignInAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={8}
                style={styles.appleButton}
                onPress={handleAppleLogin}
              />
            ) : Platform.OS !== 'ios' ? (
              <TouchableOpacity
                style={styles.appleButtonFallback}
                onPress={() => setError('Apple Sign-In is only available on iOS devices')}
              >
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <Text style={styles.appleButtonFallbackText}>Sign in with Apple</Text>
              </TouchableOpacity>
            ) : null}

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

            {/* Legal Links */}
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                <Text style={styles.legalText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalDivider}>•</Text>
              <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
                <Text style={styles.legalText}>Terms of Service</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Web Login Info Modal */}
      <Modal
        visible={showWebLoginInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWebLoginInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="phone-portrait-outline" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Use Mobile App</Text>
            <Text style={styles.modalMessage}>
              Google Sign-In is available in the mobile app for enhanced security.
            </Text>
            <Text style={styles.modalSubMessage}>
              Download the WanderMark app or use email login to continue on web.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalPrimaryButton}
                onPress={() => setShowWebLoginInfo(false)}
              >
                <Text style={styles.modalPrimaryButtonText}>Use Email Login</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalSecondaryButton}
                onPress={() => setShowWebLoginInfo(false)}
              >
                <Text style={styles.modalSecondaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  appleButton: {
    width: '100%',
    height: 48,
    marginTop: theme.spacing.md,
  },
  appleButtonFallback: {
    width: '100%',
    height: 48,
    marginTop: theme.spacing.md,
    backgroundColor: '#000',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appleButtonFallbackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accent + '15',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.accent + '40',
  },
  quickLoginText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.accent,
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
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  legalText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  legalDivider: {
    marginHorizontal: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  modalSubMessage: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 20,
  },
  modalButtons: {
    width: '100%',
    gap: theme.spacing.sm,
  },
  modalPrimaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSecondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});
