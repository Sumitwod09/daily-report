import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from '../src/db/database';
import { FirmQ } from '../src/db/queries';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      getDb(); // initialize DB
    } catch (e) {
      console.error('DB init error:', e);
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="pdf-preview"
          options={{ presentation: 'fullScreenModal', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/add-transaction"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/party-ledger"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/karigar"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/stock"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="(modals)/settings"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
