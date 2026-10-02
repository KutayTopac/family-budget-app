import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { TransactionFormOptions, TransactionListItem } from '@/features/transactions/application/transaction-gateway';
import type { TransactionType } from '@/features/transactions/domain/transaction';
import { ChoiceChips } from '@/shared/components/ChoiceChips';
import { FormField } from '@/shared/components/FormField';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { getErrorMessage } from '@/shared/lib/errors';
import { colors } from '@/shared/theme/colors';

const SHARED = '__shared__';

export type TransactionFormValue = {
  accountId: string; type: TransactionType; amount: string; currency: string; categoryId: string;
  description: string; occurredAt: string; spentBy: string | null;
};

type Props = {
  options: TransactionFormOptions; currentUserId: string; currentUserLabel: string;
  initial?: TransactionListItem; defaultType?: TransactionType; saving?: boolean; submitLabel?: string;
  onSubmit: (value: TransactionFormValue) => Promise<void>;
};

function localDateText(date = new Date()) {
  const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0');
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

export function TransactionForm({ options, currentUserId, currentUserLabel, initial, defaultType = 'expense', saving = false, submitLabel, onSubmit }: Props) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? defaultType);
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [accountId, setAccountId] = useState<string | null>(initial?.accountId ?? options.accounts[0]?.id ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [spender, setSpender] = useState(initial ? initial.spentBy ?? SHARED : currentUserId);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial ? localDateText(new Date(initial.occurredAt)) : localDateText());
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => options.categories.filter((category) => category.type === type), [options.categories, type]);
  const selectedAccount = options.accounts.find((account) => account.id === accountId);

  function selectType(nextType: TransactionType) { setType(nextType); setCategoryId(null); if (nextType === 'expense' && !spender) setSpender(currentUserId); }

  async function submit() {
    if (!accountId || !categoryId) { setError('Hesap ve kategori seçin.'); return; }
    setError(null);
    try {
      await onSubmit({ accountId, type, amount, currency: selectedAccount?.currency ?? 'TRY', categoryId, description, occurredAt: dateTextToIso(date), spentBy: type === 'expense' && spender !== SHARED ? spender : null });
    } catch (caught) { setError(getErrorMessage(caught)); }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.label}>İşlem türü</Text>
      <ChoiceChips choices={[{ value: 'expense', label: 'Gider' }, { value: 'income', label: 'Gelir' }]} value={type} onChange={selectType} />
      <FormField label="Tutar" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />
      <Text style={styles.label}>Hesap</Text>
      <ChoiceChips choices={options.accounts.map((account) => ({ value: account.id, label: `${account.name} · ${account.currency}` }))} value={accountId} onChange={setAccountId} />
      <Text style={styles.label}>Kategori</Text>
      <ChoiceChips choices={categories.map((category) => ({ value: category.id, label: category.name }))} value={categoryId} onChange={setCategoryId} />
      {type === 'expense' && <><Text style={styles.label}>Harcamayı yapan</Text><ChoiceChips choices={[{ value: SHARED, label: 'Ortak' }, ...options.members.map((member) => ({ value: member.id, label: member.name }))]} value={spender} onChange={setSpender} /></>}
      <FormField label="Açıklama" value={description} onChangeText={setDescription} placeholder="İsteğe bağlı" multiline />
      <FormField label="Tarih" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" placeholder="YYYY-AA-GG" />
      <View style={styles.actor}><Text style={styles.actorLabel}>Ekleyen kişi</Text><Text style={styles.actorValue}>{currentUserLabel}</Text></View>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {options.accounts.length === 0 && <Text style={styles.error}>Aktif hesap bulunamadı.</Text>}
      <PrimaryButton label={submitLabel ?? (type === 'expense' ? 'Harcamayı kaydet' : 'Geliri kaydet')} loading={saving} disabled={options.accounts.length === 0} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18 }, label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  actor: { borderRadius: 14, backgroundColor: colors.background, padding: 14, gap: 4 }, actorLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, actorValue: { color: colors.text, fontWeight: '800' }, error: { color: colors.danger, lineHeight: 20 },
});
