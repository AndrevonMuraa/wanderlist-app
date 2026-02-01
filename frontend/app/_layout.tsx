import { Slot } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { OfflineProvider } from '../contexts/OfflineContext';
import { PurchaseProvider } from '../contexts/PurchaseContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../i18n'; // Initialize i18n

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PaperProvider>
          <AuthProvider>
            <OfflineProvider>
              <PurchaseProvider>
                <Slot />
              </PurchaseProvider>
            </OfflineProvider>
          </AuthProvider>
        </PaperProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
