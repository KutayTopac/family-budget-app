import type { TransactionGateway } from '@/features/transactions/application/transaction-gateway';
import { transactionDraftSchema, type TransactionDraft } from '@/features/transactions/domain/transaction';

export const createTransactionService = (gateway: TransactionGateway) => ({
  getFormOptions: (householdId: string) => gateway.getFormOptions(householdId),
  create: (draft: TransactionDraft) => gateway.create(transactionDraftSchema.parse(draft)),
});
