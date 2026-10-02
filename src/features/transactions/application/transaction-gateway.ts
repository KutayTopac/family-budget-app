import type { TransactionDraft, TransactionType, TransactionUpdate } from '@/features/transactions/domain/transaction';

export type AccountOption = { id: string; name: string; currency: string };
export type CategoryOption = { id: string; name: string; type: TransactionType; icon: string | null; color: string | null };
export type MemberOption = { id: string; name: string };
export type TransactionFormOptions = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
};

export type TransactionListItem = {
  id: string;
  householdId: string;
  accountId: string;
  accountName: string;
  type: TransactionType;
  amount: string;
  currency: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  description: string;
  occurredAt: string;
  addedBy: string;
  addedByName: string;
  spentBy: string | null;
  spentByName: string;
};

export interface TransactionGateway {
  getFormOptions(householdId: string): Promise<TransactionFormOptions>;
  create(draft: TransactionDraft): Promise<string>;
  list(householdId: string, limit?: number): Promise<TransactionListItem[]>;
  getById(householdId: string, transactionId: string): Promise<TransactionListItem>;
  update(draft: TransactionUpdate): Promise<string>;
  remove(householdId: string, transactionId: string): Promise<string>;
}
