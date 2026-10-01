import { Redirect } from 'expo-router';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';

import { colors } from '@/shared/theme/colors';
import { useAuthStore } from '@/store/auth-store';

export default function HomeScreen() {
  const { session, isReady } = useAuthStore();
  if (isReady) return <Redirect href={session ? '/household' : '/sign-in'} />;
  return (
    <SafeAreaView style={styles.safeArea}>
      <ActivityIndicator color={colors.accent} size="large" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
