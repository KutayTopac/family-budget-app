import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TransactionFormOptions } from '@/features/transactions/application/transaction-gateway';
import { createTransactionService } from '@/features/transactions/application/transaction-service';
import { supabaseTransactionGateway } from '@/features/transactions/infrastructure/supabase-transaction-gateway';
import type { TransactionType } from '@/features/transactions/domain/transaction';
import { ChoiceChips } from '@/shared/components/ChoiceChips';
import { FormField } from '@/shared/components/FormField';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { getErrorMessage } from '@/shared/lib/errors';
import { colors } from '@/shared/theme/colors';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';

const transactionService = createTransactionService(supabaseTransactionGateway);
const emptyOptions: TransactionFormOptions = { accounts: [], categories: [], members: [] };

function localDateText(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateTextToIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Tarihi YYYY-AA-GG biçiminde girin.');
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error('Geçerli bir tarih girin.');
  return date.toISOString();
}

export default function NewTransactionScreen() {
  const householdId = useAppStore((state) => state.activeHouseholdId);
  const session = useAuthStore((state) => state.session);
  const [options, setOptions] = useState(emptyOptions);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [spentBy, setSpentBy] = useState<string | null>(session?.user.id ?? null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(localDateText());
  const [requestId, setRequestId] = useState(() => Crypto.randomUUID());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) { router.replace('/household'); return; }
    const timer = setTimeout(() => {
      void transactionService.getFormOptions(householdId).then((result) => {
        setOptions(result);
        setAccountId(result.accounts[0]?.id ?? null);
      }).catch((caught: unknown) => setError(getErrorMessage(caught))).finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [householdId]);

  const categories = useMemo(() => options.categories.filter((category) => category.type === type), [options.categories, type]);
  const selectedAccount = options.accounts.find((account) => account.id === accountId);
  const addedBy = session?.user.user_metadata.display_name as string | undefined;

  function selectType(nextType: TransactionType) {
    setType(nextType); setCategoryId(null);
    if (nextType === 'income') setSpentBy(null);
    else setSpentBy((current) => current ?? session?.user.id ?? null);
  }

  async function submit() {
    if (!householdId || !accountId || !categoryId) { setError('Hesap ve kategori seçin.'); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      await transactionService.create({
        householdId, accountId, type, amount, currency: selectedAccount?.currency ?? 'TRY', categoryId,
        description, occurredAt: dateTextToIso(date), spentBy: type === 'expense' ? spentBy : null, requestId,
      });
      setSuccess(type === 'expense' ? 'Harcama kaydedildi.' : 'Gelir kaydedildi.');
      setAmount(''); setDescription(''); setRequestId(Crypto.randomUUID());
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setSaving(false); }
  }

  if (loading) return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.accent} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}><Text onPress={() => router.back()} style={styles.back}>‹ Geri</Text><Text style={styles.title}>Yeni işlem</Text><View style={styles.headerSpacer} /></View>
          <View style={styles.section}>
            <Text style={styles.label}>İşlem türü</Text>
            <ChoiceChips choices={[{ value: 'expense', label: 'Gider' }, { value: 'income', label: 'Gelir' }]} value={type} onChange={selectType} />
            <FormField label="Tutar" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />
            <Text style={styles.label}>Hesap</Text>
            <ChoiceChips choices={options.accounts.map((account) => ({ value: account.id, label: `${account.name} · ${account.currency}` }))} value={accountId} onChange={setAccountId} />
            <Text style={styles.label}>Kategori</Text>
            <ChoiceChips choices={categories.map((category) => ({ value: category.id, label: category.name }))} value={categoryId} onChange={setCategoryId} />
            {type === 'expense' && <><Text style={styles.label}>Harcamayı yapan</Text><ChoiceChips choices={options.members.map((member) => ({ value: member.id, label: member.name }))} value={spentBy} onChange={setSpentBy} /></>}
            <FormField label="Açıklama" value={description} onChangeText={setDescription} placeholder="İsteğe bağlı" multiline />
            <FormField label="Tarih" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" placeholder="YYYY-AA-GG" />
            <View style={styles.actor}><Text style={styles.actorLabel}>Ekleyen kişi</Text><Text style={styles.actorValue}>{addedBy ?? session?.user.email ?? 'Oturumdaki kullanıcı'}</Text></View>
            {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {success && <Text accessibilityRole="alert" style={styles.success}>{success}</Text>}
            {options.accounts.length === 0 && <Text style={styles.error}>Aktif hesap bulunamadı.</Text>}
            <PrimaryButton label={type === 'expense' ? 'Harcamayı kaydet' : 'Geliri kaydet'} loading={saving} disabled={options.accounts.length === 0} onPress={() => void submit()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 18 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  title: { color: colors.text, fontWeight: '800', fontSize: 24 }, headerSpacer: { width: 45 }, section: { gap: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' }, actor: { borderRadius: 14, backgroundColor: colors.background, padding: 14, gap: 4 }, actorLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, actorValue: { color: colors.text, fontWeight: '800' },
  error: { color: colors.danger, lineHeight: 20 }, success: { color: colors.success, backgroundColor: '#EAF7F1', padding: 12, borderRadius: 12, fontWeight: '700' },
});
