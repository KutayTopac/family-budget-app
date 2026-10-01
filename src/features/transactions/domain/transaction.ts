import { z } from 'zod';

export const moneySchema = z.string().trim().regex(/^\d{1,16}([.,]\d{1,4})?$/, 'Geçerli bir tutar girin.');

export const transactionDraftSchema = z.object({
  householdId: z.uuid(),
  accountId: z.uuid(),
  type: z.enum(['income', 'expense']),
  amount: moneySchema.transform((amount) => amount.replace(',', '.')),
  currency: z.string().trim().toUpperCase().length(3),
  categoryId: z.uuid(),
  description: z.string().trim().max(500, 'Açıklama en fazla 500 karakter olabilir.'),
  occurredAt: z.iso.datetime(),
  spentBy: z.uuid().nullable(),
  requestId: z.uuid(),
});

export type TransactionDraft = z.infer<typeof transactionDraftSchema>;
export type TransactionType = TransactionDraft['type'];
