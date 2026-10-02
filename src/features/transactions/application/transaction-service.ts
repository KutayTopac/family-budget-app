import type { TransactionGateway } from '@/features/transactions/application/transaction-gateway';
import { transactionDraftSchema, transactionQuerySchema, transactionUpdateSchema, type TransactionDraft, type TransactionUpdate } from '@/features/transactions/domain/transaction';

export const createTransactionService = (gateway: TransactionGateway) => {
  const addTransaction = (draft: TransactionDraft) => gateway.create(transactionDraftSchema.parse(draft));
  const getTransactions = (householdId: string, limit = 25) => {
    const query = transactionQuerySchema.parse({ householdId, limit });
    return gateway.list(query.householdId, query.limit);
  };
  const updateTransaction = (draft: TransactionUpdate) => gateway.update(transactionUpdateSchema.parse(draft));
  const deleteTransaction = (householdId: string, transactionId: string) => gateway.remove(
    transactionQuerySchema.shape.householdId.parse(householdId),
    transactionQuerySchema.shape.householdId.parse(transactionId),
  );

  return {
  getFormOptions: (householdId: string) => gateway.getFormOptions(householdId),
  addTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  create: addTransaction,
  list: getTransactions,
  getById: (householdId: string, transactionId: string) => gateway.getById(
    transactionQuerySchema.shape.householdId.parse(householdId),
    transactionQuerySchema.shape.householdId.parse(transactionId),
  ),
  update: updateTransaction,
  remove: deleteTransaction,
  };
};
