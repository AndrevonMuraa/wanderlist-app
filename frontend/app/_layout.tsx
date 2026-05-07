import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { OfflineProvider } from '../contexts/OfflineContext';
import { PurchaseProvider } from '../contexts/PurchaseContext';
import { UnreadCountsProvider } from '../contexts/UnreadCountsContext';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import PushTapRouter from '../components/PushTapRouter';
import ToastHost from '../components/ToastHost';
import CommandPalette from '../components/CommandPalette';
import { initSentry } from '../utils/sentry';
import '../i18n'; // Initialize i18n

// Suppress known SDK 54 deprecation warnings that are cosmetic-only on native
// (shadow*, textShadow*, pointerEvents prop still function). Migrating every
// component to the new APIs is tracked in the backlog for SDK 56.
LogBox.ignoreLogs([
  /"shadow\*" style props are deprecated/i,
  /"textShadow\*" style props are deprecated/i,
  /props\.pointerEvents is deprecated/i,
  /\[expo-notifications\] Listening to push token changes is not yet fully supported on web/i,
]);

// Strip all console.log/warn/info in production builds to prevent PII/data
// leakage. console.error continues to Sentry for real issues.
// eslint-disable-next-line no-undef
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Initialise Sentry as early as possible (safe no-op if DSN missing).
initSentry();

const paperTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#20B2AA',
    secondary: '#4DB8D8',
  },
};

function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <PaperProvider theme={paperTheme}>
            <AuthProvider>
              <OfflineProvider>
                <PurchaseProvider>
                  <UnreadCountsProvider>
                    <PushTapRouter />
                    <ToastHost />
                    <CommandPalette />
                    <Stack screenOptions={{ headerShown: false }} />
                  </UnreadCountsProvider>
                </PurchaseProvider>
              </OfflineProvider>
            </AuthProvider>
          </PaperProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// Sentry.wrap() enables native error capture + touch-event breadcrumbs.
export default Sentry.wrap(RootLayout);
