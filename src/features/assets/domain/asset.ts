import { z } from 'zod';
import { moneySchema } from '@/features/transactions/domain/transaction';

export const assetDraftSchema = z.object({
  householdId: z.uuid(), name: z.string().trim().min(1).max(80), type: z.enum(['cash', 'checking', 'savings']),
  balance: moneySchema, currency: z.string().trim().toUpperCase().length(3),
});
export const assetUpdateSchema = assetDraftSchema.extend({ id: z.uuid() });
export type AssetDraft = z.infer<typeof assetDraftSchema>;
export type AssetUpdate = z.infer<typeof assetUpdateSchema>;
export type AssetType = AssetDraft['type'];
