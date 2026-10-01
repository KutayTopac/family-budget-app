import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/shared/components/FormField';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { getErrorMessage } from '@/shared/lib/errors';
import { colors } from '@/shared/theme/colors';
import { authService } from '@/store/auth-store';

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError(null); setMessage(null);
    try {
      const result = await authService.signUp({ displayName, email, password });
      if (result.confirmationRequired) setMessage('E-posta adresinize gönderilen doğrulama bağlantısını açın.');
      else router.replace('/household');
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>YENİ BAŞLANGIÇ</Text><Text style={styles.title}>Hesabınızı oluşturun</Text>
            <Text style={styles.subtitle}>Sonraki ekranda ailenizi kurabilir veya eşinizin davetine katılabilirsiniz.</Text>
          </View>
          <View style={styles.form}>
            <FormField label="Adınız" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" autoComplete="name" />
            <FormField label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
            <FormField label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
            {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {message && <Text style={styles.success}>{message}</Text>}
            <PrimaryButton label="Hesap oluştur" loading={loading} onPress={() => void submit()} />
          </View>
          <Text style={styles.footer}>Zaten hesabınız var mı? <Link href="/sign-in" style={styles.link}>Giriş yapın</Link></Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 },
  heading: { gap: 8 }, eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }, title: { color: colors.text, fontSize: 31, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 23 }, form: { gap: 15 }, error: { color: colors.danger }, success: { color: colors.success, lineHeight: 20 },
  footer: { color: colors.textMuted, textAlign: 'center' }, link: { color: colors.accent, fontWeight: '800' },
});
