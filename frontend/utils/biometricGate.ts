/**
 * BiometricGate — runs a callback only after Face ID / Touch ID approval.
 *
 * Used as a soft replacement for TOTP prompts on destructive admin actions
 * (e2e-wipe, lockdown toggle, tier-change, etc.). Falls through silently on
 * web and on devices without biometric hardware enrolled — those callers
 * should fall back to TOTP via the existing flow.
 *
 * Usage:
 *   const guard = useBiometricGate();
 *   <TouchableOpacity onPress={() => guard('Confirm wipe', doWipe)}>
 */
import { Alert, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

type GuardFn = (reason: string, onSuccess: () => void | Promise<void>) => Promise<void>;

export const useBiometricGate = (): GuardFn => {
  return async (reason, onSuccess) => {
    if (Platform.OS === 'web') {
      // Web: no biometrics — caller is expected to confirm with window.confirm()
      // before invoking us. We just run.
      await onSuccess();
      return;
    }
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHw || !enrolled) {
        // Graceful degradation: no Face ID enrolled → just run (Alert
        // confirmation in the caller is sufficient).
        await onSuccess();
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (res.success) {
        await onSuccess();
      } else if (res.error !== 'user_cancel' && res.error !== 'app_cancel') {
        Alert.alert('Authentication failed', 'Could not verify biometrics. Try again.');
      }
    } catch (e: any) {
      Alert.alert('Biometric error', e?.message ?? 'Unknown error');
    }
  };
};

export default useBiometricGate;
