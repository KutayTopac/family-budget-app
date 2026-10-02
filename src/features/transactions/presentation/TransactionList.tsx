import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { TransactionListItem } from '@/features/transactions/application/transaction-gateway';
import { colors } from '@/shared/theme/colors';

type Props = {
  items: TransactionListItem[];
  loading?: boolean;
  deletingId?: string | null;
  onEdit: (transaction: TransactionListItem) => void;
  onDelete: (transaction: TransactionListItem) => void;
  showActions?: boolean;
};

const iconMap: Record<string, string> = {
  payments: '💰', add_chart: '📈', shopping_cart: '🛒', receipt_long: '🧾', credit_score: '💳',
  directions_car: '🚗', health_and_safety: '🩺', more_horiz: '•••', home: '🏠', celebration: '🎉',
};

function formatMoney(amount: string, currency: string) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(amount));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function TransactionList({ items, loading = false, deletingId, onEdit, onDelete, showActions = true }: Props) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  if (loading) return <ActivityIndicator color={colors.accent} style={styles.loader} />;
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Henüz işlem yok</Text>
        <Text style={styles.emptyText}>İlk gelir veya giderinizi eklediğinizde burada görünecek.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={[styles.icon, { backgroundColor: item.categoryColor ?? colors.background }]}>
            <Text style={styles.iconText}>{iconMap[item.categoryIcon ?? ''] ?? '•'}</Text>
          </View>
          <View style={styles.body}>
            <View style={styles.topRow}>
              <View style={styles.titleGroup}>
                <Text style={styles.category}>{item.categoryName}</Text>
                <Text style={styles.description} numberOfLines={1}>{item.description || item.accountName}</Text>
              </View>
              <Text style={[styles.amount, item.type === 'income' ? styles.income : styles.expense]}>
                {item.type === 'income' ? '+' : '−'} {formatMoney(item.amount, item.currency)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{formatDate(item.occurredAt)} · {item.spentByName}</Text>
              {showActions && <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={() => onEdit(item)}><Text style={styles.edit}>Düzenle</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={deletingId === item.id} onPress={() => {
                  if (pendingDeleteId === item.id) { setPendingDeleteId(null); onDelete(item); }
                  else setPendingDeleteId(item.id);
                }}>
                  <Text style={styles.delete}>{deletingId === item.id ? 'Siliniyor…' : pendingDeleteId === item.id ? 'Emin misin?' : 'Sil'}</Text>
                </Pressable>
              </View>}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: 24 }, list: { gap: 10 },
  empty: { alignItems: 'center', borderRadius: 16, backgroundColor: colors.background, padding: 22, gap: 6 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, emptyText: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  card: { flexDirection: 'row', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14 },
  icon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, iconText: { fontSize: 20 },
  body: { flex: 1, gap: 10 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, titleGroup: { flex: 1, gap: 3 },
  category: { color: colors.text, fontWeight: '800', fontSize: 16 }, description: { color: colors.textMuted, fontSize: 13 },
  amount: { fontSize: 15, fontWeight: '900' }, income: { color: colors.success }, expense: { color: colors.danger },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, meta: { flex: 1, color: colors.textMuted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 14 }, edit: { color: colors.accent, fontWeight: '800', fontSize: 12 }, delete: { color: colors.danger, fontWeight: '800', fontSize: 12 },
});
