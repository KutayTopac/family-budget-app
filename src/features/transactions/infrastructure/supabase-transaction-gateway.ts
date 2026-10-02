import { supabase } from '@/core/supabase/client';
import type { MemberOption, TransactionGateway, TransactionListItem } from '@/features/transactions/application/transaction-gateway';

async function hydrateTransactions(householdId: string, transactionId?: string, limit = 25) {
  let query = supabase
    .from('transactions')
    .select('id, household_id, account_id, type, amount, currency, category_id, description, occurred_at, added_by, spent_by')
    .eq('household_id', householdId)
    .eq('status', 'posted')
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (transactionId) query = query.eq('id', transactionId);

  const { data: transactions, error } = await query;
  if (error) throw error;
  if (transactions.length === 0) return [];

  const accountIds = [...new Set(transactions.map((item) => item.account_id))];
  const categoryIds = [...new Set(transactions.flatMap((item) => item.category_id ? [item.category_id] : []))];
  const profileIds = [...new Set(transactions.flatMap((item) => [item.added_by, ...(item.spent_by ? [item.spent_by] : [])]))];
  const [accountsResult, categoriesResult, profilesResult] = await Promise.all([
    supabase.from('accounts').select('id, name').eq('household_id', householdId).in('id', accountIds),
    supabase.from('categories').select('id, name, icon, color').eq('household_id', householdId).in('id', categoryIds),
    supabase.from('profiles').select('id, display_name').in('id', profileIds),
  ]);
  if (accountsResult.error) throw accountsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const accounts = new Map(accountsResult.data.map((item) => [item.id, item.name]));
  const categories = new Map(categoriesResult.data.map((item) => [item.id, item]));
  const profiles = new Map(profilesResult.data.map((item) => [item.id, item.display_name ?? 'Aile üyesi']));

  return transactions.map<TransactionListItem>((item) => {
    const category = item.category_id ? categories.get(item.category_id) : undefined;
    return {
      id: item.id,
      householdId: item.household_id,
      accountId: item.account_id,
      accountName: accounts.get(item.account_id) ?? 'Hesap',
      type: item.type as 'income' | 'expense',
      amount: String(item.amount),
      currency: item.currency,
      categoryId: item.category_id ?? '',
      categoryName: category?.name ?? 'Kategorisiz',
      categoryIcon: category?.icon ?? null,
      categoryColor: category?.color ?? null,
      description: item.description ?? '',
      occurredAt: item.occurred_at,
      addedBy: item.added_by,
      addedByName: profiles.get(item.added_by) ?? 'Aile üyesi',
      spentBy: item.spent_by,
      spentByName: item.spent_by ? profiles.get(item.spent_by) ?? 'Aile üyesi' : 'Ortak',
    };
  });
}

export const supabaseTransactionGateway: TransactionGateway = {
  async getFormOptions(householdId) {
    const [accountsResult, categoriesResult, membersResult] = await Promise.all([
      supabase.from('accounts').select('id, name, currency').eq('household_id', householdId).eq('is_archived', false).order('name'),
      supabase.from('categories').select('id, name, type, icon, color').eq('household_id', householdId).eq('is_active', true).order('name'),
      supabase.from('household_members').select('user_id').eq('household_id', householdId).eq('status', 'active'),
    ]);
    if (accountsResult.error) throw accountsResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    if (membersResult.error) throw membersResult.error;

    const memberIds = membersResult.data.map((member) => member.user_id);
    let members: MemberOption[] = [];
    if (memberIds.length > 0) {
      const { data, error } = await supabase.from('profiles').select('id, display_name').in('id', memberIds);
      if (error) throw error;
      members = data.map((profile) => ({ id: profile.id, name: profile.display_name ?? 'Aile üyesi' }));
    }

    return {
      accounts: accountsResult.data,
      categories: categoriesResult.data,
      members,
    };
  },
  async create(draft) {
    const { data, error } = await supabase.rpc('create_financial_transaction', {
      target_household_id: draft.householdId,
      target_account_id: draft.accountId,
      transaction_type: draft.type,
      transaction_amount: draft.amount,
      transaction_currency: draft.currency,
      target_category_id: draft.categoryId,
      transaction_description: draft.description,
      transaction_occurred_at: draft.occurredAt,
      transaction_spent_by: draft.spentBy,
      request_id: draft.requestId,
    });
    if (error) throw error;
    return data;
  },
  async list(householdId, limit = 25) {
    return hydrateTransactions(householdId, undefined, limit);
  },
  async getById(householdId, transactionId) {
    const [transaction] = await hydrateTransactions(householdId, transactionId, 1);
    if (!transaction) throw new Error('İşlem bulunamadı.');
    return transaction;
  },
  async update(draft) {
    const { data, error } = await supabase.rpc('update_financial_transaction', {
      target_transaction_id: draft.id,
      target_household_id: draft.householdId,
      target_account_id: draft.accountId,
      transaction_type: draft.type,
      transaction_amount: draft.amount,
      transaction_currency: draft.currency,
      target_category_id: draft.categoryId,
      transaction_description: draft.description,
      transaction_occurred_at: draft.occurredAt,
      transaction_spent_by: draft.type === 'expense' ? draft.spentBy : null,
    });
    if (error) throw error;
    return data;
  },
  async remove(householdId, transactionId) {
    const { data, error } = await supabase.rpc('delete_financial_transaction', {
      target_transaction_id: transactionId,
      target_household_id: householdId,
    });
    if (error) throw error;
    return data;
  },
};
