import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TransactionFormOptions, TransactionListItem } from '@/features/transactions/application/transaction-gateway';
import { createTransactionService } from '@/features/transactions/application/transaction-service';
import { supabaseTransactionGateway } from '@/features/transactions/infrastructure/supabase-transaction-gateway';
import { TransactionForm, type TransactionFormValue } from '@/features/transactions/presentation/TransactionForm';
import { getErrorMessage } from '@/shared/lib/errors';
import { colors } from '@/shared/theme/colors';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';

const transactionService = createTransactionService(supabaseTransactionGateway);
const emptyOptions: TransactionFormOptions = { accounts: [], categories: [], members: [] };

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const householdId = useAppStore((state) => state.activeHouseholdId);
  const session = useAuthStore((state) => state.session);
  const [options, setOptions] = useState(emptyOptions);
  const [transaction, setTransaction] = useState<TransactionListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId || !id) { router.replace('/household'); return; }
    void Promise.all([transactionService.getFormOptions(householdId), transactionService.getById(householdId, id)])
      .then(([formOptions, item]) => { setOptions(formOptions); setTransaction(item); })
      .catch((caught: unknown) => setError(getErrorMessage(caught))).finally(() => setLoading(false));
  }, [householdId, id]);

  async function updateTransaction(value: TransactionFormValue) {
    if (!householdId || !id) return;
    setSaving(true);
    try { await transactionService.update({ ...value, id, householdId }); router.replace('/household'); }
    finally { setSaving(false); }
  }

  if (loading) return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.accent} size="large" /></SafeAreaView>;
  const userId = session?.user.id;
  if (!userId || !transaction) return <SafeAreaView style={styles.loading}><Text style={styles.error}>{error ?? 'İşlem bulunamadı.'}</Text></SafeAreaView>;
  const displayName = session.user.user_metadata.display_name as string | undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}><Text onPress={() => router.back()} style={styles.back}>‹ Geri</Text><Text style={styles.title}>İşlemi düzenle</Text><View style={styles.headerSpacer} /></View>
          {error && <Text accessibilityRole="alert" style={styles.errorBox}>{error}</Text>}
          <TransactionForm options={options} currentUserId={userId} currentUserLabel={displayName ?? session.user.email ?? 'Oturumdaki kullanıcı'} initial={transaction} saving={saving} submitLabel="Değişiklikleri kaydet" onSubmit={updateTransaction} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 18 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  title: { color: colors.text, fontWeight: '800', fontSize: 24 }, headerSpacer: { width: 45 }, error: { color: colors.danger }, errorBox: { color: colors.danger, backgroundColor: '#FDECEC', borderRadius: 12, padding: 12 },
});
