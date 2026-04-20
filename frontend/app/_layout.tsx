import { Stack } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { OfflineProvider } from '../contexts/OfflineContext';
import { PurchaseProvider } from '../contexts/PurchaseContext';
import { UnreadCountsProvider } from '../contexts/UnreadCountsContext';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initSentry } from '../utils/sentry';
import '../i18n'; // Initialize i18n

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
