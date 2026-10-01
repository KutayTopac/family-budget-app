import { supabase } from '@/core/supabase/client';
import type { MemberOption, TransactionGateway } from '@/features/transactions/application/transaction-gateway';

export const supabaseTransactionGateway: TransactionGateway = {
  async getFormOptions(householdId) {
    const [accountsResult, categoriesResult, membersResult] = await Promise.all([
      supabase.from('accounts').select('id, name, currency').eq('household_id', householdId).eq('is_archived', false).order('name'),
      supabase.from('categories').select('id, name, type').eq('household_id', householdId).eq('is_active', true).order('name'),
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
};
