import { z } from 'zod';
import { moneySchema } from '@/features/transactions/domain/transaction';
const quantitySchema = z.string().trim().regex(/^\d{1,18}([.,]\d{1,10})?$/, 'Geçerli bir miktar girin.').transform((value) => value.replace(',', '.'));
export const investmentDraftSchema = z.object({
  householdId: z.uuid(), assetClass: z.enum(['gold', 'fx', 'stock', 'fund', 'crypto']), symbol: z.string().trim().min(1).max(30).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1).max(120), quantity: quantitySchema, unitCost: moneySchema, currentPrice: moneySchema,
  currency: z.string().trim().toUpperCase().length(3), tradedAt: z.iso.datetime(),
});
export const investmentPriceSchema = z.object({ householdId: z.uuid(), id: z.uuid(), currentPrice: moneySchema });
export type InvestmentDraft = z.infer<typeof investmentDraftSchema>;
export type InvestmentPriceUpdate = z.infer<typeof investmentPriceSchema>;
export type InvestmentClass = InvestmentDraft['assetClass'];
