import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Surface, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import theme from '../../styles/theme';
import BrandedGlobeIcon from '../../components/BrandedGlobeIcon';
import OnboardingFlow, { shouldShowOnboarding } from '../../components/OnboardingFlow';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicCode, setMagicCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loginMode, setLoginMode] = useState<'main' | 'password' | 'magic'>('main');
  const [magicCodeSent, setMagicCodeSent] = useState(false);
  const { login, sendMagicCode, verifyMagicCode, loginWithApple, isAppleSignInAvailable } = useAuth();
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

  const handleSendMagicCode = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendMagicCode(email);
      setMagicCodeSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMagicCode = async () => {
    if (!magicCode || magicCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyMagicCode(email, magicCode);
      router.replace('/(tabs)/explore');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
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
        setError(`Apple login: ${err.message || 'Unknown error'}`);
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
            {/* Main login screen */}
            {loginMode === 'main' && (
              <>
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
                  data-testid="login-email-input"
                />

                {/* Magic Link Button - Primary action */}
                <Button
                  mode="contained"
                  onPress={() => {
                    if (!email) {
                      setError('Please enter your email');
                      return;
                    }
                    setLoginMode('magic');
                    handleSendMagicCode();
                  }}
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                  buttonColor={theme.colors.primary}
                  textColor="#fff"
                  icon="email-fast-outline"
                  data-testid="magic-link-button"
                >
                  Send Login Code
                </Button>

                <TouchableOpacity
                  onPress={() => setLoginMode('password')}
                  style={styles.linkContainer}
                  data-testid="use-password-link"
                >
                  <Text style={styles.linkText}>Use password instead</Text>
                </TouchableOpacity>

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

                <TouchableOpacity
                  onPress={() => router.push('/(auth)/register')}
                  style={styles.linkContainer}
                >
                  <Text style={styles.linkText}>Don't have an account? Sign up</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Password login */}
            {loginMode === 'password' && (
              <>
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

                <TouchableOpacity
                  onPress={() => { setLoginMode('main'); setError(''); }}
                  style={styles.linkContainer}
                >
                  <Text style={styles.linkText}>Back to login options</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Magic code verification */}
            {loginMode === 'magic' && (
              <>
                {!magicCodeSent ? (
                  <View style={styles.magicLoadingContainer}>
                    <Text style={styles.magicSubtitle}>Sending code to {email}...</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.magicHeader}>
                      <Ionicons name="mail-outline" size={40} color={theme.colors.primary} />
                      <Text style={styles.magicTitle}>Check your email</Text>
                      <Text style={styles.magicSubtitle}>We sent a 6-digit code to{'\n'}{email}</Text>
                    </View>

                    <TextInput
                      label="Enter 6-digit code"
                      value={magicCode}
                      onChangeText={(text) => setMagicCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                      mode="outlined"
                      keyboardType="number-pad"
                      style={[styles.input, styles.codeInput]}
                      outlineColor={theme.colors.border}
                      activeOutlineColor={theme.colors.primary}
                      textColor={theme.colors.text}
                      maxLength={6}
                      data-testid="magic-code-input"
                    />

                    <Button
                      mode="contained"
                      onPress={handleVerifyMagicCode}
                      loading={loading}
                      disabled={loading || magicCode.length !== 6}
                      style={styles.button}
                      buttonColor={theme.colors.primary}
                      textColor="#fff"
                      data-testid="verify-code-button"
                    >
                      Verify & Login
                    </Button>

                    <TouchableOpacity
                      onPress={handleSendMagicCode}
                      style={styles.linkContainer}
                      disabled={loading}
                    >
                      <Text style={styles.linkText}>Resend code</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  onPress={() => { setLoginMode('main'); setMagicCodeSent(false); setMagicCode(''); setError(''); }}
                  style={styles.linkContainer}
                >
                  <Text style={styles.linkText}>Back to login options</Text>
                </TouchableOpacity>
              </>
            )}

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
    paddingVertical: theme.spacing.xs,
  },
  magicHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  magicTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  magicSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  magicLoadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  codeInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
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
