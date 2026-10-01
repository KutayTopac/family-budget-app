import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { initializeAuth } from '@/store/auth-store';

export default function RootLayout() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void initializeAuth().then((cleanup) => { unsubscribe = cleanup; });
    return () => unsubscribe?.();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}
