import type { TransactionDraft, TransactionType } from '@/features/transactions/domain/transaction';

export type AccountOption = { id: string; name: string; currency: string };
export type CategoryOption = { id: string; name: string; type: TransactionType };
export type MemberOption = { id: string; name: string };
export type TransactionFormOptions = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
};

export interface TransactionGateway {
  getFormOptions(householdId: string): Promise<TransactionFormOptions>;
  create(draft: TransactionDraft): Promise<string>;
}
