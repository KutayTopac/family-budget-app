import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/shared/components/FormField';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { getErrorMessage } from '@/shared/lib/errors';
import { colors } from '@/shared/theme/colors';
import { authService } from '@/store/auth-store';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError(null);
    try {
      await authService.signIn({ email, password });
      router.replace('/dashboard');
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>ORTAK BÜTÇENİZ</Text>
            <Text style={styles.title}>Tekrar hoş geldiniz</Text>
            <Text style={styles.subtitle}>Ailenizin finansal görünümüne güvenle erişin.</Text>
          </View>
          <View style={styles.form}>
            <FormField label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
            <FormField label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
            {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <PrimaryButton label="Giriş yap" loading={loading} onPress={() => void submit()} />
          </View>
          <Text style={styles.footer}>Hesabınız yok mu? <Link href="/sign-up" style={styles.link}>Kayıt olun</Link></Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 28 },
  heading: { gap: 8 }, eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800' }, subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 23 },
  form: { gap: 16 }, error: { color: colors.danger, lineHeight: 20 },
  footer: { color: colors.textMuted, textAlign: 'center' }, link: { color: colors.accent, fontWeight: '800' },
});
