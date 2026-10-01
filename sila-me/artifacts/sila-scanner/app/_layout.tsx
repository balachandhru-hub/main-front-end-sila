import React, { useEffect } from 'react';
import { View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppStateProvider } from '@/context/AppStateContext';
import { ConnectivityProvider } from '@/context/ConnectivityContext';
import { testBackendConnectivity } from '@/services/api';
import { getSessionToken } from '@/services/auth';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { initializeLocalDatabase, verifyLocalDatabaseFoundation } from '@/data/local/database';
import { OfflineBanner } from '@/components/OfflineBanner';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const configuredApiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : null)
)?.replace(/\/api\/?$/, '') ?? null;
setBaseUrl(configuredApiBaseUrl);
setAuthTokenGetter(getSessionToken);

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false, headerBackTitle: 'Back' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="receive" />
        <Stack.Screen name="inventory" />
        <Stack.Screen name="approvals" />
        <Stack.Screen name="more" />
        <Stack.Screen name="sync-status" />
        <Stack.Screen name="transfer" />
        <Stack.Screen name="goods-issue" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="review" />
        <Stack.Screen name="invoice-candidates" />
        <Stack.Screen name="invoice-comparison" />
        <Stack.Screen name="service-invoice" />
        <Stack.Screen name="invoice-type-review" />
        <Stack.Screen name="po-select" />
        <Stack.Screen name="po-detail" />
        <Stack.Screen name="grn-review" />
        <Stack.Screen name="grn-confirm" />
        <Stack.Screen name="grn-success" />
        <Stack.Screen name="grn-pending" />
        <Stack.Screen name="success" />
        <Stack.Screen name="pending" />
        <Stack.Screen name="history" />
        <Stack.Screen name="invoice-detail" />
        <Stack.Screen name="settings" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (__DEV__) {
      void testBackendConnectivity();
    }
  }, []);

  useEffect(() => {
    void initializeLocalDatabase()
      .then((initialized) => {
        if (!initialized || !__DEV__) return;
        return verifyLocalDatabaseFoundation().then((result) => {
          console.info('[SILA Store Local DB] Foundation ready', {
            schemaVersion: result.schemaVersion,
            tableCount: result.tables.length,
          });
        });
      })
      .catch((error) => {
        console.warn('[SILA Store Local DB] Initialization failed', error);
      });
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ConnectivityProvider>
            <AppStateProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AppStateProvider>
          </ConnectivityProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
