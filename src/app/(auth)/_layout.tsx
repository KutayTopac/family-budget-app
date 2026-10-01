import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';

export default function AuthLayout() {
  const { session, isReady } = useAuthStore();
  if (isReady && session) return <Redirect href="/household" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
