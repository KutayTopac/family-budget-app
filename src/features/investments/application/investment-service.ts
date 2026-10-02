import type { InvestmentGateway } from '@/features/investments/application/investment-gateway';
import { investmentDraftSchema, investmentPriceSchema, type InvestmentDraft, type InvestmentPriceUpdate } from '@/features/investments/domain/investment';
import { z } from 'zod';
const uuid = z.uuid();
export const createInvestmentService = (gateway: InvestmentGateway) => ({
  getInvestments: (householdId: string) => gateway.list(uuid.parse(householdId)), getInvestment: (householdId: string, id: string) => gateway.getById(uuid.parse(householdId), uuid.parse(id)),
  addInvestment: (draft: InvestmentDraft) => gateway.create(investmentDraftSchema.parse(draft)), updateCurrentPrice: (draft: InvestmentPriceUpdate) => gateway.updatePrice(investmentPriceSchema.parse(draft)),
});
